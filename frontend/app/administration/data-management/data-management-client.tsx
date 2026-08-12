"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type EntityKey = "jobs" | "customers" | "machines" | "quotes" | "invoices" | "stock" | "users";
type Row = {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  meta?: string;
  protected?: boolean;
  protectionReason?: string;
};

type ListResponse = {
  rows?: Row[];
  error?: string;
};

type ActionResponse = {
  success?: boolean;
  processed?: number;
  failed?: Array<{ id: string; error: string }>;
  error?: string;
};

const tabs: Array<{ key: EntityKey; label: string; help: string }> = [
  { key: "jobs", label: "Jobs", help: "Bulk-remove test jobs. Jobs linked to invoices are protected." },
  { key: "customers", label: "Customers", help: "Customers with linked business records are protected from permanent deletion." },
  { key: "machines", label: "Machines", help: "Machines with job, quote or invoice history are protected." },
  { key: "quotes", label: "Quotes", help: "Only draft, rejected or cancelled quotations can be permanently deleted." },
  { key: "invoices", label: "Invoices", help: "Only draft invoices can be deleted. Sent or paid accounting records remain protected." },
  { key: "stock", label: "Stock", help: "Archive stock items instead of deleting movement history." },
  { key: "users", label: "Users", help: "Deactivate a company membership without deleting the person's authentication account." },
];

function escapeCsv(value: string) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export default function DataManagementClient() {
  const [entity, setEntity] = useState<EntityKey>("jobs");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const activeTab = tabs.find((tab) => tab.key === entity) ?? tabs[0];

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/administration/data-management?entity=${entity}`, { cache: "no-store" });
      const payload = (await response.json()) as ListResponse;
      if (!response.ok) throw new Error(payload.error || "Unable to load records.");
      setRows(payload.rows ?? []);
      setSelected(new Set());
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => { void loadRows(); }, [loadRows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => [row.primary, row.secondary, row.status, row.meta].join(" ").toLowerCase().includes(query));
  }, [rows, search]);

  const selectableRows = filteredRows.filter((row) => !row.protected);
  const allVisibleSelected = selectableRows.length > 0 && selectableRows.every((row) => selected.has(row.id));

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) selectableRows.forEach((row) => next.delete(row.id));
      else selectableRows.forEach((row) => next.add(row.id));
      return next;
    });
  }

  async function runAction(action: "delete" | "archive" | "deactivate") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    const verb = action === "delete" ? "permanently delete" : action === "archive" ? "archive" : "deactivate";
    const confirmation = window.prompt(`You are about to ${verb} ${ids.length} ${entity} record${ids.length === 1 ? "" : "s"}.\n\nType DELETE to continue.`);
    if (confirmation !== "DELETE") return;

    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/administration/data-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, action, ids }),
      });
      const payload = (await response.json()) as ActionResponse;
      if (!response.ok) throw new Error(payload.error || "The data-management action failed.");
      const failedCount = payload.failed?.length ?? 0;
      setMessage(`${payload.processed ?? 0} record${payload.processed === 1 ? "" : "s"} processed${failedCount ? `; ${failedCount} protected or failed.` : "."}`);
      if (failedCount) setError(payload.failed!.map((item) => item.error).join(" "));
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The data-management action failed.");
    } finally {
      setWorking(false);
    }
  }

  function exportCsv() {
    const chosen = selected.size ? rows.filter((row) => selected.has(row.id)) : filteredRows;
    const csv = [
      ["ID", "Name", "Details", "Status", "Meta"].join(","),
      ...chosen.map((row) => [row.id, row.primary, row.secondary, row.status, row.meta ?? ""].map(escapeCsv).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `agricore-${entity}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const primaryAction = entity === "stock" ? "archive" : entity === "users" ? "deactivate" : "delete";
  const primaryLabel = entity === "stock" ? "Archive selected" : entity === "users" ? "Deactivate selected" : "Delete selected";

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-5 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Administration</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Data Management</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Clean development data, deactivate obsolete records and export company data. Financial history and linked records are protected automatically.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            Permanent deletion cannot be undone. For live customer data, prefer normal operational statuses and only use this area when you are certain a record should be removed.
          </div>
        </header>

        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => { setEntity(tab.key); setSearch(""); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${entity === tab.key ? "bg-[#103d2e] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeTab.label}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{activeTab.help}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportCsv} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">Export CSV</button>
              <button type="button" disabled={working || selected.size === 0} onClick={() => void runAction(primaryAction)} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{working ? "Working..." : primaryLabel}</button>
            </div>
          </div>

          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${activeTab.label.toLowerCase()}...`} className="w-full max-w-xl rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900" />
          </div>

          {message ? <div className="m-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">{message}</div> : null}
          {error ? <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</div> : null}

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading records...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/70">
                  <tr>
                    <th className="w-12 px-5 py-3 text-left"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all deletable records" /></th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Record</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Details</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Protection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                      <td className="px-5 py-4"><input type="checkbox" disabled={row.protected} checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} aria-label={`Select ${row.primary}`} /></td>
                      <td className="px-5 py-4"><div className="font-semibold text-slate-900 dark:text-slate-100">{row.primary}</div>{row.meta ? <div className="mt-1 text-xs text-slate-500">{row.meta}</div> : null}</td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{row.secondary || "—"}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{row.status || "—"}</span></td>
                      <td className="px-5 py-4 text-xs">{row.protected ? <span className="font-semibold text-amber-700 dark:text-amber-300">{row.protectionReason || "Protected"}</span> : <span className="font-semibold text-emerald-700 dark:text-emerald-300">Available</span>}</td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No records found.</td></tr> : null}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
