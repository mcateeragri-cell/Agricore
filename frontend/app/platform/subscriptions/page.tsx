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
