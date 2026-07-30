import { requirePermission } from "@/lib/auth/require-permission";

import UsersPageClient from "./users-page-client";

export const dynamic = "force-dynamic";

export default async function AdministrationUsersPage() {
  await requirePermission([
    "users.view",
    "users.manage_all",
    "users.manage_technicians",
  ]);

  return <UsersPageClient />;
}