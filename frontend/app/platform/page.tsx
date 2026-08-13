import Link from "next/link";

import { requirePlatformRole } from "@/lib/auth/require-permission";
import {
  loadPlatformDashboardData,
  type PlatformCompanySummary,
} from "@/lib/platform/platform-dashboard";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClasses(status: string) {
  if (status === "active") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (status === "trial") return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
  if (status === "suspended") return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function CompanyRow({ company }: { company: PlatformCompanySummary }) {
  return (
    <tr className="border-t border-slate-200 dark:border-slate-800">
      <td className="px-4 py-4">
        <p className="font-semibold text-slate-950 dark:text-slate-100">{company.name}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{company.email ?? company.slug}</p>
      </td>
      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">{company.planName}</td>
      <td className="px-4 py-4">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusClasses(company.subscriptionStatus)}`}>
          {company.subscriptionStatus}
        </span>
      </td>
      <td className="px-4 py-4 text-right text-sm font-semibold text-slate-800 dark:text-slate-200">{company.userCount}</td>
      <td className="px-4 py-4 text-right text-sm text-slate-600 dark:text-slate-400">{date(company.createdAt)}</td>
    </tr>
  );
}

export default async function PlatformDashboardPage() {
  const user = await requirePlatformRole(["super_admin", "platform_admin"]);
  const data = await loadPlatformDashboardData();

  const cards = [
    ["Companies", data.totals.companies.toLocaleString("en-GB"), `${data.totals.activeCompanies} active`],
    ["Active trials", data.totals.trials.toLocaleString("en-GB"), `${data.trialsEndingSoon.length} ending within 7 days`],
    ["Paying companies", data.totals.payingCompanies.toLocaleString("en-GB"), `${data.totals.suspendedCompanies} payment/suspended`],
    ["MRR", money(data.totals.mrr), `${money(data.totals.arr)} ARR`],
    ["Platform users", data.totals.users.toLocaleString("en-GB"), "Across all companies"],
    ["New this month", data.totals.newCompaniesThisMonth.toLocaleString("en-GB"), `${data.totals.trialConversionRate}% trial-to-paid snapshot`],
    ["Jobs recorded", data.totals.jobs.toLocaleString("en-GB"), "Across the platform"],
  ];

  return (
    <main className="min-h-dvh w-full bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">AgriCore Platform</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Platform control centre</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Platform-wide companies, subscriptions and operational health. Signed in as {user.fullName}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/platform/companies" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Companies</Link>
            <Link href="/platform/subscriptions" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Subscriptions</Link>
            <Link href="/platform/leads" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Launch leads</Link>
            <Link href="/platform/features" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Feature flags</Link>
            <Link href="/platform/demo-companies" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Demo companies</Link>
            <Link href="/platform/health" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800">System health</Link>
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(([label, value, detail]) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{value}</p>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">Recent companies</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Newest workspaces created on AgriCore.</p>
              </div>
              <Link href="/platform/companies" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Users</th>
                    <th className="px-4 py-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody>{data.recentCompanies.map((company) => <CompanyRow key={company.id} company={company} />)}</tbody>
              </table>
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-950 dark:text-white">System health</h2>
              <div className="mt-4 space-y-3">
                {[
                  ["Database", data.health.database],
                  ["Supabase service role", data.health.serviceRole],
                  ["Stripe API", data.health.stripeSecret],
                  ["Stripe webhook", data.health.stripeWebhook],
                  ["Application URL", data.health.appUrl],
                ].map(([label, ok]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{String(label)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"}`}>{ok ? "Healthy" : "Needs setup"}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-950 dark:text-white">Trials ending soon</h2>
              <div className="mt-4 space-y-3">
                {data.trialsEndingSoon.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No trials end within the next seven days.</p>
                ) : data.trialsEndingSoon.slice(0, 6).map((company) => (
                  <div key={company.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{company.name}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ends {date(company.trialEndsAt)}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
