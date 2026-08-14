import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { loadBillingStatus, trialDaysRemaining } from "@/lib/platform/billing";
import { applicationUrl, enterpriseBranchStripePriceId, stripePriceIdForPlan, stripeRequest } from "@/lib/platform/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(["settings.manage"]);
    const billing = await loadBillingStatus(user.companyId);
    const admin = createSupabaseAdmin();
    let requestedPlanSlug = billing.plan.slug;
    try {
      const body = await request.json();
      if (typeof body?.planSlug === "string" && body.planSlug.trim()) requestedPlanSlug = body.planSlug.trim().toLowerCase();
    } catch { /* body optional */ }

    const { data: requestedPlan, error: requestedPlanError } = await admin
      .from("subscription_plans")
      .select("id,name,slug,trial_days,stripe_monthly_price_id,is_public")
      .eq("slug", requestedPlanSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (requestedPlanError) throw new Error(requestedPlanError.message);
    if (!requestedPlan || !requestedPlan.is_public) return NextResponse.json({ error: "That AgriCore plan is not available for self-service checkout." }, { status: 409 });

    if (user.companySlug.includes("demo-") || user.companyName.toLowerCase().includes(" demo ")) {
      return NextResponse.json({ error: "Demo workspaces do not create Stripe subscriptions." }, { status: 409 });
    }

    if (billing.subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "This company already has an AgriCore subscription. Use Manage subscription instead." },
        { status: 409 },
      );
    }

    const appUrl = applicationUrl(request.url);
    const priceId = stripePriceIdForPlan(requestedPlan.slug, requestedPlan.stripe_monthly_price_id);
    let customerId = billing.subscription.stripeCustomerId;

    if (!customerId) {
      const customer = await stripeRequest("/customers", {
        method: "POST",
        body: {
          email: billing.email || user.email,
          name: billing.companyName,
          metadata: { company_id: billing.companyId, company_slug: user.companySlug },
        },
      });
      customerId = customer.id;
      const { error } = await admin
        .from("company_subscriptions")
        .update({
          payment_provider: "stripe",
          payment_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", billing.companyId);
      if (error) throw new Error(error.message);
    }

    const remainingTrialDays = Math.max(
      1,
      trialDaysRemaining(billing.subscription.trialEndsAt) || Number(requestedPlan.trial_days ?? 14),
    );

    const lineItems: Array<{price:string;quantity:number}> = [{ price: priceId, quantity: 1 }];
    if (requestedPlan.slug === "enterprise" && billing.branchBilling.additionalBranches > 0) {
      lineItems.push({ price: enterpriseBranchStripePriceId(), quantity: billing.branchBilling.additionalBranches });
    }

    const session = await stripeRequest("/checkout/sessions", {
      method: "POST",
      body: {
        mode: "subscription",
        customer: customerId,
        client_reference_id: billing.companyId,
        payment_method_collection: "always",
        billing_address_collection: "auto",
        allow_promotion_codes: false,
        line_items: lineItems,
        subscription_data: {
          trial_period_days: remainingTrialDays,
          metadata: { company_id: billing.companyId, plan_slug: requestedPlan.slug },
        },
        metadata: { company_id: billing.companyId, plan_slug: requestedPlan.slug },
        success_url: `${appUrl}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/settings/billing?checkout=cancelled&setup=1`,
      },
    });

    // Do not switch the local plan before Stripe Checkout completes. The
    // checkout session carries plan_slug metadata and the webhook/sync layer
    // activates the matching plan only after Stripe creates the subscription.
    // This prevents a cancelled checkout from granting higher-tier entitlements.
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Unable to create Stripe checkout session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to open secure checkout." },
      { status: 500 },
    );
  }
}
