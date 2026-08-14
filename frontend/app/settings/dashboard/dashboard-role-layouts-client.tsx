"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, LayoutDashboard, RotateCcw, Save } from "lucide-react";

import {
  DASHBOARD_PRESET_SCOPES,
  DASHBOARD_WIDGETS,
  type DashboardLayoutItem,
  type DashboardPresetScope,
  type DashboardSize,
} from "@/lib/dashboard/widget-registry";

type Preset = {
  key: DashboardPresetScope;
  label: string;
  description: string;
  saved: boolean;
  layout: DashboardLayoutItem[];
  allowUserCustomisation: boolean;
  inheritedFrom: string | null;
  updatedAt: string | null;
};

type ApiResponse = { presets?: Preset[]; error?: string };

export default function DashboardRoleLayoutsClient() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedKey, setSelectedKey] = useState<DashboardPresetScope>("company_default");
  const [draft, setDraft] = useState<DashboardLayoutItem[]>([]);
  const [allowCustom, setAllowCustom] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(() => presets.find((preset) => preset.key === selectedKey) ?? null, [presets, selectedKey]);

  async function load(preferredKey?: DashboardPresetScope) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/settings/dashboard-layouts", { cache: "no-store" });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(body.error || "Unable to load dashboard layouts.");
      const next = body.presets ?? [];
      setPresets(next);
      const key = preferredKey ?? selectedKey;
      const active = next.find((preset) => preset.key === key) ?? next[0];
      if (active) {
        setSelectedKey(active.key);
        setDraft(active.layout);
        setAllowCustom(active.allowUserCustomisation);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load dashboard layouts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load("company_default"); }, []);

  function selectPreset(key: DashboardPresetScope) {
    const preset = presets.find((item) => item.key === key);
    setSelectedKey(key);
    setDraft(preset?.layout ?? []);
    setAllowCustom(preset?.allowUserCustomisation ?? true);
    setNotice("");
    setError("");
  }

  function updateItem(id: string, patch: Partial<DashboardLayoutItem>) {
    setDraft((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function moveItem(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/settings/dashboard-layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeKey: selectedKey, layout: draft, allowUserCustomisation: allowCustom }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save dashboard preset.");
      setNotice("Dashboard preset saved.");
      await load(selectedKey);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save dashboard preset.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/settings/dashboard-layouts?scopeKey=${encodeURIComponent(selectedKey)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to reset dashboard preset.");
      setNotice(selectedKey === "company_default" ? "Company default reset to AgriCore defaults." : "Role preset reset to its inherited dashboard.");
      await load(selectedKey);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reset dashboard preset.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950">Loading dashboard layouts…</div>;
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="px-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Dashboard presets</p>
          <div className="mt-3 space-y-1">
            {DASHBOARD_PRESET_SCOPES.map((scope) => {
              const preset = presets.find((item) => item.key === scope.key);
              const active = selectedKey === scope.key;
              return (
                <button key={scope.key} type="button" onClick={() => selectPreset(scope.key)} className={`w-full rounded-xl px-3 py-3 text-left transition ${active ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-100 dark:ring-emerald-900" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black">{scope.label}</span>
                    {preset?.saved ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Custom</span> : null}
                  </div>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{scope.description}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            Technician and Apprentice use the dedicated field dashboard and are intentionally not managed here.
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Role dashboard</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-950 dark:text-white"><LayoutDashboard className="h-6 w-6" /> {selected?.label ?? "Dashboard"}</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{selected?.description}</p>
              {selected?.inheritedFrom ? <p className="mt-2 text-xs font-bold text-slate-400">Currently inherited from {selected.inheritedFrom === "company_default" ? "Company default" : "AgriCore system defaults"}.</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void reset()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"><RotateCcw className="h-4 w-4" /> Reset</button>
              <button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-[#103D2E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> {busy ? "Saving…" : "Save preset"}</button>
            </div>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <input type="checkbox" checked={allowCustom} onChange={(event) => setAllowCustom(event.target.checked)} className="mt-1" />
            <span><span className="block text-sm font-black text-slate-950 dark:text-white">Allow users in this role to customise their own dashboard</span><span className="mt-1 block text-xs font-medium leading-5 text-slate-500">Turn this off when you want everyone in the role to use the managed company layout exactly as configured here.</span></span>
          </label>

          <div className="mt-5 space-y-3">
            {draft.map((item, index) => {
              const widget = DASHBOARD_WIDGETS.find((entry) => entry.id === item.id);
              if (!widget) return null;
              return (
                <div key={item.id} className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-[minmax(0,1fr)_170px_auto] md:items-center">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" checked={item.visible} onChange={(event) => updateItem(item.id, { visible: event.target.checked })} className="mt-1" />
                    <span><span className="block text-sm font-black text-slate-950 dark:text-white">{widget.label}</span><span className="mt-1 block text-xs font-medium leading-5 text-slate-500">{widget.description}</span>{widget.financial ? <span className="mt-1 inline-block text-[10px] font-black uppercase tracking-wide text-amber-700">Financial permission required</span> : null}</span>
                  </label>
                  <select value={item.size} onChange={(event) => updateItem(item.id, { size: event.target.value as DashboardSize })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-900">
                    <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="full">Full width</option>
                  </select>
                  <div className="flex gap-2 md:justify-end">
                    <button type="button" disabled={index === 0} onClick={() => moveItem(item.id, -1)} className="rounded-lg border border-slate-300 p-2 disabled:opacity-30 dark:border-slate-700" aria-label={`Move ${widget.label} up`}><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" disabled={index === draft.length - 1} onClick={() => moveItem(item.id, 1)} className="rounded-lg border border-slate-300 p-2 disabled:opacity-30 dark:border-slate-700" aria-label={`Move ${widget.label} down`}><ArrowDown className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
