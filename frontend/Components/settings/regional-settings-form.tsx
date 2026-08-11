"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COUNTRY_PROFILES,
  formatCurrency,
  formatDateTime,
  normaliseRegionalSettings,
  type CountryProfile,
  type RegionalSettings,
} from "@/lib/regional-settings";

type ResponseShape = {
  settings: RegionalSettings;
  profiles: CountryProfile[];
  error?: string;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-900/30";

export default function RegionalSettingsForm() {
  const [settings, setSettings] = useState<RegionalSettings>(normaliseRegionalSettings(undefined));
  const [profiles, setProfiles] = useState<CountryProfile[]>(Object.values(COUNTRY_PROFILES));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/regional", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as ResponseShape;
        if (!response.ok) throw new Error(payload.error || "Unable to load regional settings.");
        if (active) {
          setSettings(normaliseRegionalSettings(payload.settings));
          if (Array.isArray(payload.profiles)) setProfiles(payload.profiles);
        }
      })
      .catch((error) => active && setMessage(error instanceof Error ? error.message : "Unable to load regional settings."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const example = useMemo(() => {
    return `${formatCurrency(1250.5, settings)} · ${formatDateTime(new Date("2026-08-10T14:30:00Z"), settings)}`;
  }, [settings]);

  function applyCountry(countryCode: string) {
    const profile = profiles.find((entry) => entry.country_code === countryCode) ?? COUNTRY_PROFILES.GB;
    setSettings({ ...profile });
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/settings/regional", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as ResponseShape;
      if (!response.ok) throw new Error(payload.error || "Unable to save regional settings.");
      setSettings(normaliseRegionalSettings(payload.settings));
      setMessage("Regional settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save regional settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Global foundation</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">Regional settings</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            UK defaults are applied automatically. Change these settings for companies operating in other countries without changing the rest of AgriCore.
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Preview: {example}
        </div>
      </div>

      {message ? <div className="mt-5 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">{message}</div> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-semibold">Country
          <select disabled={loading} className={inputClass} value={settings.country_code} onChange={(event) => applyCountry(event.target.value)}>
            {profiles.map((profile) => <option key={profile.country_code} value={profile.country_code}>{profile.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Base currency
          <input className={inputClass} maxLength={3} value={settings.currency_code} onChange={(event) => setSettings((value) => ({ ...value, currency_code: event.target.value.toUpperCase() }))} />
        </label>
        <label className="text-sm font-semibold">Locale
          <input className={inputClass} value={settings.locale} onChange={(event) => setSettings((value) => ({ ...value, locale: event.target.value }))} />
        </label>
        <label className="text-sm font-semibold">Time zone
          <input className={inputClass} value={settings.timezone} onChange={(event) => setSettings((value) => ({ ...value, timezone: event.target.value }))} />
        </label>
        <label className="text-sm font-semibold">Tax name
          <input className={inputClass} value={settings.tax_name} onChange={(event) => setSettings((value) => ({ ...value, tax_name: event.target.value }))} />
        </label>
        <label className="text-sm font-semibold">Default tax rate (%)
          <input type="number" min="0" max="100" step="0.001" className={inputClass} value={settings.default_tax_rate} onChange={(event) => setSettings((value) => ({ ...value, default_tax_rate: Number(event.target.value) }))} />
        </label>
        <label className="text-sm font-semibold">Date format
          <input className={inputClass} value={settings.date_format} onChange={(event) => setSettings((value) => ({ ...value, date_format: event.target.value }))} />
        </label>
        <label className="text-sm font-semibold">Time format
          <select className={inputClass} value={settings.time_format} onChange={(event) => setSettings((value) => ({ ...value, time_format: event.target.value === "12" ? "12" : "24" }))}>
            <option value="24">24-hour</option><option value="12">12-hour</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Week starts
          <select className={inputClass} value={settings.week_start} onChange={(event) => setSettings((value) => ({ ...value, week_start: event.target.value as RegionalSettings["week_start"] }))}>
            <option value="monday">Monday</option><option value="sunday">Sunday</option><option value="saturday">Saturday</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Measurement system
          <select className={inputClass} value={settings.measurement_system} onChange={(event) => setSettings((value) => ({ ...value, measurement_system: event.target.value === "imperial" ? "imperial" : "metric" }))}>
            <option value="metric">Metric</option><option value="imperial">Imperial</option>
          </select>
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" disabled={loading || saving} onClick={save} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50">
          {saving ? "Saving..." : "Save regional settings"}
        </button>
      </div>
    </section>
  );
}
