"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DemoCompany = {
  id: string;
  company_name: string;
  slug: string;
  created_at: string | null;
  is_active: boolean | null;
  business_type?: string | null;
};

type DemoProfile = { key: string; label: string; description: string };

export default function DemoCompaniesClient() {
  const [companies, setCompanies] = useState<DemoCompany[]>([]);
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  const [maxWorkspaces, setMaxWorkspaces] = useState(5);
  const [profile, setProfile] = useState("medium");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/platform/demo-companies", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load demo companies.");
      setCompanies(body.companies ?? []);
      setProfiles(body.profiles ?? []);
      setMaxWorkspaces(Number(body.maxWorkspaces ?? 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load demo companies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const atLimit = companies.length >= maxWorkspaces;
  const selectedProfile = useMemo(() => profiles.find((item) => item.key === profile), [profiles, profile]);

  async function act(action: "create" | "reset" | "delete" | "duplicate", companyId?: string) {
    if (action === "delete" && !window.confirm("Permanently delete this demo workspace and all of its synthetic sample data?")) return;
    if (action === "reset" && !window.confirm("Regenerate this demo workspace? Its current synthetic data and company identity will be replaced.")) return;

    setBusy(companyId ? `${action}:${companyId}` : action);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/platform/demo-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, companyId, profile }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Demo company operation failed.");

      if (action === "create") {
        setMessage(`Demo created: ${body.company?.company_name ?? "workspace"} with ${body.counts?.customers ?? 0} customers, ${body.counts?.machines ?? 0} machines and ${body.counts?.jobs ?? 0} jobs.`);
      } else if (action === "duplicate") {
        setMessage(`Fresh synthetic demo created from the ${body.counts?.profileLabel ?? "selected"} profile.`);
      } else if (action === "reset") {
        setMessage(`Demo regenerated as ${body.company?.company_name ?? "a new synthetic company"}. All sample records were refreshed.`);
      } else {
        setMessage("Demo workspace deleted safely.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo company operation failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Sales & testing</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Demo workspaces</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Generate completely synthetic agricultural engineering businesses for demonstrations, screenshots and release testing. Customer identities, machine registrations and serial numbers are regenerated and never copied from real customer records.
          </p>
        </div>

        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
            Demo size
            <select
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold normal-case tracking-normal text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {profiles.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => void act("create")}
            disabled={Boolean(busy) || atLimit}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "create" ? "Creating demo…" : "+ Create demo"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>{selectedProfile?.description ?? "Choose a demo profile."}</span>
        <span className="font-black text-slate-900 dark:text-slate-100">{companies.length} / {maxWorkspaces} workspaces</span>
      </div>

      {atLimit && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Demo workspace limit reached. Delete an old demo before creating or duplicating another.
        </div>
      )}
      {message && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</div>}
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-black text-slate-950 dark:text-white">Available demo workspaces</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">Synthetic data only</span>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading demo companies…</p>
        ) : companies.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-bold text-slate-900 dark:text-white">No demo workspace yet</p>
            <p className="mt-2 text-sm text-slate-500">Choose a profile above and create a procedurally generated company.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {companies.map((company) => {
              const resetBusy = busy === `reset:${company.id}`;
              const deleteBusy = busy === `delete:${company.id}`;
              const duplicateBusy = busy === `duplicate:${company.id}`;
              return (
                <div key={company.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-slate-950 dark:text-white">{company.company_name}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">Demo</span>
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">{company.business_type || "Agricultural engineering"} · {company.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void act("reset", company.id)}
                      disabled={Boolean(busy)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {resetBusy ? "Regenerating…" : "Regenerate"}
                    </button>
                    <button
                      onClick={() => void act("duplicate", company.id)}
                      disabled={Boolean(busy) || atLimit}
                      className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                    >
                      {duplicateBusy ? "Creating…" : "Create similar"}
                    </button>
                    <button
                      onClick={() => void act("delete", company.id)}
                      disabled={Boolean(busy)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      {deleteBusy ? "Deleting…" : "Delete demo"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          "Procedural company identity & branding",
          "Synthetic customers, registrations & serials",
          "Variable jobs, quotes, invoices & KPIs",
          "Dependency-safe reset & deletion",
        ].map((text) => (
          <div key={text} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">✓ {text}</div>
        ))}
      </section>
    </>
  );
}
