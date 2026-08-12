import { redirect } from "next/navigation";
import BankReconciliationClient from "@/Components/finance/BankReconciliationClient";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
export const dynamic = "force-dynamic";
export default async function BankReconciliationPage(){const auth=await getAuthenticatedUserContext();if(!auth)redirect("/login?redirectTo=/administration/finance/bank");const allowed=auth.platformRole==="super_admin"||auth.platformRole==="platform_admin"||auth.role==="company_admin"||auth.role==="administrator"||auth.permissions.includes("settings.manage")||auth.permissions.includes("finance.manage")||auth.permissions.includes("finance.reports");if(!allowed)redirect("/dashboard");return <BankReconciliationClient/>;}
