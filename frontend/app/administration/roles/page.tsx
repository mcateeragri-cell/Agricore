import RolesPermissionsManager from "@/Components/administration/roles/roles-permissions-manager";
import { requireAuthenticatedUser } from "@/lib/auth/require-permission";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const context = await requireAuthenticatedUser();
  const canManage =
    context.platformRole === "super_admin" ||
    context.platformRole === "platform_admin" ||
    context.role === "company_admin" ||
    context.permissions.includes("roles.manage");

  if (!canManage) redirect("/unauthorised");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Administration</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Roles &amp; Permissions</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Control what each company role can view and manage.</p>
        </header>
        <RolesPermissionsManager />
      </div>
    </main>
  );
}
