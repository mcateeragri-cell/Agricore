import "server-only";

import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import {
  DEFAULT_REGIONAL_SETTINGS,
  normaliseRegionalSettings,
  type RegionalSettings,
} from "@/lib/regional-settings";

export type BillingMode = "subscription" | "internal" | "demo";

export type BillingStatus = {
  companyId: string;
  companyName: string;
  email: string;
  billingMode: BillingMode;
  regional: RegionalSettings;
  plan: {
    id: string;
    name: string;
    slug: string;
    monthlyPrice: number;
    yearlyPrice: number;
    trialDays: number;
    maxUsers: number;
    maxStorageGb: number;
    currencyCode: string;
    stripeMonthlyPriceId: string | null;
    isPublic: boolean;
  };
  usage: { users: number; customers: number; machines: number; jobs: number; aiRequestsThisMonth: number };
  subscription: {
    status: string;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    currentPeriodEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    lastInvoiceId: string | null;
    lastInvoiceStatus: string | null;
    lastPaymentAt: string | null;
    paymentFailedAt: string | null;
    graceEndsAt: string | null;
    lastStripeSyncAt: string | null;
  };
};

function normaliseBillingMode(value: unknown): BillingMode {
  return value === "internal" || value === "demo" ? value : "subscription";
}

const subscriptionColumns = `
  id, plan_id, status, trial_started_at, trial_ends_at, current_period_ends_at,
  cancel_at_period_end, payment_customer_id, payment_subscription_id, stripe_price_id,
  last_invoice_id, last_invoice_status, last_payment_at, payment_failed_at,
  grace_ends_at, last_stripe_sync_at, created_at
`;

const planColumns = `
  id, name, slug, monthly_price, yearly_price, trial_days, max_users, max_storage_gb,
  currency_code, stripe_monthly_price_id, is_public
`;

export async function loadBillingStatus(companyId: string): Promise<BillingStatus> {
  const admin = createSupabaseAdmin();

  const [
    { data: company, error: companyError },
    { data: settings, error: settingsError },
    { count: userCount, error: usersError },
    { count: customerCount, error: customersError },
    { count: machineCount, error: machinesError },
    { count: jobCount, error: jobsError },
    { count: aiUsageCount, error: aiUsageError },
  ] = await Promise.all([
    admin
      .from("companies")
      .select("id, company_name, email, billing_mode")
      .eq("id", companyId)
      .maybeSingle(),
    admin
      .from("company_settings")
      .select("country_code,currency_code,locale,timezone,tax_name,default_tax_rate,date_format,time_format,week_start,measurement_system")
      .eq("company_id", companyId)
      .maybeSingle(),
    admin
      .from("company_members")
      .select("user_id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true),
    admin.from("customers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    admin.from("machines").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    admin.from("company_ai_usage").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()),
  ]);

  const firstError = companyError || settingsError || usersError || customersError || machinesError || jobsError || aiUsageError;
  if (firstError) throw new Error(firstError.message);
  if (!company) throw new Error("Unable to load the company.");

  const billingMode = normaliseBillingMode((company as any).billing_mode);

  const { data: subscription, error: subscriptionError } = await admin
    .from("company_subscriptions")
    .select(subscriptionColumns)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subscriptionError) throw new Error(subscriptionError.message);

  const planId = subscription?.plan_id ?? null;
  const planQuery = admin.from("subscription_plans").select(planColumns);
  const { data: plan, error: planError } = planId
    ? await planQuery.eq("id", planId).maybeSingle()
    : await planQuery.eq("slug", "professional").maybeSingle();

  if (planError) throw new Error(planError.message);
  if (!plan) throw new Error("Unable to load the AgriCore Professional plan.");

  const syntheticStatus = billingMode === "internal" ? "internal" : billingMode === "demo" ? "demo" : "unconfigured";

  return {
    companyId: company.id,
    companyName: company.company_name,
    email: company.email ?? "",
    billingMode,
    regional: normaliseRegionalSettings(settings ?? DEFAULT_REGIONAL_SETTINGS),
    plan: {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      monthlyPrice: Number(plan.monthly_price ?? 0),
      yearlyPrice: Number(plan.yearly_price ?? 0),
      trialDays: Number(plan.trial_days ?? 14),
      maxUsers: Number(plan.max_users ?? 0),
      maxStorageGb: Number(plan.max_storage_gb ?? 0),
      currencyCode: String(plan.currency_code ?? "GBP"),
      stripeMonthlyPriceId: plan.stripe_monthly_price_id ?? null,
      isPublic: Boolean(plan.is_public),
    },
    usage: { users: userCount ?? 0, customers: customerCount ?? 0, machines: machineCount ?? 0, jobs: jobCount ?? 0, aiRequestsThisMonth: aiUsageCount ?? 0 },
    subscription: {
      status: billingMode === "subscription" ? (subscription?.status ?? syntheticStatus) : syntheticStatus,
      trialStartedAt: billingMode === "subscription" ? (subscription?.trial_started_at ?? null) : null,
      trialEndsAt: billingMode === "subscription" ? (subscription?.trial_ends_at ?? null) : null,
      currentPeriodEndsAt: billingMode === "subscription" ? (subscription?.current_period_ends_at ?? null) : null,
      cancelAtPeriodEnd: billingMode === "subscription" ? Boolean(subscription?.cancel_at_period_end) : false,
      stripeCustomerId: billingMode === "subscription" ? (subscription?.payment_customer_id ?? null) : null,
      stripeSubscriptionId: billingMode === "subscription" ? (subscription?.payment_subscription_id ?? null) : null,
      stripePriceId: billingMode === "subscription" ? (subscription?.stripe_price_id ?? null) : null,
      lastInvoiceId: billingMode === "subscription" ? (subscription?.last_invoice_id ?? null) : null,
      lastInvoiceStatus: billingMode === "subscription" ? (subscription?.last_invoice_status ?? null) : null,
      lastPaymentAt: billingMode === "subscription" ? (subscription?.last_payment_at ?? null) : null,
      paymentFailedAt: billingMode === "subscription" ? (subscription?.payment_failed_at ?? null) : null,
      graceEndsAt: billingMode === "subscription" ? (subscription?.grace_ends_at ?? null) : null,
      lastStripeSyncAt: billingMode === "subscription" ? (subscription?.last_stripe_sync_at ?? null) : null,
    },
  };
}

export function trialDaysRemaining(trialEndsAt: string | null) {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));
}

export type PublicBillingPlan = {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  trialDays: number;
  maxUsers: number;
  maxStorageGb: number;
  currencyCode: string;
  stripeMonthlyPriceId: string | null;
};

export async function loadPublicBillingPlans(): Promise<PublicBillingPlan[]> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("subscription_plans")
    .select("id,name,slug,monthly_price,yearly_price,trial_days,max_users,max_storage_gb,currency_code,stripe_monthly_price_id,sort_order")
    .eq("is_active", true)
    .eq("is_public", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((plan) => ({
    id: String(plan.id), name: String(plan.name), slug: String(plan.slug),
    monthlyPrice: Number(plan.monthly_price ?? 0), yearlyPrice: Number(plan.yearly_price ?? 0),
    trialDays: Number(plan.trial_days ?? 14), maxUsers: Number(plan.max_users ?? 0),
    maxStorageGb: Number(plan.max_storage_gb ?? 0), currencyCode: String(plan.currency_code ?? "GBP"),
    stripeMonthlyPriceId: plan.stripe_monthly_price_id ?? null,
  }));
}
