"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AccountRow = { id:string; code:string; name:string; type:string; balance:number };
type ReportPayload = {
  from:string; to:string;
  profitLoss:{ income:AccountRow[]; expenses:AccountRow[]; revenue:number; expenseTotal:number; netProfit:number };
  balanceSheet:{ assets:AccountRow[]; liabilities:AccountRow[]; equity:AccountRow[]; assetTotal:number; liabilityTotal:number; equityTotal:number; balanceCheck:number };
  cashSummary:{ bank:number; receivables:number; payables:number };
  agedCreditors:{ buckets:{current:number;days30:number;days60:number;days90:number;older:number}; total:number; invoices:Array<{id:string;invoiceNumber:string;supplier:string;dueDate:string|null;invoiceDate:string;outstanding:number}> };
};

const gbp=(v:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(v||0);

export default function FinancialReportsClient(){
  const now=new Date();
  const [from,setFrom]=useState(`${now.getUTCFullYear()}-01-01`);
  const [to,setTo]=useState(now.toISOString().slice(0,10));
  const [data,setData]=useState<ReportPayload|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch(`/api/finance/reports?from=${from}&to=${to}`,{cache:"no-store"});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to load financial reports.");setData(b);}catch(e){setError(e instanceof Error?e.message:"Unable to load financial reports.");}finally{setLoading(false);}},[from,to]);
  useEffect(()=>{void load();},[load]);
  const status=useMemo(()=>Math.abs(data?.balanceSheet.balanceCheck??0)<=0.01?"Balanced":"Review required",[data]);
  return <main className="w-full space-y-6 px-5 py-5 lg:px-7">
    <div><p className="text-sm font-semibold text-emerald-700">Atlas Finance</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Financial reports</h1><p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Profit & loss, balance sheet, cash summary and aged creditors generated from the posted ledger.</p></div>
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><Field label="From"><input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)}/></Field><Field label="To"><input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)}/></Field><button onClick={()=>void load()} className="rounded-xl bg-[#103D2E] px-4 py-2.5 text-sm font-bold text-white">Refresh</button></div>
    {error&&<p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    {loading&&!data&&<p className="text-sm font-semibold text-slate-500">Loading financial reports…</p>}
    {data&&<>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Bank" value={gbp(data.cashSummary.bank)}/><Stat label="Receivables" value={gbp(data.cashSummary.receivables)}/><Stat label="Payables" value={gbp(data.cashSummary.payables)}/><Stat label="Net profit" value={gbp(data.profitLoss.netProfit)}/></section>
      <Panel title="Profit & loss" description={`${data.from} to ${data.to}`}><AccountTable rows={[...data.profitLoss.income,...data.profitLoss.expenses]}/><div className="mt-4 grid gap-3 sm:grid-cols-3"><Total label="Revenue" value={gbp(data.profitLoss.revenue)}/><Total label="Expenses" value={gbp(data.profitLoss.expenseTotal)}/><Total label="Net profit" value={gbp(data.profitLoss.netProfit)} strong/></div></Panel>
      <Panel title="Balance sheet" description={`Position at ${data.to} · ${status}`}><AccountTable rows={[...data.balanceSheet.assets,...data.balanceSheet.liabilities,...data.balanceSheet.equity]}/><div className="mt-4 grid gap-3 sm:grid-cols-4"><Total label="Assets" value={gbp(data.balanceSheet.assetTotal)}/><Total label="Liabilities" value={gbp(data.balanceSheet.liabilityTotal)}/><Total label="Equity + current profit" value={gbp(data.balanceSheet.equityTotal)}/><Total label="Balance check" value={gbp(data.balanceSheet.balanceCheck)} strong/></div></Panel>
      <Panel title="Aged creditors" description="Outstanding supplier invoices grouped by how far past due they are."><div className="grid gap-3 sm:grid-cols-5"><Stat label="Current" value={gbp(data.agedCreditors.buckets.current)}/><Stat label="1–30 days" value={gbp(data.agedCreditors.buckets.days30)}/><Stat label="31–60 days" value={gbp(data.agedCreditors.buckets.days60)}/><Stat label="61–90 days" value={gbp(data.agedCreditors.buckets.days90)}/><Stat label="90+ days" value={gbp(data.agedCreditors.buckets.older)}/></div><div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr>{["Supplier","Invoice","Invoice date","Due","Outstanding"].map(h=><th key={h} className="border-b border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:border-slate-800">{h}</th>)}</tr></thead><tbody>{data.agedCreditors.invoices.map(r=><tr key={r.id}><td className="cell font-bold">{r.supplier}</td><td className="cell">{r.invoiceNumber}</td><td className="cell">{r.invoiceDate}</td><td className="cell">{r.dueDate??"—"}</td><td className="cell font-bold">{gbp(r.outstanding)}</td></tr>)}{!data.agedCreditors.invoices.length&&<tr><td colSpan={5} className="px-3 py-8 text-center font-semibold text-slate-500">No outstanding supplier invoices.</td></tr>}</tbody></table></div></Panel>
    </>}
    <style jsx global>{`.input{border-radius:.75rem;border:1px solid rgb(226 232 240);background:white;padding:.65rem .8rem;font-size:.875rem;color:rgb(15 23 42);outline:none}.dark .input{border-color:rgb(51 65 85);background:rgb(15 23 42);color:rgb(241 245 249)}.cell{border-bottom:1px solid rgb(241 245 249);padding:.7rem .75rem;color:rgb(51 65 85)}.dark .cell{border-color:rgb(30 41 59);color:rgb(226 232 240)}`}</style>
  </main>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block text-xs font-black uppercase tracking-wide text-slate-500">{label}<div className="mt-1">{children}</div></label>}
function Stat({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{value}</p></div>}
function Panel({title,description,children}:{title:string;description?:string;children:React.ReactNode}){return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"><h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2>{description&&<p className="mt-1 text-sm font-medium text-slate-500">{description}</p>}<div className="mt-5">{children}</div></section>}
function AccountTable({rows}:{rows:AccountRow[]}){return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr>{["Code","Account","Type","Balance"].map(h=><th key={h} className="border-b border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:border-slate-800">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className="cell">{r.code}</td><td className="cell font-bold">{r.name}</td><td className="cell capitalize">{r.type}</td><td className="cell font-bold">{gbp(r.balance)}</td></tr>)}</tbody></table></div>}
function Total({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 ${strong?"text-xl":"text-base"} font-black text-slate-950 dark:text-white`}>{value}</p></div>}
