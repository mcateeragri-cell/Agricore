import { redirect } from "next/navigation";
import FinancialReportsClient from "@/Components/finance/FinancialReportsClient";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
export const dynamic = "force-dynamic";
export default async function FinancialReportsPage(){const auth=await getAuthenticatedUserContext();if(!auth)redirect("/login?redirectTo=/administration/finance/reports");const allowed=auth.platformRole==="super_admin"||auth.platformRole==="platform_admin"||auth.role==="company_admin"||auth.role==="administrator"||auth.permissions.includes("settings.manage")||auth.permissions.includes("finance.reports");if(!allowed)redirect("/dashboard");return <FinancialReportsClient/>;}
