"use client";

import { useEffect, useMemo, useState } from "react";

type ModuleItem = {
  key: string;
  name: string;
  description: string;
  category: "core" | "operations" | "commercial" | "intelligence" | "enterprise" | "administration";
  locked?: boolean;
  dependencies?: string[];
  entitled: boolean;
  enabled: boolean;
};

type ResponseBody = { billingMode?: string; plan?: string; modules?: ModuleItem[]; error?: string };

const labels: Record<ModuleItem["category"], string> = {
  core: "Core platform",
  operations: "Operations",
  commercial: "Commercial",
  intelligence: "Intelligence",
  enterprise: "Enterprise",
  administration: "Administration",
};

export default function ModuleSettingsClient() {
  const [data, setData] = useState<ResponseBody>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/settings/modules", { cache: "no-store" });
      const body = (await response.json()) as ResponseBody;
      if (!response.ok) throw new Error(body.error || "Unable to load modules.");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load modules.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const groups = useMemo(() => {
    const map = new Map<ModuleItem["category"], ModuleItem[]>();
    for (const module of data.modules ?? []) map.set(module.category, [...(map.get(module.category) ?? []), module]);
    return map;
  }, [data.modules]);

  async function toggle(module: ModuleItem) {
    setBusy(module.key); setError(""); setNotice("");
    try {
      const response = await fetch("/api/settings/modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureKey: module.key, enabled: !module.enabled }) });
      const body = (await response.json()) as ResponseBody;
      if (!response.ok) throw new Error(body.error || "Unable to update module.");
      setData(body);
      setNotice(`${module.name} ${module.enabled ? "disabled" : "enabled"}. Navigation updates on refresh.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update module.");
    } finally { setBusy(""); }
  }

  return (
    <main className="min-h-dvh w-full min-w-0">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-emerald-700">Administration · Modules</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Build the AgriCore your business needs</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">Your subscription decides which modules are available. You decide which entitled modules are visible and active. Roles and depot scopes still control what each user can access inside an enabled module.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Current plan</p>
            <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{data.plan || "Loading…"}</p>
          </div>
        </header>

        {error ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div> : null}
        {notice ? <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{notice}</div> : null}

        {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 dark:border-slate-800 dark:bg-slate-950">Loading company modules…</div> : (
          <div className="space-y-8">
            {Array.from(groups.entries()).map(([category, modules]) => (
              <section key={category}>
                <div className="mb-3 flex items-center gap-3"><h2 className="text-lg font-black text-slate-950 dark:text-white">{labels[category]}</h2><span className="text-xs font-bold text-slate-400">{modules.filter((item) => item.enabled).length}/{modules.length} active</span></div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {modules.map((module) => (
                    <article key={module.key} className={`rounded-2xl border p-5 ${module.enabled ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/10" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div><h3 className="font-black text-slate-950 dark:text-white">{module.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{module.description}</p></div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${module.enabled ? "bg-emerald-700 text-white" : module.entitled ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>{module.enabled ? "Active" : module.entitled ? "Off" : "Upgrade"}</span>
                      </div>
                      {module.dependencies?.length ? <p className="mt-3 text-xs text-slate-500">Depends on: {module.dependencies.join(", ")}</p> : null}
                      <button type="button" disabled={Boolean(module.locked) || !module.entitled || busy === module.key} onClick={() => void toggle(module)} className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-800 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-100">{module.locked ? "Core module" : !module.entitled ? "Not in current plan" : busy === module.key ? "Saving…" : module.enabled ? "Disable module" : "Enable module"}</button>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
