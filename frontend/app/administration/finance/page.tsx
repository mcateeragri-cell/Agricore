import { redirect } from "next/navigation";
import FinanceFoundationClient from "@/Components/finance/FinanceFoundationClient";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function FinanceAdministrationPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect("/login?redirectTo=/administration/finance");
  const allowed = auth.platformRole === "super_admin" || auth.platformRole === "platform_admin" || auth.role === "company_admin" || auth.role === "administrator" || auth.permissions.includes("settings.manage");
  if (!allowed) redirect("/dashboard");
  return <FinanceFoundationClient />;
}
