import Link from "next/link";

import { requirePlatformRole } from "@/lib/auth/require-permission";
import { loadPlatformDashboardData } from "@/lib/platform/platform-dashboard";

export const dynamic = "force-dynamic";

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function PlatformCompaniesPage() {
  await requirePlatformRole(["super_admin", "platform_admin"]);
  const data = await loadPlatformDashboardData();

  return (
    <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <Link href="/platform" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">← Platform dashboard</Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">Companies</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">A platform-wide view of every AgriCore company. This screen is deliberately read-only for the launch release.</p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                <tr><th className="px-4 py-3">Company</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Subscription</th><th className="px-4 py-3">Users</th><th className="px-4 py-3">Trial / renewal</th><th className="px-4 py-3">Created</th></tr>
              </thead>
              <tbody>
                {data.companies.map((company) => (
                  <tr key={company.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-4"><p className="font-semibold text-slate-950 dark:text-white">{company.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{company.email ?? company.slug}</p></td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{company.planName}</td>
                    <td className="px-4 py-4"><span className="capitalize font-semibold text-slate-800 dark:text-slate-200">{company.subscriptionStatus}</span>{!company.isActive && <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Company inactive</span>}</td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{company.userCount}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{date(company.trialEndsAt ?? company.currentPeriodEndsAt)}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{date(company.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
