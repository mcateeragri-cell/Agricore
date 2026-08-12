"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Supplier = { id: string; name: string; account_reference: string | null };
type Account = { id: string; code: string; name: string; account_type: string; system_key: string | null };
type TaxCode = { id: string; code: string; name: string; rate: number | string; recoverable: boolean };
type BankAccount = { id: string; name: string; bank_name: string | null; currency_code: string; is_default: boolean };
type PurchaseOrder = { id: string; order_number: string; supplier_id: string | null; supplier_name: string; status: string; total: number | string };
type PurchaseInvoice = {
  id: string;
  supplier_id: string;
  purchase_order_id: string | null;
  invoice_number: string;
  supplier_reference: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  currency_code: string;
  subtotal: number | string;
  tax_amount: number | string;
  total: number | string;
  amount_paid: number | string;
  notes: string | null;
  stock_suppliers: { name: string } | null;
};
type LineForm = { description: string; quantity: string; unit_cost: string; account_id: string; tax_code_id: string };

type LedgerData = {
  invoices: PurchaseInvoice[];
  suppliers: Supplier[];
  accounts: Account[];
  taxCodes: TaxCode[];
  bankAccounts: BankAccount[];
  purchaseOrders: PurchaseOrder[];
};

const today = () => new Date().toISOString().slice(0, 10);
const blankLine = (): LineForm => ({ description: "", quantity: "1", unit_cost: "", account_id: "", tax_code_id: "" });
const blankInvoice = () => ({ supplier_id: "", purchase_order_id: "", invoice_number: "", supplier_reference: "", invoice_date: today(), due_date: "", notes: "" });
const moneyNumber = (value: unknown) => Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100 || 0;
const gbp = (value: unknown, currency = "GBP") => new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(moneyNumber(value));
const title = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default function PurchaseLedgerClient() {
  const [data, setData] = useState<LedgerData | null>(null);
  const [form, setForm] = useState(blankInvoice);
  const [lines, setLines] = useState<LineForm[]>([blankLine()]);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [payment, setPayment] = useState({ amount: "", payment_date: today(), bank_account_id: "", reference: "" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/finance/purchases", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load purchase ledger.");
      setData(body as LedgerData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load purchase ledger.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!data) return [];
    if (!query) return data.invoices;
    return data.invoices.filter((invoice) => [invoice.invoice_number, invoice.supplier_reference, invoice.stock_suppliers?.name, invoice.status].some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [data, search]);

  const usableAccounts = useMemo(() => (data?.accounts ?? []).filter((account) => account.account_type !== "income" && !["accounts_receivable", "accounts_payable", "tax_payable", "tax_recoverable", "bank"].includes(String(account.system_key ?? ""))), [data]);
  const supplierPOs = useMemo(() => (data?.purchaseOrders ?? []).filter((po) => !form.supplier_id || !po.supplier_id || po.supplier_id === form.supplier_id), [data, form.supplier_id]);
  const taxById = useMemo(() => new Map((data?.taxCodes ?? []).map((code) => [code.id, code])), [data]);

  const totals = useMemo(() => {
    let net = 0;
    let tax = 0;
    for (const line of lines) {
      const lineNet = moneyNumber(Number(line.quantity || 0) * Number(line.unit_cost || 0));
      const rate = moneyNumber(taxById.get(line.tax_code_id)?.rate ?? 0);
      net = moneyNumber(net + lineNet);
      tax = moneyNumber(tax + moneyNumber(lineNet * rate / 100));
    }
    return { net, tax, gross: moneyNumber(net + tax) };
  }, [lines, taxById]);

  function updateLine(index: number, key: keyof LineForm, value: string) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line));
  }

  async function saveInvoice(event: FormEvent, status: "draft" | "posted") {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/finance/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status, lines: lines.map((line) => ({ ...line, quantity: Number(line.quantity), unit_cost: Number(line.unit_cost), tax_code_id: line.tax_code_id || null })) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save supplier invoice.");
      setMessage(status === "posted" ? "Supplier invoice posted to Atlas Finance." : "Supplier invoice saved as draft.");
      setForm(blankInvoice());
      setLines([blankLine()]);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save supplier invoice.");
    } finally { setSaving(false); }
  }

  async function postDraft(invoice: PurchaseInvoice) {
    if (!confirm(`Post supplier invoice ${invoice.invoice_number}? Once posted it enters the finance ledger workflow.`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/finance/purchases/${invoice.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "post" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to post supplier invoice.");
      setMessage(`Supplier invoice ${invoice.invoice_number} posted.`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to post supplier invoice."); }
    finally { setSaving(false); }
  }

  function openPayment(invoice: PurchaseInvoice) {
    const outstanding = moneyNumber(Number(invoice.total) - Number(invoice.amount_paid));
    const defaultBank = data?.bankAccounts.find((account) => account.is_default)?.id ?? data?.bankAccounts[0]?.id ?? "";
    setSelectedInvoice(invoice);
    setPayment({ amount: outstanding.toFixed(2), payment_date: today(), bank_account_id: defaultBank, reference: invoice.invoice_number });
  }

  async function recordPayment(event: FormEvent) {
    event.preventDefault();
    if (!selectedInvoice) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/finance/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchase_invoice_id: selectedInvoice.id, ...payment, amount: Number(payment.amount) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to record supplier payment.");
      setMessage(`Payment of ${gbp(body.amount, selectedInvoice.currency_code)} recorded against ${selectedInvoice.invoice_number}.`);
      setSelectedInvoice(null);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to record supplier payment."); }
    finally { setSaving(false); }
  }

  const totalOutstanding = (data?.invoices ?? []).filter((invoice) => invoice.status !== "void").reduce((sum, invoice) => sum + Math.max(0, moneyNumber(invoice.total) - moneyNumber(invoice.amount_paid)), 0);
  const overdue = (data?.invoices ?? []).filter((invoice) => invoice.status !== "void" && invoice.due_date && invoice.due_date < today() && moneyNumber(invoice.total) > moneyNumber(invoice.amount_paid)).reduce((sum, invoice) => sum + Math.max(0, moneyNumber(invoice.total) - moneyNumber(invoice.amount_paid)), 0);

  if (loading && !data) return <main className="w-full px-5 py-8 lg:px-7"><p className="text-sm font-semibold text-slate-500">Loading purchase ledger…</p></main>;

  return <main className="w-full space-y-6 px-5 py-5 lg:px-7">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-sm font-semibold text-emerald-700">Atlas Finance · Finance 2E</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Purchase ledger</h1><p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">Enter supplier invoices, allocate costs and VAT, post them through Atlas Finance and record partial or full supplier payments.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/stock/suppliers" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Suppliers</Link><Link href="/stock/purchase-orders" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Purchase orders</Link><Link href="/administration/finance/accountant" className="rounded-xl bg-[#103D2E] px-4 py-2.5 text-sm font-bold text-white">Accountant workspace</Link></div>
    </div>

    {(error || message) && <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || message}</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Supplier invoices" value={String(data?.invoices.length ?? 0)} />
      <Stat label="Outstanding" value={gbp(totalOutstanding)} />
      <Stat label="Overdue" value={gbp(overdue)} />
      <Stat label="Active suppliers" value={String(data?.suppliers.length ?? 0)} />
    </section>

    <section className="grid gap-6 2xl:grid-cols-[minmax(420px,.9fr)_minmax(0,1.6fr)]">
      <Panel title="New supplier invoice" description="Totals are calculated server-side before the invoice is saved or posted.">
        <form className="space-y-4" onSubmit={(event) => void saveInvoice(event, "draft")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Supplier"><select required className="input" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value, purchase_order_id: "" })}><option value="">Select supplier…</option>{data?.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}{supplier.account_reference ? ` · ${supplier.account_reference}` : ""}</option>)}</select></Field>
            <Field label="Purchase order"><select className="input" value={form.purchase_order_id} onChange={(e) => setForm({ ...form, purchase_order_id: e.target.value })}><option value="">No linked PO</option>{supplierPOs.map((po) => <option key={po.id} value={po.id}>{po.order_number} · {po.supplier_name}</option>)}</select></Field>
            <Field label="Supplier invoice number"><input required className="input" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></Field>
            <Field label="Supplier reference"><input className="input" value={form.supplier_reference} onChange={(e) => setForm({ ...form, supplier_reference: e.target.value })} /></Field>
            <Field label="Invoice date"><input required type="date" className="input" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} /></Field>
            <Field label="Due date"><input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between"><div><p className="font-black text-slate-950 dark:text-white">Invoice lines</p><p className="text-xs font-medium text-slate-500">Choose the expense/asset account and VAT code for each line.</p></div><button type="button" onClick={() => setLines((current) => [...current, blankLine()])} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700">+ Add line</button></div>
            {lines.map((line, index) => <div key={index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`Line ${index + 1} description`}><input required className="input" value={line.description} onChange={(e) => updateLine(index, "description", e.target.value)} /></Field>
                <Field label="Account"><select required className="input" value={line.account_id} onChange={(e) => updateLine(index, "account_id", e.target.value)}><option value="">Select account…</option>{usableAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select></Field>
                <Field label="Quantity"><input required min="0.001" step="0.001" type="number" className="input" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} /></Field>
                <Field label="Unit cost"><input required min="0" step="0.01" type="number" className="input" value={line.unit_cost} onChange={(e) => updateLine(index, "unit_cost", e.target.value)} /></Field>
                <Field label="VAT / tax code"><select className="input" value={line.tax_code_id} onChange={(e) => updateLine(index, "tax_code_id", e.target.value)}><option value="">No tax</option>{data?.taxCodes.map((code) => <option key={code.id} value={code.id}>{code.code} · {code.name} ({moneyNumber(code.rate)}%)</option>)}</select></Field>
                <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Line gross</p><p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{gbp(moneyNumber(Number(line.quantity || 0) * Number(line.unit_cost || 0)) * (1 + moneyNumber(taxById.get(line.tax_code_id)?.rate ?? 0) / 100))}</p></div>{lines.length > 1 && <button type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Remove</button>}</div>
              </div>
            </div>)}
          </div>

          <Field label="Notes"><textarea rows={3} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><div className="grid grid-cols-3 gap-3 text-sm"><Total label="Net" value={gbp(totals.net)} /><Total label="VAT / tax" value={gbp(totals.tax)} /><Total label="Total" value={gbp(totals.gross)} strong /></div></div>
          <div className="flex flex-wrap gap-2"><button disabled={saving} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Save draft</button><button disabled={saving} type="button" onClick={(event) => void saveInvoice(event as unknown as FormEvent, "posted")} className="rounded-xl bg-[#103D2E] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save & post"}</button></div>
        </form>
      </Panel>

      <Panel title="Supplier invoices" description="Posted invoices feed Accounts Payable through the existing Atlas queue and ledger.">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search supplier, invoice or status…" className="input sm:max-w-sm" /><button onClick={() => void load()} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold dark:border-slate-700">Refresh</button></div>
        <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead><tr>{["Supplier","Invoice","Date","Due","Status","Total","Paid","Outstanding","Actions"].map((head) => <th key={head} className="border-b border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:border-slate-800">{head}</th>)}</tr></thead><tbody>{filteredInvoices.map((invoice) => {
          const outstanding = Math.max(0, moneyNumber(invoice.total) - moneyNumber(invoice.amount_paid));
          return <tr key={invoice.id} className="align-top"><td className="cell font-bold text-slate-950 dark:text-white">{invoice.stock_suppliers?.name ?? "Supplier"}</td><td className="cell"><p className="font-bold">{invoice.invoice_number}</p>{invoice.supplier_reference && <p className="text-xs text-slate-500">{invoice.supplier_reference}</p>}</td><td className="cell">{invoice.invoice_date}</td><td className="cell">{invoice.due_date ?? "—"}</td><td className="cell"><Status value={invoice.status} /></td><td className="cell font-bold">{gbp(invoice.total, invoice.currency_code)}</td><td className="cell">{gbp(invoice.amount_paid, invoice.currency_code)}</td><td className="cell font-bold">{gbp(outstanding, invoice.currency_code)}</td><td className="cell"><div className="flex flex-wrap gap-2">{invoice.status === "draft" && <button disabled={saving} onClick={() => void postDraft(invoice)} className="rounded-lg bg-[#103D2E] px-3 py-2 text-xs font-bold text-white">Post</button>}{["posted","part_paid"].includes(invoice.status) && outstanding > 0.009 && <button disabled={saving} onClick={() => openPayment(invoice)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700">Record payment</button>}</div></td></tr>;
        })}{!filteredInvoices.length && <tr><td colSpan={9} className="px-3 py-10 text-center font-semibold text-slate-500">No supplier invoices found.</td></tr>}</tbody></table></div>
      </Panel>
    </section>

    {selectedInvoice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedInvoice(null); }}><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-700">Supplier payment</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{selectedInvoice.invoice_number}</h2><p className="text-sm text-slate-500">Outstanding {gbp(Number(selectedInvoice.total) - Number(selectedInvoice.amount_paid), selectedInvoice.currency_code)}</p></div><button onClick={() => setSelectedInvoice(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-slate-700">Close</button></div><form onSubmit={(event) => void recordPayment(event)} className="mt-5 space-y-4"><Field label="Amount"><input required min="0.01" step="0.01" type="number" className="input" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></Field><Field label="Payment date"><input required type="date" className="input" value={payment.payment_date} onChange={(e) => setPayment({ ...payment, payment_date: e.target.value })} /></Field><Field label="Bank account"><select className="input" value={payment.bank_account_id} onChange={(e) => setPayment({ ...payment, bank_account_id: e.target.value })}><option value="">Default ledger bank account</option>{data?.bankAccounts.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}{bank.bank_name ? ` · ${bank.bank_name}` : ""}</option>)}</select></Field><Field label="Reference"><input className="input" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></Field><button disabled={saving} className="w-full rounded-xl bg-[#103D2E] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Recording…" : "Record supplier payment"}</button></form></div></div>}

    <style jsx global>{`.input{width:100%;border-radius:.75rem;border:1px solid rgb(226 232 240);background:white;padding:.7rem .8rem;font-size:.875rem;color:rgb(15 23 42);outline:none}.input:focus{border-color:#103D2E;box-shadow:0 0 0 2px rgba(16,61,46,.12)}.cell{border-bottom:1px solid rgb(241 245 249);padding:.75rem}.dark .input{border-color:rgb(51 65 85);background:rgb(15 23 42);color:rgb(241 245 249)}.dark .cell{border-color:rgb(30 41 59)}`}</style>
  </main>;
}

function Panel({ title: panelTitle, description, children }: { title: string; description?: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"><h2 className="text-lg font-black text-slate-950 dark:text-white">{panelTitle}</h2>{description && <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>}<div className="mt-5">{children}</div></section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>{children}</label>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p></div>; }
function Total({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 ${strong ? "text-xl" : "text-base"} font-black text-slate-950 dark:text-white`}>{value}</p></div>; }
function Status({ value }: { value: string }) { const cls = value === "paid" ? "bg-emerald-100 text-emerald-800" : value === "part_paid" ? "bg-amber-100 text-amber-800" : value === "posted" ? "bg-blue-100 text-blue-800" : value === "void" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${cls}`}>{title(value)}</span>; }
