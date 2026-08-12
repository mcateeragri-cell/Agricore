import { redirect } from "next/navigation";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";

import DataManagementClient from "./data-management-client";

export const dynamic = "force-dynamic";

export default async function DataManagementPage() {
  const auth = await getAuthenticatedUserContext();

  if (!auth) {
    redirect("/login?redirectTo=/administration/data-management");
  }

  const allowed =
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("settings.manage");

  if (!allowed) {
    redirect("/dashboard");
  }

  return <DataManagementClient />;
}
