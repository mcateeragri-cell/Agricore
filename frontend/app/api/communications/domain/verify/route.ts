import { requireApiModule } from "@/lib/modules/api-access";
import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import {
  getResendDomain,
  verifyResendDomain,
} from "@/lib/communications/resend-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const moduleGate = await requireApiModule("communications");
  if (moduleGate) return moduleGate;

  try {
    const user = await requirePermission(["settings.manage"]);
    const admin = createSupabaseAdmin();

    const { data: settings, error } = await admin
      .from("company_email_settings")
      .select("resend_domain_id")
      .eq("company_id", user.companyId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!settings?.resend_domain_id) {
      return NextResponse.json(
        { error: "Add your company domain before verifying it." },
        { status: 400 },
      );
    }

    await verifyResendDomain(settings.resend_domain_id);

    // Verification is asynchronous. Fetch the current state immediately so
    // the user sees pending/verified as soon as Resend reports it.
    const domain = await getResendDomain(settings.resend_domain_id);
    const verified = domain.status === "verified";

    const { data: updated, error: updateError } = await admin
      .from("company_email_settings")
      .update({
        domain_status: domain.status,
        domain_records: domain.records ?? [],
        domain_last_checked_at: new Date().toISOString(),
        custom_sender_verified: verified,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", user.companyId)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({
      domain,
      settings: updated,
      verified,
      message: verified
        ? "Domain verified successfully."
        : "Verification started. DNS changes can take a few minutes to be detected.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify custom email domain.",
      },
      { status: 500 },
    );
  }
}
