import "server-only";

import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { stripeRequest } from "@/lib/platform/stripe";

export function isoFromStripeUnix(value: unknown) {
  return typeof value === "number" && value > 0
    ? new Date(value * 1000).toISOString()
    : null;
}

export function mapStripeSubscriptionStatus(value: string) {
  switch (value) {
    case "trialing":
      return "trial";
    case "active":
      return "active";
    case "canceled":
      return "cancelled";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "suspended";
    default:
      return "expired";
  }
}

export function stripeSubscriptionPeriodEnd(subscription: any) {
  const item = subscription?.items?.data?.[0];
  return isoFromStripeUnix(
    item?.current_period_end ?? subscription?.current_period_end,
  );
}

export async function syncStripeSubscriptionById(
  subscriptionId: string,
  companyId?: string | null,
) {
  const subscription = await stripeRequest<any>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=default_payment_method`,
  );

  const admin = createSupabaseAdmin();
  const metadataCompanyId = typeof subscription?.metadata?.company_id === "string"
    ? subscription.metadata.company_id : null;
  if (companyId && metadataCompanyId && companyId !== metadataCompanyId) {
    throw new Error("Stripe subscription company ownership mismatch.");
  }
  const resolvedCompanyId = metadataCompanyId || companyId || null;
  if (!resolvedCompanyId) {
    throw new Error("Stripe subscription is missing company ownership metadata.");
  }
  const { data: currentRow, error: lookupError } = await admin
    .from("company_subscriptions")
    .select("company_id,payment_subscription_id,payment_customer_id")
    .eq("company_id", resolvedCompanyId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!currentRow) throw new Error("No company subscription row exists for Stripe synchronisation.");
  if (currentRow.payment_subscription_id && currentRow.payment_subscription_id !== subscription.id) {
    throw new Error("Company already has a different Stripe subscription.");
  }
  const stripeCustomerId = typeof subscription.customer === "string"
    ? subscription.customer : subscription.customer?.id ?? null;
  if (currentRow.payment_customer_id && stripeCustomerId && currentRow.payment_customer_id !== stripeCustomerId) {
    throw new Error("Stripe customer ownership mismatch.");
  }

  const stripePriceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const metadataPlanSlug = typeof subscription?.metadata?.plan_slug === "string" ? subscription.metadata.plan_slug : null;
  let resolvedPlanId: string | null = null;
  if (metadataPlanSlug || stripePriceId) {
    let query = admin.from("subscription_plans").select("id").limit(1);
    query = metadataPlanSlug ? query.eq("slug", metadataPlanSlug) : query.eq("stripe_monthly_price_id", stripePriceId);
    const { data: plan, error: planError } = await query.maybeSingle();
    if (planError) throw new Error(planError.message);
    resolvedPlanId = plan?.id ?? null;
  }

  const update = {
    status: mapStripeSubscriptionStatus(String(subscription.status ?? "")),
    payment_provider: "stripe",
    payment_customer_id:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null,
    payment_subscription_id: subscription.id,
    stripe_price_id: stripePriceId,
    ...(resolvedPlanId ? { plan_id: resolvedPlanId } : {}),
    trial_started_at: isoFromStripeUnix(subscription.trial_start),
    trial_ends_at: isoFromStripeUnix(subscription.trial_end),
    subscription_started_at: isoFromStripeUnix(subscription.start_date),
    current_period_ends_at: stripeSubscriptionPeriodEnd(subscription),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    cancelled_at: isoFromStripeUnix(subscription.canceled_at),
    last_stripe_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await admin
    .from("company_subscriptions")
    .update(update)
    .eq("company_id", resolvedCompanyId)
    .select("company_id")
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!updated) throw new Error("Stripe synchronisation updated no subscription row.");
  return subscription;
}
