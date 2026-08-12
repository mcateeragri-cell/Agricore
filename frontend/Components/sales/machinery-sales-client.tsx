"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgePoundSterling, ClipboardCheck, Handshake, Plus, RefreshCcw, Tractor, TrendingUp } from "lucide-react";

import { useRegionalFormatters } from "@/lib/client/use-regional-formatters";

type Opportunity = {
  id: string;
  customer_id: string | null;
  title: string;
  stage: string;
  source: string | null;
  estimated_value: number | string | null;
  probability: number | string | null;
  assigned_to: string | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type StockMachine = {
  id: string;
  stock_number: string | null;
  make: string;
  model: string;
  machine_type: string | null;
  year: number | null;
  registration: string | null;
  serial_number: string | null;
  hours: number | string | null;
  condition: string;
  cost_price: number | string | null;
  asking_price: number | string | null;
  status: string;
  location: string | null;
  description: string | null;
};

type TradeIn = {
  id: string;
  opportunity_id: string | null;
  customer_machine_id: string | null;
  make: string;
  model: string;
  year: number | null;
  registration: string | null;
  serial_number: string | null;
  hours: number | string | null;
  valuation: number | string | null;
  allowance: number | string | null;
  status: string;
  notes: string | null;
};

type Customer = { id: string; business_name: string | null; contact_name: string | null };
type CustomerMachine = { id: string; customer_id: string; make: string | null; model: string | null; year: number | null; registration: string | null; serial_number: string | null; hours: number | string | null };

type SalesResponse = {
  opportunities?: Opportunity[];
  stock?: StockMachine[];
  tradeIns?: TradeIn[];
  customers?: Customer[];
  machines?: CustomerMachine[];
  canManage?: boolean;
  error?: string;
};

const stages = ["lead", "qualified", "quoted", "negotiation", "won", "lost"];
const stockStatuses = ["incoming", "available", "workshop", "reserved", "sold"];
const tradeStatuses = ["appraising", "offered", "accepted", "declined", "received"];

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function MachinerySalesClient({ networkEnabled = false }: { networkEnabled?: boolean }) {
  const { money, date } = useRegionalFormatters();
  const [data, setData] = useState<SalesResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"pipeline" | "stock" | "tradeins">("pipeline");
  const [modal, setModal] = useState<null | "opportunity" | "stock" | "tradein">(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sales", { cache: "no-store" });
      const body = (await response.json()) as SalesResponse;
      if (!response.ok) throw new Error(body.error || "Unable to load machinery sales.");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load machinery sales.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const customerById = useMemo(() => new Map((data.customers ?? []).map((customer) => [customer.id, customer])), [data.customers]);
  const opportunityById = useMemo(() => new Map((data.opportunities ?? []).map((opportunity) => [opportunity.id, opportunity])), [data.opportunities]);

  const metrics = useMemo(() => {
    const open = (data.opportunities ?? []).filter((item) => !["won", "lost"].includes(item.stage));
    const pipelineValue = open.reduce((total, item) => total + asNumber(item.estimated_value), 0);
    const weighted = open.reduce((total, item) => total + asNumber(item.estimated_value) * (asNumber(item.probability) / 100), 0);
    const stockValue = (data.stock ?? []).filter((item) => item.status !== "sold").reduce((total, item) => total + asNumber(item.asking_price), 0);
    return { open: open.length, pipelineValue, weighted, stockValue };
  }, [data.opportunities, data.stock]);

  async function update(action: string, id: string, values: Record<string, unknown>) {
    setError("");
    const response = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, values }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to update sales record.");
    await load();
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: modal === "opportunity" ? "create_opportunity" : modal === "stock" ? "create_stock" : "create_trade_in",
          values,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to create sales record.");
      setModal(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create sales record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Enterprise</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Machinery Sales CRM</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">Run sales opportunities, stock machines and trade-ins alongside the same customers, machines and service history already held in AgriCore.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {networkEnabled ? <Link href="/sales/network" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">Enterprise Network</Link> : null}
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><RefreshCcw className="h-4 w-4" /> Refresh</button>
            {data.canManage ? <button type="button" onClick={() => setModal(tab === "pipeline" ? "opportunity" : tab === "stock" ? "stock" : "tradein")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white"><Plus className="h-4 w-4" /> Add {tab === "pipeline" ? "opportunity" : tab === "stock" ? "stock machine" : "trade-in"}</button> : null}
          </div>
        </header>

        {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Handshake className="h-5 w-5" />} label="Open opportunities" value={String(metrics.open)} />
          <Metric icon={<TrendingUp className="h-5 w-5" />} label="Pipeline value" value={money(metrics.pipelineValue)} />
          <Metric icon={<BadgePoundSterling className="h-5 w-5" />} label="Weighted pipeline" value={money(metrics.weighted)} />
          <Metric icon={<Tractor className="h-5 w-5" />} label="Stock asking value" value={money(metrics.stockValue)} />
        </section>

        <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          {(["pipeline", "stock", "tradeins"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === item ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{item === "tradeins" ? "Trade-ins" : titleCase(item)}</button>)}
        </nav>

        {loading ? <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading machinery sales…</div> : null}

        {!loading && tab === "pipeline" ? (
          <section className="mt-6 grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
            {stages.map((stage) => {
              const rows = (data.opportunities ?? []).filter((item) => item.stage === stage);
              return <div key={stage} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between"><h2 className="font-black text-slate-950 dark:text-white">{titleCase(stage)}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{rows.length}</span></div>
                <div className="mt-4 space-y-3">
                  {rows.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs font-semibold text-slate-400 dark:border-slate-700">No opportunities</p> : rows.map((row) => {
                    const customer = row.customer_id ? customerById.get(row.customer_id) : null;
                    return <article key={row.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                      <p className="font-black text-slate-950 dark:text-white">{row.title}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{customer?.business_name || customer?.contact_name || "No customer linked"}</p>
                      <p className="mt-3 text-lg font-black text-emerald-800 dark:text-emerald-300">{money(asNumber(row.estimated_value))}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{asNumber(row.probability)}% probability{row.expected_close_date ? ` · ${date(`${row.expected_close_date}T12:00:00`)}` : ""}</p>
                      {data.canManage ? <select value={row.stage} onChange={(event) => void update("update_opportunity", row.id, { stage: event.target.value })} className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-black dark:border-slate-700 dark:bg-slate-950">{stages.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select> : null}
                    </article>;
                  })}
                </div>
              </div>;
            })}
          </section>
        ) : null}

        {!loading && tab === "stock" ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(data.stock ?? []).map((row) => <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-emerald-700">{row.stock_number || "Stock machine"}</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{row.make} {row.model}</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{titleCase(row.status)}</span></div>
              <p className="mt-2 text-sm font-semibold text-slate-500">{[row.year, row.registration, row.hours ? `${row.hours} hrs` : null, titleCase(row.condition)].filter(Boolean).join(" · ")}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/70"><div><p className="text-xs font-black uppercase text-slate-500">Cost</p><p className="mt-1 font-black text-slate-900 dark:text-white">{money(asNumber(row.cost_price))}</p></div><div><p className="text-xs font-black uppercase text-slate-500">Asking</p><p className="mt-1 font-black text-emerald-800 dark:text-emerald-300">{money(asNumber(row.asking_price))}</p></div></div>
              {data.canManage ? <select value={row.status} onChange={(event) => void update("update_stock", row.id, { status: event.target.value })} className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black dark:border-slate-700 dark:bg-slate-950">{stockStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select> : null}
            </article>)}
            {(data.stock ?? []).length === 0 ? <Empty icon={<Tractor className="h-7 w-7" />} text="No stock machines yet." /> : null}
          </section>
        ) : null}

        {!loading && tab === "tradeins" ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(data.tradeIns ?? []).map((row) => <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-amber-700">Trade-in</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{row.make} {row.model}</h2></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">{titleCase(row.status)}</span></div>
              <p className="mt-2 text-sm font-semibold text-slate-500">{[row.year, row.registration, row.hours ? `${row.hours} hrs` : null].filter(Boolean).join(" · ")}</p>
              {row.opportunity_id ? <p className="mt-3 text-xs font-bold text-slate-500">Linked to: {opportunityById.get(row.opportunity_id)?.title || "Sales opportunity"}</p> : null}
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/70"><div><p className="text-xs font-black uppercase text-slate-500">Valuation</p><p className="mt-1 font-black text-slate-900 dark:text-white">{money(asNumber(row.valuation))}</p></div><div><p className="text-xs font-black uppercase text-slate-500">Allowance</p><p className="mt-1 font-black text-emerald-800 dark:text-emerald-300">{money(asNumber(row.allowance))}</p></div></div>
              {data.canManage ? <select value={row.status} onChange={(event) => void update("update_trade_in", row.id, { status: event.target.value })} className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black dark:border-slate-700 dark:bg-slate-950">{tradeStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select> : null}
            </article>)}
            {(data.tradeIns ?? []).length === 0 ? <Empty icon={<ClipboardCheck className="h-7 w-7" />} text="No trade-ins being appraised." /> : null}
          </section>
        ) : null}
      </div>

      {modal ? <SalesModal type={modal} customers={data.customers ?? []} machines={data.machines ?? []} opportunities={data.opportunities ?? []} saving={saving} onClose={() => setModal(null)} onSubmit={create} /> : null}
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{icon}</div><p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{value}</p></div>;
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-900">{icon}<p className="mt-3 text-sm font-black">{text}</p></div>;
}

function SalesModal({ type, customers, machines, opportunities, saving, onClose, onSubmit }: { type: "opportunity" | "stock" | "tradein"; customers: Customer[]; machines: CustomerMachine[]; opportunities: Opportunity[]; saving: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-3 py-10 backdrop-blur-sm" onMouseDown={onClose}><form onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">Machinery Sales</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Add {type === "opportunity" ? "sales opportunity" : type === "stock" ? "stock machine" : "trade-in"}</h2></div><button type="button" onClick={onClose} className="rounded-xl border px-3 py-2 text-sm font-black">Close</button></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {type === "opportunity" ? <>
        <Field name="title" label="Opportunity title *" placeholder="T7.300 replacement" required />
        <label className="text-sm font-black text-slate-700 dark:text-slate-200">Customer<select name="customer_id" className="mt-2 w-full rounded-xl border px-3 py-3 dark:bg-slate-950"><option value="">No customer yet</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.business_name || customer.contact_name || "Unnamed customer"}</option>)}</select></label>
        <label className="text-sm font-black text-slate-700 dark:text-slate-200">Stage<select name="stage" defaultValue="lead" className="mt-2 w-full rounded-xl border px-3 py-3 dark:bg-slate-950">{stages.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
        <Field name="estimated_value" label="Estimated value" type="number" step="0.01" />
        <Field name="probability" label="Probability %" type="number" defaultValue="10" min="0" max="100" />
        <Field name="assigned_to" label="Salesperson" />
        <Field name="expected_close_date" label="Expected close" type="date" />
        <Field name="source" label="Lead source" placeholder="Referral / website / existing customer" />
        <Area name="notes" label="Notes" />
      </> : null}

      {type === "stock" ? <>
        <Field name="stock_number" label="Stock number" />
        <Field name="make" label="Make *" required />
        <Field name="model" label="Model *" required />
        <Field name="machine_type" label="Machine type" />
        <Field name="year" label="Year" type="number" />
        <Field name="hours" label="Hours" type="number" step="0.1" />
        <Field name="registration" label="Registration" />
        <Field name="serial_number" label="Serial number" />
        <label className="text-sm font-black text-slate-700 dark:text-slate-200">Condition<select name="condition" defaultValue="used" className="mt-2 w-full rounded-xl border px-3 py-3 dark:bg-slate-950"><option value="new">New</option><option value="used">Used</option><option value="ex-demo">Ex-demo</option></select></label>
        <label className="text-sm font-black text-slate-700 dark:text-slate-200">Status<select name="status" defaultValue="available" className="mt-2 w-full rounded-xl border px-3 py-3 dark:bg-slate-950">{stockStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
        <Field name="cost_price" label="Cost price" type="number" step="0.01" />
        <Field name="asking_price" label="Asking price" type="number" step="0.01" />
        <Field name="location" label="Location" />
        <Area name="description" label="Description" />
      </> : null}

      {type === "tradein" ? <>
        <label className="text-sm font-black text-slate-700 dark:text-slate-200">Opportunity<select name="opportunity_id" className="mt-2 w-full rounded-xl border px-3 py-3 dark:bg-slate-950"><option value="">No opportunity linked</option>{opportunities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="text-sm font-black text-slate-700 dark:text-slate-200">Existing customer machine<select name="customer_machine_id" className="mt-2 w-full rounded-xl border px-3 py-3 dark:bg-slate-950"><option value="">Enter manually</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{[machine.make, machine.model, machine.registration].filter(Boolean).join(" · ")}</option>)}</select></label>
        <Field name="make" label="Make (if entering manually)" />
        <Field name="model" label="Model (if entering manually)" />
        <Field name="year" label="Year" type="number" />
        <Field name="hours" label="Hours" type="number" step="0.1" />
        <Field name="registration" label="Registration" />
        <Field name="serial_number" label="Serial number" />
        <Field name="valuation" label="Valuation" type="number" step="0.01" />
        <Field name="allowance" label="Trade allowance" type="number" step="0.01" />
        <Area name="notes" label="Appraisal notes" />
      </> : null}
    </div>
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border px-5 py-3 text-sm font-black">Cancel</button><button disabled={saving} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div>
  </form></div>;
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return <label className="text-sm font-black text-slate-700 dark:text-slate-200">{label}<input {...rest} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>;
}

function Area({ name, label }: { name: string; label: string }) {
  return <label className="sm:col-span-2 text-sm font-black text-slate-700 dark:text-slate-200">{label}<textarea name={name} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>;
}
