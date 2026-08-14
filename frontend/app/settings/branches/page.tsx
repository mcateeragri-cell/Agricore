import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import BranchManagementClient from "./branch-management-client";

export default async function BranchSettingsPage() {
  const user = await requirePermission(["settings.manage"]);
  const enabled = await isCompanyFeatureEnabled(createSupabaseAdmin(), user.companyId, "multi_branch");

  if (!enabled) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-950/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-950">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Enterprise</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Multi-branch management</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Add depots, assign home branches and control operational and financial visibility independently. Upgrade to Enterprise to enable additional depots.
          </p>
          <a href="/settings/billing" className="mt-6 inline-flex rounded-xl bg-[#103D2E] px-5 py-3 text-sm font-black text-white">View Enterprise</a>
        </div>
      </main>
    );
  }

  return <BranchManagementClient />;
}
