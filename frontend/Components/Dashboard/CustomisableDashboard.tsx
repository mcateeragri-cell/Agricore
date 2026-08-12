"use client";

import { useEffect, useMemo, useState } from "react";
import { GripVertical, LayoutDashboard, RotateCcw, Settings2, X } from "lucide-react";

import ExecutiveSummary from "./ExecutiveSummary";
import QuickActions from "./QuickActions";
import RecentActivity from "./RecentActivity";
import RecentJobs from "./RecentJobs";
import RevenueTrend from "./RevenueTrend";
import Schedule from "./Schedule";
import ServiceDueSummary from "./ServiceDueSummary";
import TeamStatus from "./TeamStatus";
import AtlasIntelligenceSummary from "./AtlasIntelligenceSummary";

type Size = "small" | "medium" | "large" | "full";
type LayoutItem = { id: string; visible: boolean; size: Size };
type LayoutResponse = { layout?: LayoutItem[]; error?: string };

type WidgetDefinition = {
  id: string;
  label: string;
  description: string;
  defaultSize: Size;
  financial?: boolean;
};

const WIDGETS: WidgetDefinition[] = [
  { id: "executive_summary", label: "Executive summary", description: "Key workload and financial KPI cards.", defaultSize: "full" },
  { id: "revenue_trend", label: "Revenue trend", description: "Revenue performance over time.", defaultSize: "large", financial: true },
  { id: "team_status", label: "Team status", description: "Engineer availability and current workload.", defaultSize: "medium" },
  { id: "recent_jobs", label: "Recent jobs", description: "Latest work activity and job status.", defaultSize: "large" },
  { id: "recent_activity", label: "Recent activity", description: "Latest company activity and changes.", defaultSize: "medium" },
  { id: "service_due", label: "Service due", description: "Upcoming preventative maintenance and services.", defaultSize: "full" },
  { id: "schedule", label: "Schedule", description: "Upcoming planned work and appointments.", defaultSize: "large" },
  { id: "quick_actions", label: "Quick actions", description: "Shortcuts for frequently used actions.", defaultSize: "medium" },
  { id: "atlas_intelligence", label: "AgriCore Intelligence", description: "Service forecasts, recurring patterns and business advice.", defaultSize: "medium", financial: true },
];

const DEFAULT_LAYOUT: LayoutItem[] = WIDGETS.map((widget) => ({
  id: widget.id,
  visible: true,
  size: widget.defaultSize,
}));

function mergeLayout(saved: LayoutItem[]) {
  const byId = new Map(saved.map((item) => [item.id, item]));
  const ordered = saved.filter((item) => WIDGETS.some((widget) => widget.id === item.id));
  for (const fallback of DEFAULT_LAYOUT) {
    if (!byId.has(fallback.id)) ordered.push(fallback);
  }
  return ordered;
}

function spanClass(size: Size) {
  if (size === "small") return "xl:col-span-4";
  if (size === "medium") return "xl:col-span-5";
  if (size === "large") return "xl:col-span-7";
  return "xl:col-span-12";
}

