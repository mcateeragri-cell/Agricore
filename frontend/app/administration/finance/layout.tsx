import { redirect } from "next/navigation";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import FinanceBranchSwitcher from "@/Components/finance/FinanceBranchSwitcher";

export const dynamic = "force-dynamic";

export default async function FinancialControlLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const auth = await getAuthenticatedUserContext();

  if (!auth) {
    redirect("/login?redirectTo=/administration/finance");
  }

  const canManageFinance =
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("settings.manage") ||
    auth.permissions.includes("finance.view") ||
    auth.permissions.includes("finance.manage") ||
    auth.permissions.includes("finance.reports");

  if (!canManageFinance) {
    redirect("/unauthorised");
  }

  if (
    auth.platformRole !== "super_admin" &&
    auth.platformRole !== "platform_admin"
  ) {
    const enabled = await isCompanyFeatureEnabled(
      createSupabaseAdmin(),
      auth.companyId,
      "financial_control",
    );

    if (!enabled) {
      redirect("/settings/billing?upgrade=financial-control");
    }
  }

  const admin = createSupabaseAdmin();
  const { data: branchRows } = await admin.from("company_branches").select("id,code,name,is_head_office").eq("company_id", auth.companyId).eq("active", true).order("is_head_office", { ascending:false }).order("sort_order");
  const branches = (branchRows ?? []).map((b) => ({ id:String(b.id), code:String(b.code??""), name:String(b.name??"Depot"), isHeadOffice:Boolean(b.is_head_office) }));
  return <><div className="flex justify-end px-5 pt-4 lg:px-7"><FinanceBranchSwitcher branches={branches} accessibleIds={auth.accessibleFinanceBranchIds} activeFinanceBranchId={auth.activeFinanceBranchId} financeScope={auth.financeScope}/></div>{children}</>;
}
