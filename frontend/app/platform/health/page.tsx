import Link from "next/link";

import { requirePlatformRole } from "@/lib/auth/require-permission";
import { loadPlatformDashboardData } from "@/lib/platform/platform-dashboard";

export const dynamic = "force-dynamic";

export default async function PlatformHealthPage() {
  await requirePlatformRole(["super_admin", "platform_admin"]);
  const data = await loadPlatformDashboardData();
  const checks = [
    ["Supabase database", data.health.database, "Core platform data can be queried."],
    ["Supabase service role", data.health.serviceRole, "Required for protected platform-level operations."],
    ["Stripe secret key", data.health.stripeSecret, "Required to create and manage AgriCore subscriptions."],
    ["Stripe webhook secret", data.health.stripeWebhook, "Required to verify subscription lifecycle events."],
    ["Application URL", data.health.appUrl, "Used for Stripe return URLs and public application links."],
  ] as const;

  return (
    <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl">
        <Link href="/platform" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">← Platform dashboard</Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">System health</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">A launch-safe configuration check. No secret values are displayed.</p>

        <div className="mt-6 space-y-3">
          {checks.map(([label, ok, detail]) => (
            <article key={label} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
              <div><h2 className="font-bold text-slate-950 dark:text-white">{label}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p></div>
              <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"}`}>{ok ? "Healthy" : "Needs attention"}</span>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
