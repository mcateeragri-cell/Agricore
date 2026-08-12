import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatDateTime } from "@/lib/regional-settings";
import { loadCompanyRegionalSettings } from "@/lib/server/company-regional-settings";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ entity?: string; action?: string }>;

type AuditRow = {
  id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  entity_reference: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function title(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect("/login?redirectTo=/administration/audit-log");

  const allowed =
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("settings.manage");

  if (!allowed) redirect("/dashboard");

  const params = await searchParams;
  const entity = String(params.entity ?? "all");
  const action = String(params.action ?? "all");
  const supabase = await createSupabaseServerClient();
  const regional = await loadCompanyRegionalSettings(supabase, auth.companyId);

  let query = supabase
    .from("data_management_audit")
    .select("id,user_id,entity_type,entity_id,entity_reference,action,metadata,created_at")
    .eq("company_id", auth.companyId)
    .order("created_at", { ascending: false })
    .limit(250);

  if (entity !== "all") query = query.eq("entity_type", entity);
  if (action !== "all") query = query.eq("action", action);

  const { data, error } = await query;
  const rows = (data ?? []) as AuditRow[];
  const entityOptions = Array.from(new Set(rows.map((row) => row.entity_type))).sort();
  const actionOptions = Array.from(new Set(rows.map((row) => row.action))).sort();

  return (
    <main className="w-full space-y-6 px-5 py-5 lg:px-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Administration</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Audit log</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Review destructive data-management actions for the active company. AgriCore keeps this history separate from the records being removed.
          </p>
        </div>
        <Link href="/administration/data-management" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">
          Data Management
        </Link>
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:max-w-2xl dark:border-slate-800 dark:bg-slate-950">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Record type
          <select name="entity" defaultValue={entity} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="all">All record types</option>
            {entityOptions.map((value) => <option key={value} value={value}>{title(value)}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Action
          <div className="mt-2 flex gap-2">
            <select name="action" defaultValue={action} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="all">All actions</option>
              {actionOptions.map((value) => <option key={value} value={value}>{title(value)}</option>)}
            </select>
            <button className="rounded-xl bg-[#103d2e] px-4 py-2.5 text-sm font-black text-white">Filter</button>
          </div>
        </label>
      </form>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-black text-slate-950 dark:text-white">Recent activity</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">Showing up to the latest 250 matching entries.</p>
        </div>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">No audit entries match these filters yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:bg-slate-900/70">
                <tr><th className="px-5 py-3">When</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Record</th><th className="px-5 py-3">User</th><th className="px-5 py-3">Details</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">{formatDateTime(row.created_at, regional)}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{title(row.action)}</span></td>
                    <td className="px-5 py-4"><p className="font-black text-slate-950 dark:text-white">{row.entity_reference || row.entity_id || "—"}</p><p className="mt-1 text-xs font-semibold text-slate-500">{title(row.entity_type)}</p></td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{row.user_id ? row.user_id.slice(0, 8) : "System"}</td>
                    <td className="max-w-md px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">{row.metadata && Object.keys(row.metadata).length ? JSON.stringify(row.metadata) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
