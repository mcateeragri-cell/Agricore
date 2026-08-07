import "server-only";

import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export type BillingStatus = {
  companyId: string;
  companyName: string;
  email: string;
  plan: {
    id: string;
    name: string;
    slug: string;
    monthlyPrice: number;
    yearlyPrice: number;
    trialDays: number;
  };
  subscription: {
    status: string;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    currentPeriodEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
  };
};

export async function loadBillingStatus(companyId: string): Promise<BillingStatus> {
  const admin = createSupabaseAdmin();
  const [{ data: company, error: companyError }, { data: subscription, error: subscriptionError }] =
    await Promise.all([
      admin.from("companies").select("id, company_name, email").eq("id", companyId).single(),
      admin
        .from("company_subscriptions")
        .select(`
          status,
          trial_started_at,
          trial_ends_at,
          current_period_ends_at,
          cancel_at_period_end,
          payment_customer_id,
          payment_subscription_id,
          stripe_price_id,
          subscription_plans!inner(id, name, slug, monthly_price, yearly_price, trial_days)
        `)
        .eq("company_id", companyId)
        .single(),
    ]);

  if (companyError || !company) {
    throw new Error(companyError?.message || "Unable to load the company.");
  }
  if (subscriptionError || !subscription) {
    throw new Error(subscriptionError?.message || "Unable to load the subscription.");
  }

  const planValue = Array.isArray(subscription.subscription_plans)
    ? subscription.subscription_plans[0]
    : subscription.subscription_plans;
  const plan = planValue as any;

  return {
    companyId: company.id,
    companyName: company.company_name,
    email: company.email ?? "",
    plan: {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      monthlyPrice: Number(plan.monthly_price ?? 0),
      yearlyPrice: Number(plan.yearly_price ?? 0),
      trialDays: Number(plan.trial_days ?? 14),
    },
    subscription: {
      status: subscription.status,
      trialStartedAt: subscription.trial_started_at,
      trialEndsAt: subscription.trial_ends_at,
      currentPeriodEndsAt: subscription.current_period_ends_at,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      stripeCustomerId: subscription.payment_customer_id,
      stripeSubscriptionId: subscription.payment_subscription_id,
      stripePriceId: subscription.stripe_price_id,
    },
  };
}

export function trialDaysRemaining(trialEndsAt: string | null) {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));
}
