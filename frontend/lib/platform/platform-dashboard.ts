import "server-only";

import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export type PlatformCompanySummary = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  isActive: boolean;
  createdAt: string | null;
  subscriptionStatus: string;
  planName: string;
  monthlyPrice: number;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  userCount: number;
};

export type PlatformDashboardData = {
  totals: {
    companies: number;
    activeCompanies: number;
    trials: number;
    payingCompanies: number;
    suspendedCompanies: number;
    cancelledCompanies: number;
    users: number;
    jobs: number;
    mrr: number;
    arr: number;
    trialConversionRate: number;
    newCompaniesThisMonth: number;
  };
  companies: PlatformCompanySummary[];
  recentCompanies: PlatformCompanySummary[];
  trialsEndingSoon: PlatformCompanySummary[];
  health: {
    database: boolean;
    stripeSecret: boolean;
    stripeWebhook: boolean;
    serviceRole: boolean;
    appUrl: boolean;
  };
};

type CompanyRow = {
  id: string;
  company_name: string;
  slug: string;
  email: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type SubscriptionRow = {
  company_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
};

type PlanRow = {
  id: string;
  name: string;
  monthly_price: number | string | null;
};

type MembershipRow = {
  company_id: string;
  user_id: string;
};

function asMoney(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export async function loadPlatformDashboardData(): Promise<PlatformDashboardData> {
  const admin = createSupabaseAdmin();

  const [
    companiesResult,
    subscriptionsResult,
    plansResult,
    membershipsResult,
    jobsResult,
  ] = await Promise.all([
    admin
      .from("companies")
      .select("id, company_name, slug, email, is_active, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("company_subscriptions")
      .select(
        "company_id, plan_id, status, trial_ends_at, current_period_ends_at",
      ),
    admin
      .from("subscription_plans")
      .select("id, name, monthly_price"),
    admin
      .from("company_members")
      .select("company_id, user_id")
      .eq("is_active", true),
    admin.from("jobs").select("id", { count: "exact", head: true }),
  ]);

  const firstError = [
    companiesResult.error,
    subscriptionsResult.error,
    plansResult.error,
    membershipsResult.error,
    jobsResult.error,
  ].find(Boolean);

  if (firstError) {
    throw new Error(firstError.message);
  }

  const companies = (companiesResult.data ?? []) as CompanyRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const plans = (plansResult.data ?? []) as PlanRow[];
  const memberships = (membershipsResult.data ?? []) as MembershipRow[];

  const subscriptionByCompany = new Map(
    subscriptions.map((subscription) => [subscription.company_id, subscription]),
  );
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const usersByCompany = new Map<string, Set<string>>();

  for (const membership of memberships) {
    const current = usersByCompany.get(membership.company_id) ?? new Set<string>();
    current.add(membership.user_id);
    usersByCompany.set(membership.company_id, current);
  }

  const summaries: PlatformCompanySummary[] = companies.map((company) => {
    const subscription = subscriptionByCompany.get(company.id);
    const plan = subscription ? planById.get(subscription.plan_id) : undefined;

    return {
      id: company.id,
      name: company.company_name,
      slug: company.slug,
      email: company.email,
      isActive: company.is_active !== false,
      createdAt: company.created_at,
      subscriptionStatus: subscription?.status ?? "none",
      planName: plan?.name ?? "No plan",
      monthlyPrice: asMoney(plan?.monthly_price),
      trialEndsAt: subscription?.trial_ends_at ?? null,
      currentPeriodEndsAt: subscription?.current_period_ends_at ?? null,
      userCount: usersByCompany.get(company.id)?.size ?? 0,
    };
  });

  const paying = summaries.filter(
    (company) => company.isActive && company.subscriptionStatus === "active",
  );
  const mrr = paying.reduce((total, company) => total + company.monthlyPrice, 0);
  const totalDistinctUsers = new Set(memberships.map((row) => row.user_id)).size;
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const convertedOrTrial = summaries.filter((company) =>
    company.subscriptionStatus === "trial" || company.subscriptionStatus === "active",
  ).length;
  const trialConversionRate = convertedOrTrial > 0
    ? Math.round((paying.length / convertedOrTrial) * 100)
    : 0;
  const newCompaniesThisMonth = summaries.filter((company) =>
    company.createdAt && new Date(company.createdAt).getTime() >= monthStart.getTime(),
  ).length;

  return {
    totals: {
      companies: summaries.length,
      activeCompanies: summaries.filter((company) => company.isActive).length,
      trials: summaries.filter((company) => company.subscriptionStatus === "trial").length,
      payingCompanies: paying.length,
      suspendedCompanies: summaries.filter(
        (company) => company.subscriptionStatus === "suspended",
      ).length,
      cancelledCompanies: summaries.filter(
        (company) => company.subscriptionStatus === "cancelled",
      ).length,
      users: totalDistinctUsers,
      jobs: jobsResult.count ?? 0,
      mrr,
      arr: mrr * 12,
      trialConversionRate,
      newCompaniesThisMonth,
    },
    companies: summaries,
    recentCompanies: summaries.slice(0, 6),
    trialsEndingSoon: summaries
      .filter((company) => {
        if (company.subscriptionStatus !== "trial" || !company.trialEndsAt) {
          return false;
        }
        const endsAt = new Date(company.trialEndsAt).getTime();
        return endsAt >= now && endsAt - now <= sevenDays;
      })
      .sort(
        (a, b) =>
          new Date(a.trialEndsAt ?? 0).getTime() -
          new Date(b.trialEndsAt ?? 0).getTime(),
      ),
    health: {
      database: true,
      stripeSecret: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    },
  };
}
