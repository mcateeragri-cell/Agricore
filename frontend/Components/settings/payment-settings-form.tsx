"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Provider = "none" | "bank_transfer" | "revolut";
type Settings = {
  provider: Provider;
  bank_name: string | null;
  account_name: string | null;
  sort_code: string | null;
  account_number: string | null;
  iban: string | null;
  bic: string | null;
  payment_instructions: string | null;
  revolut_environment: "sandbox" | "production";
  revolut_api_version: string;
  revolut_public_key: string | null;
  revolut_secret_configured: boolean;
  revolut_webhook_secret_configured: boolean;
};

const EMPTY: Settings = {
  provider: "none",
  bank_name: null,
  account_name: null,
  sort_code: null,
  account_number: null,
  iban: null,
  bic: null,
  payment_instructions: null,
  revolut_environment: "sandbox",
  revolut_api_version: "2026-04-20",
  revolut_public_key: null,
  revolut_secret_configured: false,
  revolut_webhook_secret_configured: false,
};

type ConnectionState =
  | { status: "idle"; message: "" }
  | { status: "testing"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function PaymentSettingsForm() {
  const [settings, setSettings] = useState(EMPTY);
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [connection, setConnection] = useState<ConnectionState>({
    status: "idle",
    message: "",
  });

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/settings/payments", {
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "Unable to load payment settings.");
        }
        if (body.settings) setSettings({ ...EMPTY, ...body.settings });
        if (body.companyId) setCompanyId(body.companyId);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load payment settings.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function change(key: keyof Settings, value: string | boolean) {
    setSettings((current) => ({
      ...current,
      [key]: value === "" ? null : value,
    }));
    if (
      key === "revolut_environment" ||
      key === "revolut_api_version" ||
      key === "provider"
    ) {
      setConnection({ status: "idle", message: "" });
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          revolut_secret_key: secretKey,
          revolut_webhook_secret: webhookSecret,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to save payment settings.");
      }
      setSettings({ ...EMPTY, ...body.settings });
      setSecretKey("");
      setWebhookSecret("");
      setMessage("Payment settings saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save payment settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setConnection({
      status: "testing",
      message: "Testing Revolut connection…",
    });

    try {
      const response = await fetch("/api/settings/payments/test-revolut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment: settings.revolut_environment,
          apiVersion: settings.revolut_api_version,
          secretKey,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Revolut connection test failed.");
      }
      setConnection({
        status: "success",
        message: body.message ?? "Connection successful.",
      });
    } catch (error) {
      setConnection({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Revolut connection test failed.",
      });
    }
  }

  const input =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  const previewTitle = useMemo(() => {
    if (settings.provider === "revolut") return "Pay online";
    if (settings.provider === "bank_transfer") return "Pay by bank transfer";
    return "Payment instructions";
  }, [settings.provider]);

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        Loading payment settings…
      </section>
    );
  }

  return (
    <form
      onSubmit={save}
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
          Payments
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          Invoice payment settings
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Each company controls its own payment method. AgriCore never assumes
          that Revolut is used.
        </p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Default payment method
            <select
              className={input}
              value={settings.provider}
              onChange={(event) => change("provider", event.target.value)}
            >
              <option value="none">No online payment method</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="revolut">Revolut Business</option>
            </select>
          </label>

          {(settings.provider === "bank_transfer" ||
            settings.provider === "revolut") && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(
                [
                  "bank_name",
                  "account_name",
                  "sort_code",
                  "account_number",
                  "iban",
                  "bic",
                ] as const
              ).map((key) => (
                <label
                  key={key}
                  className="text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  {key
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, (value) => value.toUpperCase())}
                  <input
                    className={input}
                    value={settings[key] ?? ""}
                    onChange={(event) => change(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          )}

          {settings.provider === "revolut" && (
            <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Environment
                  <select
                    className={input}
                    value={settings.revolut_environment}
                    onChange={(event) =>
                      change("revolut_environment", event.target.value)
                    }
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  API version
                  <input
                    className={input}
                    value={settings.revolut_api_version}
                    onChange={(event) =>
                      change("revolut_api_version", event.target.value)
                    }
                  />
                </label>
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Public key
                  <input
                    className={input}
                    value={settings.revolut_public_key ?? ""}
                    onChange={(event) =>
                      change("revolut_public_key", event.target.value)
                    }
                  />
                </label>
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Secret key{" "}
                  {settings.revolut_secret_configured ? "(configured)" : ""}
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={input}
                    value={secretKey}
                    placeholder={
                      settings.revolut_secret_configured
                        ? "Leave blank to keep existing key"
                        : "Enter secret key"
                    }
                    onChange={(event) => {
                      setSecretKey(event.target.value);
                      setConnection({ status: "idle", message: "" });
                    }}
                  />
                </label>
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 sm:col-span-2">
                  Webhook secret{" "}
                  {settings.revolut_webhook_secret_configured
                    ? "(configured)"
                    : ""}
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={input}
                    value={webhookSecret}
                    placeholder={
                      settings.revolut_webhook_secret_configured
                        ? "Leave blank to keep existing secret"
                        : "Enter webhook secret"
                    }
                    onChange={(event) => setWebhookSecret(event.target.value)}
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void testConnection()}
                  disabled={connection.status === "testing"}
                  className="rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  {connection.status === "testing"
                    ? "Testing…"
                    : "Test Revolut connection"}
                </button>
                {connection.message && (
                  <p
                    className={`text-sm font-semibold ${
                      connection.status === "success"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : connection.status === "error"
                          ? "text-red-700 dark:text-red-300"
                          : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {connection.message}
                  </p>
                )}
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Webhook URL:{" "}
                <code>{`/api/payments/revolut/webhook?companyId=${companyId || "YOUR_COMPANY_ID"}`}</code>
                . Use this company-specific endpoint in Revolut Business.
              </p>
            </div>
          )}

          <label className="mt-6 block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Payment instructions
            <textarea
              className={input}
              rows={3}
              value={settings.payment_instructions ?? ""}
              onChange={(event) =>
                change("payment_instructions", event.target.value)
              }
            />
          </label>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Invoice preview
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
            {previewTitle}
          </h3>

          {settings.provider === "none" && (
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              No payment details will be printed. Add instructions below if the
              customer should contact the company to arrange payment.
            </p>
          )}

          {(settings.provider === "bank_transfer" ||
            settings.provider === "revolut") && (
            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <PreviewRow label="Account" value={settings.account_name} />
              <PreviewRow label="Bank" value={settings.bank_name} />
              <PreviewRow label="Sort code" value={settings.sort_code} />
              <PreviewRow label="Account number" value={settings.account_number} />
              <PreviewRow label="IBAN" value={settings.iban} />
              <PreviewRow label="BIC / SWIFT" value={settings.bic} />
            </div>
          )}

          {settings.provider === "revolut" && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-white p-4 text-center dark:border-emerald-900 dark:bg-slate-950">
              <div className="mx-auto grid h-28 w-28 place-items-center rounded-xl border-2 border-dashed border-slate-300 text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Payment QR code
              </div>
              <div className="mt-3 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white">
                Pay invoice online
              </div>
            </div>
          )}

          {settings.payment_instructions && (
            <div className="mt-5 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {settings.payment_instructions}
            </div>
          )}
        </aside>
      </div>

      {message && (
        <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {message}
        </p>
      )}
      <button
        disabled={saving}
        className="mt-5 rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save payment settings"}
      </button>
    </form>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-2 last:border-b-0 dark:border-slate-700">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-semibold text-slate-900 dark:text-white">
        {value || "Not set"}
      </span>
    </div>
  );
}
