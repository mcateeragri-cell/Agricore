"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import type { CompanySettings } from "@/app/api/_company/types";

type ApiResponse = {
  settings: CompanySettings;
  logoUrl: string | null;
};

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

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
  sidebar_colour: "#0B4331",
  sidebar_colour_secondary: "#073023",
  sidebar_text_colour: "#F4FFF9",
  sidebar_accent_colour: "#6EE7B7",
  sidebar_style: "gradient",
  invoice_footer: null,
  payment_terms_days: 7,
  bank_name: null,
  account_name: null,
  sort_code: null,
  account_number: null,
  country_code: "GB",
  currency_code: "GBP",
  locale: "en-GB",
  timezone: "Europe/London",
  tax_name: "VAT",
  default_tax_rate: 20,
  date_format: "DD/MM/YYYY",
  time_format: "24",
  week_start: "monday",
  measurement_system: "metric",
  updated_at: "",
};

const companyFields: Array<{
  key: keyof CompanySettings;
  label: string;
  type?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
}> = [
  {
    key: "address_line_1",
    label: "Address line 1",
    autoComplete: "address-line1",
  },
  {
    key: "address_line_2",
    label: "Address line 2",
    autoComplete: "address-line2",
  },
  {
    key: "town_city",
    label: "Town / city",
    autoComplete: "address-level2",
  },
  {
    key: "county",
    label: "County",
    autoComplete: "address-level1",
  },
  {
    key: "postcode",
    label: "Postcode",
    autoComplete: "postal-code",
  },
  {
    key: "phone",
    label: "Phone",
    type: "tel",
    autoComplete: "tel",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
    autoComplete: "email",
  },
  {
    key: "website",
    label: "Website",
    type: "url",
    autoComplete: "url",
  },
  {
    key: "vat_number",
    label: "VAT number",
  },
  {
    key: "company_registration",
    label: "Company registration",
  },
];

const paymentFields: Array<{
  key: keyof CompanySettings;
  label: string;
  autoComplete?: string;
}> = [
  {
    key: "bank_name",
    label: "Bank name",
  },
  {
    key: "account_name",
    label: "Account name",
  },
  {
    key: "sort_code",
    label: "Sort code",
  },
  {
    key: "account_number",
    label: "Account number",
  },
];

const SIDEBAR_PRESETS = [
  {
    name: "AgriCore",
    sidebar_colour: "#0B4331",
    sidebar_colour_secondary: "#073023",
    sidebar_text_colour: "#F4FFF9",
    sidebar_accent_colour: "#6EE7B7",
  },
  {
    name: "Forest",
    sidebar_colour: "#14532D",
    sidebar_colour_secondary: "#052E16",
    sidebar_text_colour: "#F0FDF4",
    sidebar_accent_colour: "#86EFAC",
  },
  {
    name: "Blue",
    sidebar_colour: "#0A4B78",
    sidebar_colour_secondary: "#062E4A",
    sidebar_text_colour: "#F7FBFF",
    sidebar_accent_colour: "#38BDF8",
  },
  {
    name: "Red",
    sidebar_colour: "#7F1D1D",
    sidebar_colour_secondary: "#450A0A",
    sidebar_text_colour: "#FFF7F7",
    sidebar_accent_colour: "#FCA5A5",
  },
  {
    name: "Amber",
    sidebar_colour: "#7C4A03",
    sidebar_colour_secondary: "#4A2C02",
    sidebar_text_colour: "#FFFBEB",
    sidebar_accent_colour: "#FCD34D",
  },
  {
    name: "Charcoal",
    sidebar_colour: "#1F2937",
    sidebar_colour_secondary: "#111827",
    sidebar_text_colour: "#F9FAFB",
    sidebar_accent_colour: "#34D399",
  },
] as const;

