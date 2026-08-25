"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CompanyRole =
  | "company_admin"
  | "administrator"
  | "service_manager"
  | "office"
  | "parts_manager"
  | "technician"
  | "apprentice"
  | "read_only";

type RolesResponse = {
  company?: { id: string; name: string };
  roles?: CompanyRole[];
  permissions?: string[];
  matrix?: Record<CompanyRole, string[]>;
  lockedRoles?: CompanyRole[];
  error?: string;
};

const ROLE_LABELS: Record<CompanyRole, string> = {
  company_admin: "Company Administrator",
  administrator: "Administrator",
  service_manager: "Service Manager",
  office: "Office",
  parts_manager: "Parts Manager",
  technician: "Technician",
  apprentice: "Apprentice",
  read_only: "Read Only",
};

const GROUPS = [
  {
    label: "Users and administration",
    permissions: [
      ["users.view", "View users"],
      ["users.manage_all", "Manage all users"],
      ["users.manage_technicians", "Manage technicians and apprentices"],
      ["roles.manage", "Manage roles and permissions"],
      ["settings.manage", "Manage company settings"],
    ],
  },
  {
    label: "Service templates",
    permissions: [
      ["service_templates.view", "View service templates"],
      ["service_templates.manage", "Create and edit service templates"],
      ["service_templates.approve", "Approve service templates"],
    ],
  },
  {
    label: "Technician tools",
    permissions: [
      ["service_programmes.view", "View service programmes"],
      ["service_programmes.manage", "Create and manage service programmes"],
      ["ai_diagnostics.use", "Use AI diagnostics"],
    ],
  },
  {
    label: "Customers, machines and jobs",
    permissions: [
      ["customers.edit", "Edit customers"],
      ["machines.edit", "Edit machines"],
      ["jobs.view_all", "View all jobs"],
      ["jobs.assign", "Assign jobs"],
      ["jobs.edit", "Edit jobs"],
      ["jobs.review", "Review completed jobs"],
    ],
  },
  {
    label: "Sales & commercial",
    permissions: [
      ["sales.view", "View machinery sales"],
      ["sales.manage", "Manage machinery sales pipeline, dealer stock and trade-ins"],
      ["quotes.view", "View departmental quotes"],
      ["quotes.manage", "Create and manage departmental quotes"],
      ["invoices.view", "View departmental invoices"],
      ["invoices.manage", "Create and manage departmental invoices"],
      ["commercial.view_all", "View all departments' quotes and invoices"],
    ],
  },
  {
    label: "Parts",
    permissions: [
      ["stock.view", "View stock and parts"],
      ["stock.manage", "Manage stock, suppliers and purchasing"],
      ["parts.sales", "Create parts-only quotes and invoices"],
    ],
  },
  {
    label: "Calendar",
    permissions: [
      ["calendar.manage", "Manage calendar"],
    ],
  },
] as const;

export default function RolesPermissionsManager() {
  const [data, setData] = useState<RolesResponse | null>(null);
  const [selectedRole, setSelectedRole] = useState<CompanyRole>("administrator");
  const [draft, setDraft] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/administration/roles", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = (await response.json()) as RolesResponse;
      if (!response.ok) throw new Error(result.error || "Unable to load roles.");
      setData(result);
      setDraft(result.matrix?.[selectedRole] ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load roles.");
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setDraft(data?.matrix?.[selectedRole] ?? []);
    setMessage("");
    setError("");
  }, [data, selectedRole]);

  const locked = data?.lockedRoles?.includes(selectedRole) ?? false;
  const selected = useMemo(() => new Set(draft), [draft]);

  function toggle(permission: string) {
    if (locked || saving) return;
    setDraft((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
    setMessage("");
  }

  async function save() {
    if (locked) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/administration/roles", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, permissions: draft }),
      });
      const result = (await response.json()) as RolesResponse;
      if (!response.ok) throw new Error(result.error || "Unable to save permissions.");
      setData((current) => current?.matrix ? {
        ...current,
        matrix: { ...current.matrix, [selectedRole]: [...draft] },
      } : current);
      setMessage(`${ROLE_LABELS[selectedRole]} permissions saved.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save permissions.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">Loading roles and permissions…</section>;
  }

  if (error && !data) {
    return <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</section>;
  }

  const roles = data?.roles ?? [];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Company roles</p>
        <div className="space-y-1">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`w-full rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${selectedRole === role ? "bg-emerald-700 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between dark:border-slate-700">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{data?.company?.name}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{ROLE_LABELS[selectedRole]}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {locked
                ? "This role has permanent full company access and is protected."
                : "Choose exactly what users assigned to this role can access."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={locked || saving}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : locked ? "Protected role" : "Save permissions"}
          </button>
        </div>

        {message && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}

        <div className="mt-6 space-y-7">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{group.label}</h3>
              <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {group.permissions.map(([key, label]) => {
                  const enabled = selected.has(key);
                  return (
                    <label key={key} className={`flex items-center justify-between gap-4 px-4 py-4 ${locked ? "cursor-default" : "cursor-pointer"}`}>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{key}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={locked || saving}
                        onChange={() => toggle(key)}
                        className="h-5 w-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
