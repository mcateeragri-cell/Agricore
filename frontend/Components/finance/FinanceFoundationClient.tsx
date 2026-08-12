"use client";

import { useCallback, useEffect, useState } from "react";

type Profile = {
  country_code: string;
  base_currency_code: string;
  tax_system: string;
  tax_label: string;
  accounting_method: "accrual" | "cash";
  accounting_standard: string;
  financial_year_start_month: number;
  financial_year_start_day: number;
  chart_template: string;
  government_connector: string;
};
type Account = { id: string; code: string; name: string; account_type: string; active: boolean };
type Period = { id: string; name: string; starts_on: string; ends_on: string; status: string };
type TaxCode = { id: string; code: string; name: string; rate: number; tax_kind: string; active: boolean };
type Journal = { id: string; journal_date: string; status: string; source_type: string | null; source_action: string; reference: string | null; description: string | null; currency_code: string; posted_at: string | null };
type QueueRow = { id: string; status: string; last_error: string | null; created_at: string };
type TaxPeriod = { id: string; name: string; starts_on: string; ends_on: string; status: string };
type ValidationIssue = { id: string; severity: string; category: string; title: string; detail: string | null; last_seen_at: string };

const EMPTY: Profile = { country_code: "GB", base_currency_code: "GBP", tax_system: "vat", tax_label: "VAT", accounting_method: "accrual", accounting_standard: "local", financial_year_start_month: 1, financial_year_start_day: 1, chart_template: "agricore_standard", government_connector: "none" };

