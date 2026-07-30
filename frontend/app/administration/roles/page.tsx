import { requirePermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  await requirePermission(["roles.manage"]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-medium text-emerald-700">
            Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Roles
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Manage application roles and permissions.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Role management is protected
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Only users with the roles.manage permission can open this page.
          </p>
        </section>
      </div>
    </main>
  );
}