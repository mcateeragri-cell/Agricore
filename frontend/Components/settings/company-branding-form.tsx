"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { CompanySettings } from "@/app/api/_company/types";

type ApiResponse = {
  settings: CompanySettings;
  logoUrl: string | null;
};

const EMPTY: CompanySettings = {
  id: 1,
  company_name: "",
  contact_line: "",
  address_line_1: null,
  address_line_2: null,
  town_city: null,
  county: null,
  postcode: null,
  phone: null,
  email: null,
  website: null,
  vat_number: null,
  company_registration: null,
  logo_path: null,
  primary_colour: "#103D2E",
  secondary_colour: "#E8EFEA",
  invoice_footer: null,
  payment_terms_days: 7,
  bank_name: null,
  account_name: null,
  sort_code: null,
  account_number: null,
  updated_at: "",
};

export default function CompanyBrandingForm() {
  const [settings, setSettings] = useState<CompanySettings>(EMPTY);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/settings/company", {
        cache: "no-store",
      });
      const data = (await response.json()) as ApiResponse & { error?: string };

      if (!response.ok) throw new Error(data.error ?? "Unable to load settings");

      setSettings(data.settings);
      setLogoUrl(data.logoUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load settings");
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof CompanySettings>(
    key: K,
    value: CompanySettings[K]
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = (await response.json()) as {
        settings?: CompanySettings;
        error?: string;
      };

      if (!response.ok) throw new Error(data.error ?? "Unable to save settings");
      if (data.settings) setSettings(data.settings);

      setMessage("Company settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch("/api/settings/company/logo", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        logoUrl?: string | null;
        logoPath?: string;
        error?: string;
      };

      if (!response.ok) throw new Error(data.error ?? "Unable to upload logo");

      setLogoUrl(data.logoUrl ?? null);
      setSettings((current) => ({
        ...current,
        logo_path: data.logoPath ?? current.logo_path,
      }));
      setMessage("Logo uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload logo");
    } finally {
      event.target.value = "";
    }
  }

  async function removeLogo() {
    const response = await fetch("/api/settings/company/logo", {
      method: "DELETE",
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(data.error ?? "Unable to remove logo");
      return;
    }

    setLogoUrl(null);
    setSettings((current) => ({ ...current, logo_path: null }));
    setMessage("Logo removed.");
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading company settings…</p>;
  }

  const input =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
  const label = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Logo and colours</h2>

        <div className="mt-4 flex flex-wrap items-center gap-5">
          <div className="flex h-24 w-56 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Company logo"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-sm text-slate-500">No logo uploaded</span>
            )}
          </div>

          <div className="space-y-2">
            <label className="inline-flex cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              Upload logo
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={uploadLogo}
                className="hidden"
              />
            </label>

            {logoUrl && (
              <button
                type="button"
                onClick={removeLogo}
                className="ml-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Remove
              </button>
            )}

            <p className="text-xs text-slate-500">
              PNG is recommended. Maximum file size: 3 MB.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className={label}>Primary colour</span>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.primary_colour}
                onChange={(e) => update("primary_colour", e.target.value)}
                className="h-10 w-12 rounded border border-slate-300"
              />
              <input
                className={input}
                value={settings.primary_colour}
                onChange={(e) => update("primary_colour", e.target.value)}
              />
            </div>
          </label>

          <label>
            <span className={label}>Secondary colour</span>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.secondary_colour}
                onChange={(e) => update("secondary_colour", e.target.value)}
                className="h-10 w-12 rounded border border-slate-300"
              />
              <input
                className={input}
                value={settings.secondary_colour}
                onChange={(e) => update("secondary_colour", e.target.value)}
              />
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Company details</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={label}>Company name</span>
            <input
              required
              className={input}
              value={settings.company_name}
              onChange={(e) => update("company_name", e.target.value)}
            />
          </label>

          <label className="sm:col-span-2">
            <span className={label}>Contact line</span>
            <input
              className={input}
              value={settings.contact_line}
              onChange={(e) => update("contact_line", e.target.value)}
            />
          </label>

          {[
            ["address_line_1", "Address line 1"],
            ["address_line_2", "Address line 2"],
            ["town_city", "Town / city"],
            ["county", "County"],
            ["postcode", "Postcode"],
            ["phone", "Phone"],
            ["email", "Email"],
            ["website", "Website"],
            ["vat_number", "VAT number"],
            ["company_registration", "Company registration"],
          ].map(([key, title]) => (
            <label key={key}>
              <span className={label}>{title}</span>
              <input
                className={input}
                value={(settings[key as keyof CompanySettings] as string | null) ?? ""}
                onChange={(e) =>
                  update(key as keyof CompanySettings, e.target.value as never)
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Invoice and payment details
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className={label}>Payment terms (days)</span>
            <input
              type="number"
              min={0}
              className={input}
              value={settings.payment_terms_days}
              onChange={(e) =>
                update("payment_terms_days", Number(e.target.value))
              }
            />
          </label>

          {[
            ["bank_name", "Bank name"],
            ["account_name", "Account name"],
            ["sort_code", "Sort code"],
            ["account_number", "Account number"],
          ].map(([key, title]) => (
            <label key={key}>
              <span className={label}>{title}</span>
              <input
                className={input}
                value={(settings[key as keyof CompanySettings] as string | null) ?? ""}
                onChange={(e) =>
                  update(key as keyof CompanySettings, e.target.value as never)
                }
              />
            </label>
          ))}

          <label className="sm:col-span-2">
            <span className={label}>Invoice footer</span>
            <textarea
              rows={3}
              className={input}
              value={settings.invoice_footer ?? ""}
              onChange={(e) => update("invoice_footer", e.target.value)}
              placeholder="Thank you for your business."
            />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save company settings"}
        </button>

        {message && <p className="text-sm text-slate-600">{message}</p>}
      </div>
    </form>
  );
}