export default function FinanceFoundationClient() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [financeQueue, setFinanceQueue] = useState<QueueRow[]>([]);
  const [taxPeriods, setTaxPeriods] = useState<TaxPeriod[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [taxForm, setTaxForm] = useState({ code: "", name: "", rate: "", effective_from: new Date().toISOString().slice(0,10) });
  const [periodForm, setPeriodForm] = useState({ name: "", starts_on: "", ends_on: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/finance/profile", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load finance foundation.");
      setProfile(body.profile || EMPTY); setAccounts(body.accounts || []); setPeriods(body.periods || []); setTaxCodes(body.taxCodes || []); setJournals(body.journals || []); setFinanceQueue(body.financeQueue || []); setTaxPeriods(body.taxPeriods || []); setValidationIssues(body.validationIssues || []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load finance foundation."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/finance/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save finance profile.");
      setProfile(body.profile); setMessage("Financial profile saved.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save finance profile."); }
    finally { setSaving(false); }
  }


  async function runValidation() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/finance/validation", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to validate finance records.");
      setValidationIssues(body.issues || []);
      setMessage(body.issues?.length ? `Finance validation found ${body.issues.length} open issue(s).` : "Finance validation passed with no open issues.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to validate finance records."); }
    finally { setSaving(false); }
  }

  async function saveTaxCode() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/finance/tax-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...taxForm, rate: Number(taxForm.rate) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save tax code.");
      setTaxForm({ code: "", name: "", rate: "", effective_from: new Date().toISOString().slice(0,10) });
      setMessage("Tax code saved with effective-date history.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save tax code."); }
    finally { setSaving(false); }
  }

  async function createTaxPeriod() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/finance/tax-periods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(periodForm) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to create tax period.");
      setPeriodForm({ name: "", starts_on: "", ends_on: "" });
      setMessage("Tax period created.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create tax period."); }
    finally { setSaving(false); }
  }


  async function setTaxPeriodStatus(id: string, status: "open" | "prepared" | "reviewed" | "locked") {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/finance/tax-periods", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update tax period.");
      setMessage(`Tax period marked ${status}.`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update tax period."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="w-full px-5 py-8 lg:px-7"><p className="text-sm font-semibold text-slate-500">Loading Atlas Finance…</p></main>;
  return <main className="w-full space-y-6 px-5 py-5 lg:px-7">
    <div><p className="text-sm font-semibold text-emerald-700">Administration · Atlas Finance</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Finance foundation</h1><p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">Global company finance configuration and the accounting foundation that future journals, tax preparation and accountant reports will use.</p></div>
    {(error || message) && <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || message}</div>}
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
      <Card title="Financial profile" description="These settings are deliberately jurisdiction-neutral. Country-specific compliance connectors will plug into this profile later.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country code"><input className="input" maxLength={2} value={profile.country_code} onChange={e => setProfile({ ...profile, country_code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Base currency"><input className="input" maxLength={3} value={profile.base_currency_code} onChange={e => setProfile({ ...profile, base_currency_code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Tax system"><input className="input" value={profile.tax_system} onChange={e => setProfile({ ...profile, tax_system: e.target.value })} placeholder="vat, gst, sales_tax, custom" /></Field>
          <Field label="Tax label"><input className="input" value={profile.tax_label} onChange={e => setProfile({ ...profile, tax_label: e.target.value })} /></Field>
          <Field label="Accounting method"><select className="input" value={profile.accounting_method} onChange={e => setProfile({ ...profile, accounting_method: e.target.value as "accrual" | "cash" })}><option value="accrual">Accrual</option><option value="cash">Cash</option></select></Field>
          <Field label="Accounting standard"><input className="input" value={profile.accounting_standard} onChange={e => setProfile({ ...profile, accounting_standard: e.target.value })} placeholder="local" /></Field>
          <Field label="Financial year start month"><input className="input" type="number" min={1} max={12} value={profile.financial_year_start_month} onChange={e => setProfile({ ...profile, financial_year_start_month: Number(e.target.value) })} /></Field>
          <Field label="Financial year start day"><input className="input" type="number" min={1} max={31} value={profile.financial_year_start_day} onChange={e => setProfile({ ...profile, financial_year_start_day: Number(e.target.value) })} /></Field>
        </div>
        <button disabled={saving} onClick={() => void save()} className="mt-5 rounded-xl bg-[#103D2E] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save financial profile"}</button>
      </Card>
      <Card title="Finance engine status" description="Pack 2B posts issued customer invoices and recorded customer payments through Atlas into the double-entry ledger. Tax returns are still review-only future work.">
        <Stat label="Posted journals" value={String(journals.length)} /><Stat label="Finance queue waiting" value={String(financeQueue.filter(q => q.status === "queued" || q.status === "running").length)} /><Stat label="Finance posting errors" value={String(financeQueue.filter(q => q.status === "failed").length)} /><Stat label="Accounting method" value={profile.accounting_method === "cash" ? "Cash basis" : "Accrual"} /><Stat label="Government connector" value={profile.government_connector === "none" ? "Not connected" : profile.government_connector} />
      </Card>
    </section>
    <section className="grid gap-6 xl:grid-cols-2">
      <Card title="Recent journal postings" description="Read-only trace of the latest Atlas Finance postings. Every entry retains its operational source reference.">{journals.length ? <SimpleTable headers={["Date","Reference","Action","Status"]} rows={journals.map(j => [j.journal_date,j.reference || "—",j.source_action.replaceAll("_"," "),j.status])} /> : <p className="text-sm font-semibold text-slate-500">No journals posted yet. Send a test invoice, run Atlas, then refresh.</p>}</Card>
      <Card title="Posting queue" description="Finance work is background-driven. Errors remain visible here and are retried by Atlas rather than silently losing financial activity.">{financeQueue.length ? <SimpleTable headers={["Status","Created","Error"]} rows={financeQueue.slice(0,10).map(q => [q.status,new Date(q.created_at).toLocaleString(),q.last_error || "—"])} /> : <p className="text-sm font-semibold text-slate-500">No pending or failed finance posting tasks.</p>}</Card>
    </section>
    <section className="grid gap-6 xl:grid-cols-2">
      <Card title="Finance validation" description="Atlas checks ledger integrity, tax coding, period linkage and failed background postings. This is a review control, not a statutory tax return.">
        <div className="flex items-center justify-between gap-4"><Stat label="Open issues" value={String(validationIssues.length)} /><button disabled={saving} onClick={() => void runValidation()} className="rounded-xl bg-[#103D2E] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Run validation</button></div>
        {validationIssues.length ? <SimpleTable headers={["Severity","Category","Issue"]} rows={validationIssues.slice(0,12).map(i => [i.severity.toUpperCase(),i.category,i.title + (i.detail ? ` — ${i.detail}` : "")])} /> : <p className="text-sm font-semibold text-emerald-700">No open finance validation issues.</p>}
      </Card>
      <Card title="Tax periods" description="Define company reporting periods without hard-coding VAT, GST or Sales Tax filing calendars. Actual statutory deadlines remain jurisdiction-specific.">
        <div className="grid gap-3 sm:grid-cols-3"><input className="input" placeholder="Period name" value={periodForm.name} onChange={e => setPeriodForm({...periodForm,name:e.target.value})}/><input className="input" type="date" value={periodForm.starts_on} onChange={e => setPeriodForm({...periodForm,starts_on:e.target.value})}/><input className="input" type="date" value={periodForm.ends_on} onChange={e => setPeriodForm({...periodForm,ends_on:e.target.value})}/></div>
        <button disabled={saving} onClick={() => void createTaxPeriod()} className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-bold text-emerald-800 dark:text-emerald-300 disabled:opacity-50">Create tax period</button>
        {taxPeriods.length ? <div className="space-y-2">{taxPeriods.map(p => <div key={p.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-slate-900 dark:text-white">{p.name}</p><p className="text-xs font-semibold text-slate-500">{p.starts_on} → {p.ends_on} · {p.status}</p></div><div className="flex flex-wrap gap-2">{p.status === "open" && <button disabled={saving} onClick={() => void setTaxPeriodStatus(p.id,"prepared")} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Prepare</button>}{p.status === "prepared" && <button disabled={saving} onClick={() => void setTaxPeriodStatus(p.id,"reviewed")} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Mark reviewed</button>}{p.status === "reviewed" && <button disabled={saving} onClick={() => void setTaxPeriodStatus(p.id,"locked")} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Lock</button>}{p.status !== "open" && p.status !== "locked" && <button disabled={saving} onClick={() => void setTaxPeriodStatus(p.id,"open")} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Reopen</button>}</div></div></div>)}</div> : <p className="text-sm font-semibold text-slate-500">No tax periods configured yet.</p>}
      </Card>
    </section>
    <section className="grid gap-6 xl:grid-cols-2">
      <Card title="Tax code management" description="Rates are company-configured and effective-dated. AgriCore does not guess current statutory rates for any country.">
        <div className="grid gap-3 sm:grid-cols-2"><input className="input" placeholder="Code (e.g. STANDARD)" value={taxForm.code} onChange={e => setTaxForm({...taxForm,code:e.target.value.toUpperCase()})}/><input className="input" placeholder="Display name" value={taxForm.name} onChange={e => setTaxForm({...taxForm,name:e.target.value})}/><input className="input" type="number" min="0" max="100" step="0.01" placeholder="Rate %" value={taxForm.rate} onChange={e => setTaxForm({...taxForm,rate:e.target.value})}/><input className="input" type="date" value={taxForm.effective_from} onChange={e => setTaxForm({...taxForm,effective_from:e.target.value})}/></div>
        <button disabled={saving} onClick={() => void saveTaxCode()} className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-bold text-emerald-800 dark:text-emerald-300 disabled:opacity-50">Save tax code</button>
        <SimpleTable headers={["Code","Name","Rate"]} rows={taxCodes.map(t => [t.code,t.name,`${Number(t.rate)}%`])} />
      </Card>
      <Card title="Controlled reversals" description="Pack 2C adds idempotent journal reversals. Unpaid issued invoices that are voided can now reverse their ledger entry through Atlas. Paid/part-paid invoices remain protected until a refund/credit workflow is recorded.">
        <Stat label="Reversed journals" value={String(journals.filter(j => j.status === "reversed").length)} /><p className="text-sm font-medium leading-6 text-slate-500">This deliberately avoids deleting posted financial history. Reversal entries retain the source journal and audit trail.</p>
      </Card>
    </section>
    <section className="grid gap-6 xl:grid-cols-2">
      <Card title="Chart of accounts" description="Initial AgriCore standard accounts. The posting engine in Pack 2B will target system keys rather than hard-coded account numbers."><SimpleTable headers={["Code","Account","Type"]} rows={accounts.map(a => [a.code,a.name,a.account_type])} /></Card>
      <Card title="Tax codes" description="Company-specific tax definitions. These are configuration records, not hard-coded VAT/GST logic."><SimpleTable headers={["Code","Name","Rate"]} rows={taxCodes.map(t => [t.code,t.name,`${Number(t.rate)}%`])} /></Card>
    </section>
    <style jsx>{`.input{width:100%;border:1px solid rgb(203 213 225);border-radius:.75rem;padding:.75rem 1rem;background:white;color:rgb(15 23 42);outline:none}.input:focus{border-color:rgb(5 150 105)}:global(.dark) .input{background:rgb(2 6 23);border-color:rgb(51 65 85);color:white}`}</style>
  </main>;
}
function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"><h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p><div className="mt-5 space-y-4">{children}</div></section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>{children}</label>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 text-sm dark:border-slate-900"><span className="font-semibold text-slate-500">{label}</span><span className="text-right font-bold text-slate-950 dark:text-white">{value}</span></div>; }
function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800"><tr>{headers.map(h => <th key={h} className="px-2 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-900">{rows.map((row,i) => <tr key={i}>{row.map((value,j) => <td key={j} className="px-2 py-3 font-medium text-slate-700 dark:text-slate-200">{value}</td>)}</tr>)}</tbody></table></div>; }
