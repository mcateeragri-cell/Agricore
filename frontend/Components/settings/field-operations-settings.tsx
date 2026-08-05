"use client";

import { useEffect, useState } from "react";
import type { FieldOperationsSettings } from "@/lib/field-operations-settings";
import { DEFAULT_FIELD_OPERATIONS_SETTINGS } from "@/lib/field-operations-settings";

const OPTIONS: Array<{ key: keyof FieldOperationsSettings; title: string; description: string }> = [
  { key: "gpsEnabled", title: "GPS event capture", description: "Capture coordinates when technicians start travel, arrive and complete journeys." },
  { key: "returnJourneyEnabled", title: "Return journey workflow", description: "Offer technicians the optional Start Return Journey and Return Complete workflow." },
  { key: "dispatchLocationEnabled", title: "Live dispatch location", description: "Show the latest captured technician location and Google Maps link on Dispatch." },
  { key: "automaticStatusEnabled", title: "Automatic technician statuses", description: "Update Travelling, Working and Completed statuses from field actions." },
  { key: "travelTimeEnabled", title: "Travel-time recording", description: "Allow outward and return travel sessions and calculate journey duration." },
  { key: "travelCostingEnabled", title: "Travel costing", description: "Enable travel charges during office review and invoice preparation." },
  { key: "jobTimelineEnabled", title: "Job timeline", description: "Retain journey and work events in the job activity history." },
  { key: "technicianSummaryEnabled", title: "Technician daily summary", description: "Show daily travel, labour and job totals in the technician portal." },
];

export default function FieldOperationsSettingsForm() {
  const [settings, setSettings] = useState<FieldOperationsSettings>(DEFAULT_FIELD_OPERATIONS_SETTINGS);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/settings/field-operations", { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to load field operations settings.");
        setSettings(body.settings ?? DEFAULT_FIELD_OPERATIONS_SETTINGS);
        setCanManage(Boolean(body.canManage));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load field operations settings.");
      } finally { setLoading(false); }
    })();
  }, []);

  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/settings/field-operations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save settings.");
      setMessage("Field operations settings saved for this company.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save settings.");
    } finally { setSaving(false); }
  }

  if (loading) return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Loading field operations settings…</section>;

  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Field operations</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Company feature controls</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Turn each field function on or off for the active company. Existing journey and GPS history is retained when a feature is disabled.</p>
      </div>
      <button type="button" disabled={!canManage || saving} onClick={() => void save()} className="rounded-xl bg-[#103d2e] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Save features"}</button>
    </div>
    {message ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p> : null}
    {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p> : null}
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      {OPTIONS.map((option) => <label key={option.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 hover:border-emerald-300">
        <span><span className="block font-semibold text-slate-950">{option.title}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{option.description}</span></span>
        <input type="checkbox" checked={settings[option.key]} disabled={!canManage} onChange={(event) => setSettings((current) => ({ ...current, [option.key]: event.target.checked }))} className="mt-1 h-5 w-5 accent-[#103d2e]" />
      </label>)}
    </div>
    {!canManage ? <p className="mt-4 text-sm text-amber-700">You can view these settings, but only users with company settings permission can change them.</p> : null}
  </section>;
}
