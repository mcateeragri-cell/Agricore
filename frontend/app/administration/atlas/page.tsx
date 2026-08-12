import { redirect } from "next/navigation";
import AtlasHealthClient from "@/Components/atlas/AtlasHealthClient";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AtlasAdministrationPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect("/login?redirectTo=/administration/atlas");

  const allowed =
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("settings.manage");

  if (!allowed) redirect("/dashboard");

  return <main className="w-full space-y-6 px-5 py-5 lg:px-7"><div><p className="text-sm font-semibold text-emerald-700">Administration</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Atlas health</h1><p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">Monitor AgriCore Intelligence background events, queue processing, cached AI context and scheduled analysis without exposing operational complexity to normal users.</p></div><AtlasHealthClient /></main>;
}