function normaliseNullableValue(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export default function CompanyBrandingForm() {
  const [settings, setSettings] =
    useState<CompanySettings>(EMPTY);
  const [logoUrl, setLogoUrl] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] =
    useState(false);
  const [removingLogo, setRemovingLogo] =
    useState(false);
  const [message, setMessage] =
    useState<MessageState>(null);


  useEffect(() => {
    if (!message || message.type === "error") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [message]);

  async function loadSettings() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/settings/company",
        {
          cache: "no-store",
        },
      );

      const data = (await response.json()) as ApiResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to load settings",
        );
      }

      setSettings(data.settings);
      setLogoUrl(data.logoUrl);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to load settings",
      });
    } finally {
      setLoading(false);
    }
  }
     useEffect(() => {
    void loadSettings();
  }, []);

  function update<K extends keyof CompanySettings>(
    key: K,
    value: CompanySettings[K],
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateNullableText(
    key: keyof CompanySettings,
    value: string,
  ) {
    setSettings((current) => ({
      ...current,
      [key]: normaliseNullableValue(value),
    }));
  }

  async function save(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/settings/company",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        },
      );

      const data = (await response.json()) as {
        settings?: CompanySettings;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to save settings",
        );
      }

      if (data.settings) {
        setSettings(data.settings);
      }

      setMessage({
        type: "success",
        text: "Company settings saved successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save settings",
      });
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage(null);

    if (file.size > 3 * 1024 * 1024) {
      setMessage({
        type: "error",
        text: "The logo must be 3 MB or smaller.",
      });
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);

    setUploadingLogo(true);

    try {
      const response = await fetch(
        "/api/settings/company/logo",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = (await response.json()) as {
        logoUrl?: string | null;
        logoPath?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to upload logo",
        );
      }

      setLogoUrl(data.logoUrl ?? null);
      setSettings((current) => ({
        ...current,
        logo_path:
          data.logoPath ?? current.logo_path,
      }));

      setMessage({
        type: "success",
        text: "Company logo uploaded successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to upload logo",
      });
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }

  async function removeLogo() {
    setRemovingLogo(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/settings/company/logo",
        {
          method: "DELETE",
        },
      );

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to remove logo",
        );
      }

      setLogoUrl(null);
      setSettings((current) => ({
        ...current,
        logo_path: null,
      }));

      setMessage({
        type: "success",
        text: "Company logo removed.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to remove logo",
      });
    } finally {
      setRemovingLogo(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

  const labelClass =
    "mb-1.5 block text-sm font-bold text-slate-800 dark:text-slate-200";

  const sectionClass =
    "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950";

  if (loading) {
    return (
      <div className={sectionClass}>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Loading company settings…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={
            message.type === "success"
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
              : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
          }
        >
          {message.text}
        </div>
      )}

      <section className={sectionClass}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Brand identity
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Logo and colours
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
            These colours and your logo are used on customer
            documents generated by AgriCore.
          </p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex min-h-40 items-center justify-center rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Company logo"
                  className="max-h-32 max-w-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    No logo uploaded
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Upload a PNG or JPEG logo.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
                {uploadingLogo
                  ? "Uploading…"
                  : logoUrl
                    ? "Replace logo"
                    : "Upload logo"}

                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={uploadLogo}
                  disabled={uploadingLogo || removingLogo}
                  className="hidden"
                />
              </label>

              {logoUrl && (
                <button
                  type="button"
                  onClick={removeLogo}
                  disabled={
                    removingLogo || uploadingLogo
                  }
                  className="min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  {removingLogo
                    ? "Removing…"
                    : "Remove logo"}
                </button>
              )}
            </div>

            <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-400">
              PNG is recommended. Maximum file size: 3 MB.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
            aria-label="Brand preview"
          >
            <div
              className="p-5"
              style={{
                backgroundColor:
                  settings.primary_colour,
              }}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-white/80">
                Document preview
              </p>

              <p className="mt-1 text-xl font-bold text-white">
                {settings.company_name ||
                  "Your company name"}
              </p>

              <p className="mt-1 text-sm font-medium text-white/85">
                {settings.contact_line ||
                  "Company contact details"}
              </p>
            </div>

            <div
              className="space-y-3 p-5"
              style={{
                backgroundColor:
                  settings.secondary_colour,
              }}
            >
              <div className="h-2 w-3/4 rounded bg-slate-900/20" />
              <div className="h-2 w-full rounded bg-slate-900/15" />
              <div className="h-2 w-5/6 rounded bg-slate-900/15" />

              <div className="pt-3">
                <div
                  className="inline-flex rounded-lg px-4 py-2 text-sm font-bold text-white"
                  style={{
                    backgroundColor:
                      settings.primary_colour,
                  }}
                >
                  Sample action
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>
              Primary colour
            </span>

            <div className="flex gap-2">
              <input
                type="color"
                value={settings.primary_colour}
                onChange={(event) =>
                  update(
                    "primary_colour",
                    event.target.value,
                  )
                }
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                aria-label="Choose primary colour"
              />

              <input
                className={inputClass}
                value={settings.primary_colour}
                onChange={(event) =>
                  update(
                    "primary_colour",
                    event.target.value,
                  )
                }
                maxLength={7}
                spellCheck={false}
              />
            </div>
          </label>

          <label>
            <span className={labelClass}>
              Secondary colour
            </span>

            <div className="flex gap-2">
              <input
                type="color"
                value={settings.secondary_colour}
                onChange={(event) =>
                  update(
                    "secondary_colour",
                    event.target.value,
                  )
                }
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                aria-label="Choose secondary colour"
              />

              <input
                className={inputClass}
                value={settings.secondary_colour}
                onChange={(event) =>
                  update(
                    "secondary_colour",
                    event.target.value,
                  )
                }
                maxLength={7}
                spellCheck={false}
              />
            </div>
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Workspace theme
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Sidebar appearance
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
            Brand each company workspace with its own navigation colours.
            The theme is applied for every user in this company.
          </p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div>
              <p className={labelClass}>Quick presets</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SIDEBAR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        sidebar_colour: preset.sidebar_colour,
                        sidebar_colour_secondary:
                          preset.sidebar_colour_secondary,
                        sidebar_text_colour:
                          preset.sidebar_text_colour,
                        sidebar_accent_colour:
                          preset.sidebar_accent_colour,
                      }))
                    }
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <span
                      className="h-7 w-7 shrink-0 rounded-lg border border-black/10 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${preset.sidebar_colour}, ${preset.sidebar_colour_secondary})`,
                      }}
                    />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["sidebar_colour", "Sidebar colour"],
                ["sidebar_colour_secondary", "Gradient end"],
                ["sidebar_text_colour", "Text colour"],
                ["sidebar_accent_colour", "Active accent"],
              ].map(([key, label]) => (
                <label key={key}>
                  <span className={labelClass}>{label}</span>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={String(
                        settings[key as keyof CompanySettings],
                      )}
                      onChange={(event) =>
                        update(
                          key as keyof CompanySettings,
                          event.target.value as never,
                        )
                      }
                      className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                      aria-label={label}
                    />
                    <input
                      className={inputClass}
                      value={String(
                        settings[key as keyof CompanySettings],
                      )}
                      onChange={(event) =>
                        update(
                          key as keyof CompanySettings,
                          event.target.value as never,
                        )
                      }
                      maxLength={7}
                      spellCheck={false}
                    />
                  </div>
                </label>
              ))}
            </div>

            <label>
              <span className={labelClass}>Sidebar style</span>
              <select
                className={inputClass}
                value={settings.sidebar_style}
                onChange={(event) =>
                  update(
                    "sidebar_style",
                    event.target.value === "solid"
                      ? "solid"
                      : "gradient",
                  )
                }
              >
                <option value="gradient">Gradient</option>
                <option value="solid">Solid colour</option>
              </select>
            </label>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div
              className="min-h-[360px] p-4 text-left"
              style={{
                color: settings.sidebar_text_colour,
                background:
                  settings.sidebar_style === "solid"
                    ? settings.sidebar_colour
                    : `linear-gradient(180deg, ${settings.sidebar_colour}, ${settings.sidebar_colour_secondary})`,
              }}
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] opacity-70">
                Live preview
              </p>
              <p className="mt-2 truncate text-lg font-black">
                {settings.company_name || "Your company"}
              </p>

              <div className="mt-6 space-y-2 text-sm font-bold">
                {["Dashboard", "Customers", "Machines", "Jobs"].map(
                  (item, index) => (
                    <div
                      key={item}
                      className="rounded-xl border px-3 py-2.5"
                      style={
                        index === 0
                          ? {
                              backgroundColor: `${settings.sidebar_accent_colour}33`,
                              borderColor: `${settings.sidebar_accent_colour}66`,
                              boxShadow: `inset 3px 0 0 ${settings.sidebar_accent_colour}`,
                            }
                          : {
                              borderColor: "transparent",
                              opacity: 0.78,
                            }
                      }
                    >
                      {item}
                    </div>
                  ),
                )}
              </div>

              <div className="mt-8 rounded-xl border border-white/10 bg-white/10 p-3 text-xs font-semibold opacity-90">
                Theme changes apply to desktop and mobile navigation after saving.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Business information
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Company details
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
            Enter the details that should appear on invoices,
            quotes, reports and customer emails.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>
              Company name
            </span>

            <input
              required
              className={inputClass}
              value={settings.company_name}
              onChange={(event) =>
                update(
                  "company_name",
                  event.target.value,
                )
              }
              autoComplete="organization"
            />
          </label>

          <label className="sm:col-span-2">
            <span className={labelClass}>
              Contact line
            </span>

            <input
              className={inputClass}
              value={settings.contact_line}
              onChange={(event) =>
                update(
                  "contact_line",
                  event.target.value,
                )
              }
              placeholder="For example: Agricultural engineering and field service"
            />
          </label>

          {companyFields.map(
            ({
              key,
              label,
              type = "text",
              autoComplete,
            }) => (
              <label key={key}>
                <span className={labelClass}>
                  {label}
                </span>

                <input
                  type={type}
                  className={inputClass}
                  value={
                    (settings[key] as string | null) ??
                    ""
                  }
                  onChange={(event) =>
                    updateNullableText(
                      key,
                      event.target.value,
                    )
                  }
                  autoComplete={autoComplete}
                />
              </label>
            ),
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Finance
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Invoice and payment details
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
            Configure payment terms, bank details and the
            footer shown on customer invoices.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>
              Payment terms (days)
            </span>

            <input
              type="number"
              min={0}
              max={365}
              className={inputClass}
              value={settings.payment_terms_days}
              onChange={(event) =>
                update(
                  "payment_terms_days",
                  Number(event.target.value),
                )
              }
              inputMode="numeric"
            />
          </label>

          {paymentFields.map(
            ({ key, label, autoComplete }) => (
              <label key={key}>
                <span className={labelClass}>
                  {label}
                </span>

                <input
                  className={inputClass}
                  value={
                    (settings[key] as string | null) ??
                    ""
                  }
                  onChange={(event) =>
                    updateNullableText(
                      key,
                      event.target.value,
                    )
                  }
                  autoComplete={autoComplete}
                />
              </label>
            ),
          )}

          <label className="sm:col-span-2">
            <span className={labelClass}>
              Invoice footer
            </span>

            <textarea
              rows={4}
              className={`${inputClass} resize-y`}
              value={settings.invoice_footer ?? ""}
              onChange={(event) =>
                updateNullableText(
                  "invoice_footer",
                  event.target.value,
                )
              }
              placeholder="Thank you for your business."
            />
          </label>
        </div>
      </section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex sm:items-center sm:justify-between lg:bottom-4 dark:border-slate-800 dark:bg-slate-950/95">
        <p className="mb-3 text-sm font-medium text-slate-600 sm:mb-0 dark:text-slate-400">
          Save your changes before leaving this page.
        </p>

        <button
          type="submit"
          disabled={saving || uploadingLogo || removingLogo}
          className="min-h-11 w-full rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {saving
            ? "Saving…"
            : "Save company settings"}
        </button>
      </div>
    </form>
  );
}
