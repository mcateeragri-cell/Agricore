import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { loadBillingStatus, trialDaysRemaining } from "@/lib/platform/billing";
import { applicationUrl, stripePriceIdForPlan, stripeRequest } from "@/lib/platform/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(["settings.manage"]);
    const billing = await loadBillingStatus(user.companyId);
    const admin = createSupabaseAdmin();

    if (user.companySlug.includes("demo-") || user.companyName.toLowerCase().includes(" demo ")) {
      return NextResponse.json({ error: "Demo workspaces do not create Stripe subscriptions." }, { status: 409 });
    }

    if (billing.subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "This company already has an AgriCore subscription. Use Manage subscription instead." },
        { status: 409 },
      );
    }

    if (billing.plan.slug !== "professional" || !billing.plan.isPublic) {
      return NextResponse.json(
        { error: "The selected AgriCore plan is not available for self-service checkout." },
        { status: 409 },
      );
    }

    const appUrl = applicationUrl(request.url);
    const priceId = stripePriceIdForPlan(billing.plan.slug, billing.plan.stripeMonthlyPriceId);
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
      trialDaysRemaining(billing.subscription.trialEndsAt) || billing.plan.trialDays,
    );

    const session = await stripeRequest("/checkout/sessions", {
      method: "POST",
      body: {
        mode: "subscription",
        customer: customerId,
        client_reference_id: billing.companyId,
        payment_method_collection: "always",
        billing_address_collection: "auto",
        allow_promotion_codes: false,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: remainingTrialDays,
          metadata: { company_id: billing.companyId, plan_slug: billing.plan.slug },
        },
        metadata: { company_id: billing.companyId, plan_slug: billing.plan.slug },
        success_url: `${appUrl}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/settings/billing?checkout=cancelled&setup=1`,
      },
    });

    const [{ error: subscriptionUpdateError }, { error: planUpdateError }] = await Promise.all([
      admin
        .from("company_subscriptions")
        .update({ payment_provider: "stripe", stripe_price_id: priceId, updated_at: new Date().toISOString() })
        .eq("company_id", billing.companyId),
      admin
        .from("subscription_plans")
        .update({ stripe_monthly_price_id: priceId, updated_at: new Date().toISOString() })
        .eq("id", billing.plan.id)
        .is("stripe_monthly_price_id", null),
    ]);

    if (subscriptionUpdateError) throw new Error(subscriptionUpdateError.message);
    if (planUpdateError) throw new Error(planUpdateError.message);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Unable to create Stripe checkout session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to open secure checkout." },
      { status: 500 },
    );
  }
}
