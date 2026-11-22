import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePlatformRole } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const dynamic = "force-dynamic";

function displayDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(date);
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{value}</p></div>;
}

export default async function PlatformCompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  await requirePlatformRole(["super_admin", "platform_admin"]);
  const { companyId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) notFound();
  const admin = createSupabaseAdmin();
  const [companyResult, subscriptionsResult, membersResult, customersResult, machinesResult, jobsResult] = await Promise.all([
    admin.from("companies").select("id,company_name,slug,email,billing_mode,is_active,created_at").eq("id", companyId).maybeSingle(),
    admin.from("company_subscriptions").select("plan_id,status,trial_started_at,trial_ends_at,current_period_ends_at,payment_provider,payment_subscription_id,grace_ends_at,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    admin.from("company_members").select("user_id").eq("company_id",companyId).eq("is_active",true),
    admin.from("customers").select("id",{count:"exact",head:true}).eq("company_id",companyId),
    admin.from("machines").select("id",{count:"exact",head:true}).eq("company_id",companyId),
    admin.from("jobs").select("id",{count:"exact",head:true}).eq("company_id",companyId),
  ]);
  const error = [companyResult.error,subscriptionsResult.error,membersResult.error,customersResult.error,machinesResult.error,jobsResult.error].find(Boolean);
  if (error) throw new Error(error.message);
  const company = companyResult.data;
  if (!company) notFound();
  const subscription = subscriptionsResult.data;
  const members = membersResult.data ?? [];
  const [planResult, ...userResults] = await Promise.all([
    subscription?.plan_id ? admin.from("subscription_plans").select("name,slug,max_users,max_storage_gb").eq("id",subscription.plan_id).maybeSingle() : Promise.resolve({data:null,error:null}),
    ...members.map(member => admin.auth.admin.getUserById(member.user_id)),
  ]);
  if (planResult.error) throw new Error(planResult.error.message);
  const signIns = userResults.flatMap(result => result.data.user?.last_sign_in_at ? [result.data.user.last_sign_in_at] : []).sort((a,b)=>new Date(b).getTime()-new Date(a).getTime());
  const lastSignIn = signIns[0] ?? null;
  const lastSignInDate = lastSignIn ? new Date(lastSignIn).getTime() : null;
  const daysInactive = lastSignInDate !== null ? Math.max(0,Math.floor((Date.now()-lastSignInDate)/86400000)) : null;
  const trialEndsAt = subscription?.trial_ends_at ?? null;
  const trialExpired = subscription?.status === "trial" && trialEndsAt !== null && new Date(trialEndsAt).getTime() < Date.now();
  return <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
    <div className="mx-auto max-w-6xl space-y-6">
      <div><Link href="/platform/companies" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">← All companies</Link><h1 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">{company.company_name}</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{company.email || company.slug} · {company.is_active ? "Company active" : "Company inactive"}</p></div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-950 dark:text-white">Activity &amp; subscription</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Read-only information for authorised AgriCore platform administrators.</p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {([
            ["Billing mode",company.billing_mode ?? "subscription"],
            ["Subscription plan",planResult.data?.name ?? "Not assigned"],
            ["Subscription status",trialExpired ? "Trial expired (record pending update)" : subscription?.status ?? "No subscription"],
            ["Trial started",displayDate(subscription?.trial_started_at)],
            ["Trial ends",displayDate(trialEndsAt)],
            ["Renewal / period end",displayDate(subscription?.current_period_ends_at)],
            ["Stripe subscription",subscription?.payment_subscription_id ? "Connected" : "Not connected"],
            ["Payment provider",subscription?.payment_provider ?? "Not configured"],
            ["Company created",displayDate(company.created_at)],
          ] as [string,string][]).map(([label,value])=><div key={label}><dt className="text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-900 dark:text-white">{value}</dd></div>)}
        </dl>
      </section>
      <section><h2 className="mb-3 text-lg font-bold text-slate-950 dark:text-white">Company usage</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Customers" value={customersResult.count ?? 0}/><Metric label="Machines" value={machinesResult.count ?? 0}/><Metric label="Jobs" value={jobsResult.count ?? 0}/><Metric label="Active team members" value={members.length}/></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-950 dark:text-white">Engagement</h2><div className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><p className="text-slate-500 dark:text-slate-400">Latest recorded sign-in across active team members</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{displayDate(lastSignIn)}</p></div><div><p className="text-slate-500 dark:text-slate-400">Days since recorded sign-in</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{daysInactive === null ? "Unknown" : `${daysInactive} days`}</p></div></div><p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Sign-in timestamps are not a complete activity log. Existing sessions may be used without a new recorded sign-in. Record counts include records created before the trial.</p></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-950 dark:text-white">Plan allowances</h2><p className="mt-3 text-sm text-slate-700 dark:text-slate-300">Users: {planResult.data?.max_users ?? "Not configured"} · Storage allowance: {planResult.data?.max_storage_gb ?? "Not configured"} GB</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Storage consumption and company-specific overrides are not displayed until reliable usage metering is connected.</p></section>
    </div>
  </main>;
}