export default function CustomisableDashboard({
  canViewMoney,
  enabled,
  atlasEnabled,
}: {
  canViewMoney: boolean;
  enabled: boolean;
  atlasEnabled: boolean;
}) {
  const [layout, setLayout] = useState<LayoutItem[]>(DEFAULT_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/dashboard/layout", { cache: "no-store" });
        const body = (await response.json()) as LayoutResponse;
        if (!response.ok) throw new Error(body.error || "Unable to load dashboard layout.");
        if (!cancelled && body.layout?.length) setLayout(mergeLayout(body.layout));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load dashboard layout.");
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  const availableWidgets = useMemo(
    () => WIDGETS.filter((widget) =>
      (canViewMoney || !widget.financial) &&
      (widget.id !== "atlas_intelligence" || atlasEnabled),
    ),
    [atlasEnabled, canViewMoney],
  );

  const visibleItems = layout.filter((item) => {
    const definition = WIDGETS.find((widget) => widget.id === item.id);
    return item.visible && definition &&
      (canViewMoney || !definition.financial) &&
      (item.id !== "atlas_intelligence" || atlasEnabled);
  });

  function updateItem(id: string, patch: Partial<LayoutItem>) {
    setLayout((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function moveItem(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setLayout((current) => {
      const sourceIndex = current.findIndex((item) => item.id === draggedId);
      const targetIndex = current.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function saveLayout() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });
      const body = (await response.json()) as LayoutResponse;
      if (!response.ok) throw new Error(body.error || "Unable to save dashboard layout.");
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save dashboard layout.");
    } finally {
      setSaving(false);
    }
  }

  function renderWidget(id: string) {
    if (id === "executive_summary") return <ExecutiveSummary showFinancialCards={canViewMoney} />;
    if (id === "revenue_trend") return canViewMoney ? <RevenueTrend /> : null;
    if (id === "team_status") return <TeamStatus />;
    if (id === "recent_jobs") return <RecentJobs />;
    if (id === "recent_activity") return <RecentActivity />;
    if (id === "service_due") return <ServiceDueSummary />;
    if (id === "schedule") return <Schedule />;
    if (id === "quick_actions") return <QuickActions showFinancialActions={canViewMoney} />;
    if (id === "atlas_intelligence") return canViewMoney ? <AtlasIntelligenceSummary /> : null;
    return null;
  }

  return (
    <>
      {enabled ? (
        <div className="mb-4 flex items-center justify-end gap-3">
          {error ? <p className="mr-auto text-xs font-semibold text-amber-700 dark:text-amber-300">{error}</p> : null}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Settings2 className="h-4 w-4" />
            Customise dashboard
          </button>
        </div>
      ) : null}

      <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
        {visibleItems.map((item) => (
          <div key={item.id} className={`min-w-0 ${spanClass(item.size)}`}>
            {renderWidget(item.id)}
          </div>
        ))}
      </section>

      {editing ? (
        <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/45 backdrop-blur-sm" onMouseDown={() => setEditing(false)}>
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-950" onMouseDown={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400">Dashboard builder</p>
                <h2 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-950 dark:text-white"><LayoutDashboard className="h-6 w-6" /> Your workshop dashboard</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">Drag widgets to reorder them, choose a width, or hide anything you do not use. Your layout follows you across devices.</p>
              </div>
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"><X className="h-5 w-5" /></button>
            </header>

            <div className="mt-5 space-y-3">
              {layout.filter((item) => availableWidgets.some((widget) => widget.id === item.id)).map((item) => {
                const definition = WIDGETS.find((widget) => widget.id === item.id)!;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedId(item.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveItem(item.id)}
                    className={`rounded-2xl border p-4 transition ${draggedId === item.id ? "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"}`}
                  >
                    <div className="flex items-start gap-3">
                      <button type="button" className="mt-1 cursor-grab text-slate-400" aria-label={`Reorder ${definition.label}`}><GripVertical className="h-5 w-5" /></button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-950 dark:text-white">{definition.label}</p>
                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{definition.description}</p>
                          </div>
                          <label className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
                            <input type="checkbox" checked={item.visible} onChange={(event) => updateItem(item.id, { visible: event.target.checked })} className="h-4 w-4 accent-emerald-700" />
                            Show
                          </label>
                        </div>
                        <label className="mt-3 block text-xs font-black uppercase tracking-wide text-slate-500">
                          Width
                          <select value={item.size} onChange={(event) => updateItem(item.id, { size: event.target.value as Size })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                            <option value="full">Full width</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <footer className="sticky bottom-0 mt-6 flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-950">
              <button type="button" onClick={() => setLayout(DEFAULT_LAYOUT)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"><RotateCcw className="h-4 w-4" /> Reset</button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
                <button type="button" disabled={saving} onClick={() => void saveLayout()} className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Save layout"}</button>
              </div>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}
