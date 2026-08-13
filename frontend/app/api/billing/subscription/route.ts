import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { loadBillingStatus } from "@/lib/platform/billing";
import { syncStripeSubscriptionById } from "@/lib/platform/billing-sync";
import { stripePriceIdForPlan, stripeRequest } from "@/lib/platform/stripe";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { AGRICORE_PLAN_ORDER, isAgriCorePlanSlug } from "@/lib/platform/plan-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { action?: unknown; planSlug?: unknown };

export async function PATCH(request: NextRequest) {
  try {
    const user = await requirePermission(["settings.manage"]);
    const billing = await loadBillingStatus(user.companyId);
    const subscriptionId = billing.subscription.stripeSubscriptionId;
    if (!subscriptionId) {
      return NextResponse.json({ error: "This company does not have a Stripe subscription yet." }, { status: 409 });
    }

    const body = (await request.json()) as Body;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "upgrade_plan") {
      const targetSlug = typeof body.planSlug === "string" ? body.planSlug.trim().toLowerCase() : "";
      const currentIndex = isAgriCorePlanSlug(billing.plan.slug) ? AGRICORE_PLAN_ORDER.indexOf(billing.plan.slug) : -1;
      const targetIndex = isAgriCorePlanSlug(targetSlug) ? AGRICORE_PLAN_ORDER.indexOf(targetSlug) : -1;
      if (currentIndex < 0 || targetIndex !== currentIndex + 1) {
        return NextResponse.json({ error: "Self-service upgrades must move to the next AgriCore plan." }, { status: 400 });
      }

      const admin = createSupabaseAdmin();
      const { data: targetPlan, error: targetPlanError } = await admin
        .from("subscription_plans")
        .select("id,slug,stripe_monthly_price_id,is_public")
        .eq("slug", targetSlug)
        .eq("is_active", true)
        .maybeSingle();
      if (targetPlanError) throw new Error(targetPlanError.message);
      if (!targetPlan || !targetPlan.is_public) return NextResponse.json({ error: "That plan is not available for self-service upgrade." }, { status: 409 });

      const stripeSubscription = await stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
      const itemId = stripeSubscription.items?.data?.[0]?.id;
      if (!itemId) throw new Error("Stripe subscription item could not be found.");
      const priceId = stripePriceIdForPlan(targetPlan.slug, targetPlan.stripe_monthly_price_id);

      await stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: "POST",
        body: {
          items: [{ id: itemId, price: priceId }],
          proration_behavior: "always_invoice",
          metadata: { company_id: billing.companyId, plan_slug: targetPlan.slug },
        },
      });

      const { error: updateError } = await admin.from("company_subscriptions")
        .update({ plan_id: targetPlan.id, stripe_price_id: priceId, updated_at: new Date().toISOString() })
        .eq("company_id", billing.companyId);
      if (updateError) throw new Error(updateError.message);
      await syncStripeSubscriptionById(subscriptionId, billing.companyId);
      return NextResponse.json({ success: true, planSlug: targetPlan.slug });
    }

    if (action !== "cancel_at_period_end" && action !== "reactivate") {
      return NextResponse.json({ error: "Unsupported subscription action." }, { status: 400 });
    }

    await stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "POST",
      body: { cancel_at_period_end: action === "cancel_at_period_end" },
    });
    await syncStripeSubscriptionById(subscriptionId, billing.companyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to update Stripe subscription:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update subscription." },
      { status: 500 },
    );
  }
}
