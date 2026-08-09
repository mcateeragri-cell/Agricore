import Link from "next/link";

import { requirePlatformRole } from "@/lib/auth/require-permission";
import { loadPlatformDashboardData } from "@/lib/platform/platform-dashboard";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default async function PlatformSubscriptionsPage() {
  await requirePlatformRole(["super_admin", "platform_admin"]);
  const data = await loadPlatformDashboardData();
  const groups = ["active", "trial", "suspended", "cancelled", "expired", "none"];

  return (
    <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <Link href="/platform" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">← Platform dashboard</Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">Subscriptions</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Subscription health and recurring revenue across AgriCore.</p>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">MRR</p><p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{money(data.totals.mrr)}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">ARR</p><p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{money(data.totals.arr)}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">Paying</p><p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{data.totals.payingCompanies}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">Trials</p><p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{data.totals.trials}</p></article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {[
            { name: "Starter", price: "£49/month", detail: "For sole traders and small engineering businesses.", badge: "Available" },
            { name: "Professional", price: "£89/month", detail: "Full AgriCore platform and the default 14-day trial plan.", badge: "Recommended" },
            { name: "Enterprise", price: "Contact Sales", detail: "Multi-branch, integrations and tailored onboarding.", badge: "Sales assisted" },
          ].map((plan) => (
            <article key={plan.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">{plan.name}</h2>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{plan.price}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">{plan.badge}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{plan.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="font-bold text-slate-950 dark:text-white">Add-on roadmap</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Commercial options prepared for future release. These are not billable in this launch candidate.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["AI Diagnostics+", "£19/month"],
              ["Parts Hub", "£15/month"],
              ["Technician Pro", "£12/month"],
              ["Business Insights", "£15/month"],
              ["Customer Portal", "£10/month"],
              ["Extra Storage", "from £5/month / 100 GB"],
            ].map(([name, price]) => (
              <div key={name} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">Coming soon</span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{price}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((status) => {
            const companies = data.companies.filter((company) => company.subscriptionStatus === status);
            return (
              <article key={status} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between"><h2 className="font-bold capitalize text-slate-950 dark:text-white">{status}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{companies.length}</span></div>
                <div className="mt-4 space-y-3">
                  {companies.length === 0 ? <p className="text-sm text-slate-500">No companies.</p> : companies.slice(0, 10).map((company) => <div key={company.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70"><p className="font-semibold text-slate-900 dark:text-slate-100">{company.name}</p><p className="mt-1 text-xs text-slate-500">{company.planName} · {money(company.monthlyPrice)}/month</p></div>)}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
