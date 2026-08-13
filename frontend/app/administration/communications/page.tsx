"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BUILT_IN_EMAIL_TEMPLATES } from "@/lib/communications/templates";


 type Settings = {
  sender_name: string | null;
  reply_to_email: string | null;
  from_email: string | null;
  email_mode?: "agricore" | "custom_domain";
  custom_domain?: string | null;
  domain_status?: string | null;
  custom_sender_verified: boolean;
  enabled: boolean;
 };
 type Template = (typeof BUILT_IN_EMAIL_TEMPLATES)[number] & {
  subject_template?: string | null;
  body_template?: string | null;
  enabled?: boolean;
 };
 type Message = {
  id: string;
  template_key: string | null;
  recipient_email: string;
  subject: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  bounced_at: string | null;
  error_message: string | null;
 };

export default function CommunicationsPage() {
  const [tab, setTab] = useState<"settings" | "templates" | "history">("settings");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [selectedKey, setSelectedKey] = useState("welcome");
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const [settingsResponse, templatesResponse, historyResponse] = await Promise.all([
      fetch("/api/communications/settings", { cache: "no-store" }),
      fetch("/api/communications/templates", { cache: "no-store" }),
      fetch("/api/communications/history?limit=100", { cache: "no-store" }),
    ]);
    const [settingsBody, templatesBody, historyBody] = await Promise.all([
      settingsResponse.json(), templatesResponse.json(), historyResponse.json(),
    ]);
    if (!settingsResponse.ok) throw new Error(settingsBody.error || "Unable to load email settings.");
    if (!templatesResponse.ok) throw new Error(templatesBody.error || "Unable to load templates.");
    if (!historyResponse.ok) throw new Error(historyBody.error || "Unable to load email history.");
    setSettings(settingsBody.settings);
    setProviderConfigured(Boolean(settingsBody.providerConfigured));
    setWebhookConfigured(Boolean(settingsBody.webhookConfigured));
    setTemplates(templatesBody.templates || []);
    setMessages(historyBody.messages || []);
  }, []);

  useEffect(() => { void load().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load Communications.")); }, [load]);

  const selected = useMemo(() => templates.find((template) => template.key === selectedKey) || templates[0], [templates, selectedKey]);

  async function saveSettings() {
    if (!settings) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/communications/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save settings.");
      setSettings(body.settings); setNotice("Email settings saved.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save settings."); }
    finally { setBusy(false); }
  }

  async function saveTemplate() {
    if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/communications/templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template_key: selected.key, subject_template: selected.subject_template ?? selected.subject, body_template: selected.body_template ?? selected.body, enabled: selected.enabled !== false }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save template.");
      setNotice("Template saved."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save template."); }
    finally { setBusy(false); }
  }

  async function sendTest() {
    if (!testEmail.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/communications/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: testEmail.trim(), template_key: selectedKey }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to send test email.");
      setNotice(`Test email sent to ${testEmail.trim()}.`); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to send test email."); }
    finally { setBusy(false); }
  }

  function updateSelected(field: "subject_template" | "body_template" | "enabled", value: string | boolean) {
    setTemplates((current) => current.map((template) => template.key === selectedKey ? { ...template, [field]: value } : template));
  }

  return (
    <div className="w-full space-y-6 px-5 py-5 lg:px-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Administration</p>
          <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Communications</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Branded transactional email for account, billing, customer and workshop communication.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge ok={providerConfigured} label={providerConfigured ? "Resend connected" : "Resend not configured"} />
          <StatusBadge ok={webhookConfigured} label={webhookConfigured ? "Delivery webhook ready" : "Webhook secret missing"} />
        </div>
      </div>

      {(error || notice) && <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || notice}</div>}

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
        {([['settings','Sender settings'],['templates','Templates'],['history','Email history']] as const).map(([value,label]) => <button key={value} onClick={() => setTab(value)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${tab === value ? "bg-[#103D2E] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}>{label}</button>)}
      </div>

      {tab === "settings" && settings && (
        <div className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, email_mode: "agricore" })}
              className={`rounded-2xl border p-5 text-left transition ${
                (settings.email_mode || "agricore") === "agricore"
                  ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600 dark:bg-emerald-950/20"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              }`}
            >
              <p className="text-sm font-black text-slate-950 dark:text-white">Use AgriCore Email</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ready immediately. AgriCore handles delivery from its verified platform domain and customer replies go directly to your company.
              </p>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Recommended · no setup required
              </p>
            </button>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">Use your own email provider</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    For companies that need their own From address and existing mail infrastructure.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700">
                  Optional
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {["Microsoft 365", "Google Workspace", "Own Resend"].map((provider) => (
                  <div
                    key={provider}
                    className="rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-200"
                  >
                    {provider}
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Provider connections are separate from AgriCore&apos;s platform Resend account, so one customer&apos;s domain never consumes another customer&apos;s allowance.
              </p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
            <Card
              title="Sender settings"
              description="Control the company identity customers see and where replies are delivered."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sender name">
                  <input
                    value={settings.sender_name || ""}
                    onChange={(event) => setSettings({ ...settings, sender_name: event.target.value })}
                    className="input"
                    placeholder="Your company name"
                  />
                </Field>
                <Field label="Reply-to email">
                  <input
                    type="email"
                    value={settings.reply_to_email || ""}
                    onChange={(event) => setSettings({ ...settings, reply_to_email: event.target.value })}
                    className="input"
                    placeholder="accounts@yourcompany.com"
                  />
                </Field>
              </div>

              <label className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={settings.enabled !== false}
                  onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
                />
                Enable company transactional emails
              </label>

              <button
                disabled={busy}
                onClick={() => void saveSettings()}
                className="mt-5 rounded-xl bg-[#103D2E] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save settings"}
              </button>
            </Card>

            <Card
              title="Current email delivery"
              description="AgriCore Email is the safe default for trials and companies without their own connected mail provider."
            >
              <dl className="space-y-4 text-sm">
                <Info label="Delivery service" value="AgriCore Email" />
                <Info label="Platform sender" value={providerConfigured ? "Ready" : "Not configured"} />
                <Info label="Sender name" value={settings.sender_name || "Your company name"} />
                <Info label="Replies go to" value={settings.reply_to_email || "Set your reply-to email"} />
                <Info label="Delivery tracking" value={webhookConfigured ? "Enabled" : "Webhook secret missing"} />
              </dl>

              {settings.custom_sender_verified && settings.from_email ? (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
                  <p className="font-black text-emerald-900 dark:text-emerald-100">Existing custom sender retained</p>
                  <p className="mt-1 break-all text-emerald-800 dark:text-emerald-200">{settings.from_email}</p>
                  <p className="mt-2 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
                    Existing verified senders remain compatible. New customer domains are not added to the central AgriCore Resend account.
                  </p>
                </div>
              ) : null}
            </Card>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-black text-slate-950 dark:text-white">How company email works</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">1 · Start instantly</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  New companies use AgriCore Email automatically, so quotes and invoices can be sent during onboarding.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">2 · Replies stay yours</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Set your normal company mailbox as Reply-To. Customer replies go directly to your business.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">3 · Brand when needed</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Larger businesses can connect their own email provider when branded From addresses or internal IT controls are required.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "templates" && selected && (
        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            {templates.map((template) => <button key={template.key} onClick={() => setSelectedKey(template.key)} className={`w-full rounded-xl px-3 py-3 text-left ${selectedKey === template.key ? "bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{template.category}</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{template.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{template.description}</p></button>)}
          </div>
          <Card title={selected.name} description={selected.description}>
            <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={selected.enabled !== false} onChange={(event) => updateSelected("enabled", event.target.checked)} /> Template enabled</label>
            <Field label="Subject"><input value={selected.subject_template ?? selected.subject} onChange={(event) => updateSelected("subject_template", event.target.value)} className="input" /></Field>
            <Field label="Message"><textarea rows={12} value={selected.body_template ?? selected.body} onChange={(event) => updateSelected("body_template", event.target.value)} className="input resize-y" /></Field>
            <p className="mt-2 text-xs text-slate-500">Placeholders such as <code>{'{{company_name}}'}</code>, <code>{'{{invoice_number}}'}</code> and <code>{'{{action_url}}'}</code> are filled automatically.</p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
              <div className="bg-[#103D2E] px-5 py-4 text-white"><p className="text-xs font-black uppercase tracking-[0.14em] opacity-80">Email preview</p><p className="mt-1 text-lg font-bold">{selected.subject_template ?? selected.subject}</p></div>
              <div className="bg-white p-5 text-sm leading-7 text-slate-700 dark:bg-slate-950 dark:text-slate-300 whitespace-pre-wrap">{selected.body_template ?? selected.body}</div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} onClick={() => void saveTemplate()} className="rounded-xl bg-[#103D2E] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Save template</button><input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="Test recipient email" className="input max-w-sm" /><button disabled={busy || !testEmail.trim()} onClick={() => void sendTest()} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold dark:border-slate-700">Send test</button></div>
          </Card>
        </section>
      )}

      {tab === "history" && (
        <Card title="Email history" description="Latest transactional emails for the active company.">
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Recipient</th><th className="px-3 py-3">Subject</th><th className="px-3 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-900">{messages.map((message) => <tr key={message.id}><td className="px-3 py-4 whitespace-nowrap">{new Date(message.created_at).toLocaleString()}</td><td className="px-3 py-4 font-semibold">{message.recipient_email}</td><td className="px-3 py-4"><p className="max-w-xl truncate">{message.subject}</p>{message.error_message && <p className="mt-1 text-xs text-red-600">{message.error_message}</p>}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(message.status)}`}>{message.status}</span></td></tr>)}{messages.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-slate-500">No transactional emails have been logged yet.</td></tr>}</tbody></table></div>
        </Card>
      )}
      <style jsx>{`.input{width:100%;border:1px solid rgb(203 213 225);border-radius:.75rem;padding:.75rem 1rem;background:white;color:rgb(15 23 42);outline:none}.input:focus{border-color:rgb(5 150 105)}:global(.dark) .input{background:rgb(2 6 23);border-color:rgb(51 65 85);color:white}`}</style>
    </div>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"><h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p><div className="mt-5 space-y-4">{children}</div></section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>{children}</label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-900"><dt className="font-semibold text-slate-500">{label}</dt><dd className="text-right font-bold text-slate-900 dark:text-white">{value}</dd></div>; }
function StatusBadge({ ok, label }: { ok: boolean; label: string }) { return <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}>{label}</span>; }
function statusClass(status: string) { return status === "delivered" ? "bg-emerald-100 text-emerald-800" : status === "sent" ? "bg-blue-100 text-blue-800" : status === "bounced" || status === "failed" || status === "complained" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"; }
