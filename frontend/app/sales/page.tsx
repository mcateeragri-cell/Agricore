import { redirect } from "next/navigation";

import MachinerySalesClient from "@/Components/sales/machinery-sales-client";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect("/login?redirectTo=/sales");

  const canView =
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("sales.view") ||
    auth.permissions.includes("sales.manage");

  if (!canView) redirect("/unauthorised");

  const admin = createSupabaseAdmin();
  const [enabled, networkEnabled] = await Promise.all([
    isCompanyFeatureEnabled(admin, auth.companyId, "machinery_sales_crm"),
    isCompanyFeatureEnabled(admin, auth.companyId, "atlas_enterprise_network"),
  ]);
  if (!enabled) redirect("/unauthorised");

  return <MachinerySalesClient networkEnabled={networkEnabled} />;
}
