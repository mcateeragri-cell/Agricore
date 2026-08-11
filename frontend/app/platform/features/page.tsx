"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Feature = { feature_key: string; feature_name: string; description: string | null; default_enabled: boolean };
type Company = { id: string; company_name: string; is_active: boolean | null };
type Override = { company_id: string; feature_key: string; enabled: boolean };
type Payload = { features: Feature[]; companies: Company[]; overrides: Override[]; error?: string };

async function api(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in required.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  return fetch(path, { ...init, headers, cache: "no-store" });
}

export default function PlatformFeaturesPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const response = await api("/api/platform/features");
      const result = (await response.json()) as Payload;
      if (!response.ok) throw new Error(result.error || "Unable to load feature flags.");
      setData(result);
      setCompanyId((current) => current || result.companies[0]?.id || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load feature flags.");
    }
  }

  useEffect(() => { void load(); }, []);

  const overrideMap = useMemo(() => new Map((data?.overrides ?? []).map((row) => [`${row.company_id}:${row.feature_key}`, row.enabled])), [data?.overrides]);
  const company = data?.companies.find((row) => row.id === companyId) ?? null;

  async function toggle(feature: Feature) {
    if (!companyId) return;
    const key = `${companyId}:${feature.feature_key}`;
    const current = overrideMap.has(key) ? overrideMap.get(key)! : feature.default_enabled;
    setBusy(feature.feature_key);
    setError("");
    try {
      const response = await api("/api/platform/features", { method: "POST", body: JSON.stringify({ companyId, featureKey: feature.feature_key, enabled: !current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to update feature.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update feature.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl">
        <Link href="/platform" className="text-sm font-black text-emerald-700 dark:text-emerald-400">← Platform control centre</Link>
        <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Platform configuration</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Feature flags</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">Enable or disable modules per company without changing code. Existing platform defaults are used until you set a company override.</p>

        {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-xs font-black uppercase tracking-wide text-slate-500">Company</label>
          <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            {(data?.companies ?? []).map((row) => <option key={row.id} value={row.id}>{row.company_name}{row.is_active === false ? " (inactive)" : ""}</option>)}
          </select>
          {company ? <p className="mt-2 text-xs font-semibold text-slate-500">Managing features for {company.company_name}</p> : null}
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-2">
          {(data?.features ?? []).map((feature) => {
            const key = `${companyId}:${feature.feature_key}`;
            const overridden = overrideMap.has(key);
            const enabled = overridden ? overrideMap.get(key)! : feature.default_enabled;
            return (
              <article key={feature.feature_key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-black text-slate-950 dark:text-white">{feature.feature_name}</h2>
                    <p className="mt-1 text-xs font-mono text-slate-500">{feature.feature_key}</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{feature.description || "AgriCore module"}</p>
                  </div>
                  <button type="button" disabled={!companyId || busy === feature.feature_key} onClick={() => void toggle(feature)} className={`min-w-24 rounded-full px-4 py-2 text-xs font-black transition disabled:opacity-50 ${enabled ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                    {busy === feature.feature_key ? "Saving…" : enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-500">{overridden ? "Company override" : `Using platform default: ${feature.default_enabled ? "enabled" : "disabled"}`}</p>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
