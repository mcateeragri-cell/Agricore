import { redirect } from "next/navigation";
import PurchaseLedgerClient from "@/Components/finance/PurchaseLedgerClient";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function PurchaseLedgerPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect("/login?redirectTo=/administration/finance/purchases");
  const allowed =
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("settings.manage") ||
    auth.permissions.includes("finance.manage");
  if (!allowed) redirect("/dashboard");
  return <PurchaseLedgerClient />;
}
