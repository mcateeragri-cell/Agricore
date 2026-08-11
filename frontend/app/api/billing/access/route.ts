import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const dynamic = "force-dynamic";

function canManageBilling(user: {
  permissions: string[];
  role: string;
}) {
  return (
    user.permissions.includes("settings.manage") ||
    user.role === "company_admin" ||
    user.role === "administrator"
  );
}

export async function GET() {
  const user = await getAuthenticatedUserContext();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 },
    );
  }

  const admin = createSupabaseAdmin();

  // RC-1.1 billing modes are the source of truth.
  // Internal operating companies and demo workspaces never require a Stripe subscription.
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("billing_mode, slug")
    .eq("id", user.companyId)
    .maybeSingle();

  if (companyError) {
    return NextResponse.json(
      { error: companyError.message },
      { status: 500 },
    );
  }

  const billingMode = String(company?.billing_mode ?? "subscription").toLowerCase();
  const companySlug = String(company?.slug ?? user.companySlug ?? "");

  if (billingMode === "internal") {
    return NextResponse.json({
      access: "full",
      reason: "internal",
      status: "internal",
      canManageBilling: canManageBilling(user),
    });
  }

  if (billingMode === "demo" || companySlug.startsWith("demo-")) {
    return NextResponse.json({
      access: "full",
      reason: "demo",
      status: "demo",
      canManageBilling: canManageBilling(user),
    });
  }

  const { data, error } = await admin
    .from("company_subscriptions")
    .select("status, trial_ends_at, grace_ends_at, cancel_at_period_end")
    .eq("company_id", user.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({
      access: "blocked",
      reason: "missing_subscription",
      canManageBilling: canManageBilling(user),
    });
  }

  const now = Date.now();

  const trialEnded =
    data.status === "trial" &&
    Boolean(data.trial_ends_at) &&
    new Date(data.trial_ends_at).getTime() < now;

  const graceEnded =
    data.status === "suspended" &&
    Boolean(data.grace_ends_at) &&
    new Date(data.grace_ends_at).getTime() < now;

  const blocked =
    data.status === "expired" ||
    data.status === "cancelled" ||
    Boolean(trialEnded) ||
    Boolean(graceEnded);

  return NextResponse.json({
    access: blocked ? "blocked" : "full",
    reason: trialEnded
      ? "trial_expired"
      : graceEnded
        ? "payment_grace_expired"
        : data.status,
    status: data.status,
    trialEndsAt: data.trial_ends_at,
    graceEndsAt: data.grace_ends_at,
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    canManageBilling: canManageBilling(user),
  });
}
