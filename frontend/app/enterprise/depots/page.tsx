import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import DepotOverviewClient from "./depot-overview-client";

export const dynamic = "force-dynamic";

export default async function DepotOverviewPage() {
  const auth = await requirePermission(["settings.manage", "jobs.view_all", "finance.reports"]);
  const admin = createSupabaseAdmin();
  const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, "multi_branch");
  if (!enabled) return <main className="mx-auto max-w-6xl p-8"><h1 className="text-3xl font-black">Depot overview</h1><p className="mt-4 text-slate-600">Multi-branch management is available on Enterprise.</p></main>;
  return <DepotOverviewClient />;
}
