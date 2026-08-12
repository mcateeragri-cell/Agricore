import { redirect } from "next/navigation";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

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

  return <>{children}</>;
}
