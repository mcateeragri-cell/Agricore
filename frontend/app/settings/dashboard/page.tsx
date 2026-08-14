import DashboardRoleLayoutsClient from "./dashboard-role-layouts-client";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

export const dynamic = "force-dynamic";

export default async function DashboardLayoutsPage() {
  const auth = await requirePermission(["settings.manage"]);
  const admin = createSupabaseAdmin();
  const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, "dashboard_builder");

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">Administration</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Dashboard layouts</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">Set a company fallback and role-specific dashboards. Individual users can then customise their own layout only when you allow it.</p>
      </header>

      {enabled ? <DashboardRoleLayoutsClient /> : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Dashboard Builder is not enabled for this company.</div>
      )}
    </main>
  );
}
