
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Depot = {
  id:string; code:string; name:string; branchType:string; isHeadOffice:boolean; address:string|null;
  manager:{userId:string;fullName:string}|null; openJobs:number; completedJobs:number; technicianCount:number;
  scheduledHours:number; capacityHours:number; loadPercent:number; invoiceTotal:number; outstanding:number;
  revenue:number; expenses:number; profit:number;
};
type Payload = { depots:Depot[]; totals:{openJobs:number;technicians:number;scheduledHours:number;capacityHours:number;loadPercent:number;revenue:number;expenses:number;profit:number;outstanding:number}; error?:string };

const money = (value:number) => new Intl.NumberFormat("en-GB", { style:"currency", currency:"GBP", maximumFractionDigits:0 }).format(value || 0);
function loadClass(value:number){return value>100?"bg-red-500":value>=85?"bg-amber-500":"bg-emerald-600";}

export default function DepotOverviewClient(){
  const [payload,setPayload]=useState<Payload|null>(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/enterprise/depots/overview",{cache:"no-store"});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to load depot overview.");setPayload(b);}catch(e){setError(e instanceof Error?e.message:"Unable to load depot overview.");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const depots=payload?.depots??[]; const totals=payload?.totals;
  const ranked=useMemo(()=>[...depots].sort((a,b)=>b.profit-a.profit),[depots]);
  if(loading)return <main className="mx-auto max-w-7xl p-8"><p className="font-bold text-slate-500">Loading depot performance…</p></main>;
  return <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-[.16em] text-emerald-700">Enterprise · Dealership group</p><h1 className="mt-2 text-3xl font-black tracking-tight">Depot performance</h1><p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Compare workshop loading, open work and financial performance across every depot you are allowed to see.</p></div><div className="flex gap-2"><Link href="/enterprise/transfers" className="rounded-xl bg-[#103D2E] px-4 py-3 text-sm font-black text-white">Transfer centre</Link><Link href="/settings/branches" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black">Manage depots</Link></div></header>
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div>}
    {totals&&<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["Open jobs",totals.openJobs],["Engineers",totals.technicians],["Workshop load",`${totals.loadPercent}%`],["Group revenue",money(totals.revenue)],["Group profit",money(totals.profit)]].map(([label,value])=><article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>)}</section>}
    <section className="grid gap-5 xl:grid-cols-2">{depots.map(depot=><article key={depot.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black">{depot.name}</h2>{depot.isHeadOffice&&<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase">Head office</span>}</div><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{depot.code} · {depot.branchType.replaceAll("_"," ")}</p><p className="mt-2 text-sm text-slate-500">Manager: {depot.manager?.fullName||"Not assigned"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${depot.loadPercent>100?"bg-red-50 text-red-700":depot.loadPercent>=85?"bg-amber-50 text-amber-800":"bg-emerald-50 text-emerald-800"}`}>{depot.loadPercent}% loaded</span></div>
      <div className="mt-5"><div className="flex justify-between text-xs font-bold text-slate-500"><span>{depot.scheduledHours.toFixed(1)} h scheduled</span><span>{depot.capacityHours.toFixed(1)} h capacity</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${loadClass(depot.loadPercent)}`} style={{width:`${Math.min(100,depot.loadPercent)}%`}}/></div></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Open jobs" value={String(depot.openJobs)}/><Metric label="Engineers" value={String(depot.technicianCount)}/><Metric label="Outstanding" value={money(depot.outstanding)}/><Metric label="Profit" value={money(depot.profit)}/></div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5 text-sm dark:border-slate-800"><div><p className="text-xs font-bold text-slate-500">Revenue</p><p className="mt-1 font-black">{money(depot.revenue)}</p></div><div><p className="text-xs font-bold text-slate-500">Expenses</p><p className="mt-1 font-black">{money(depot.expenses)}</p></div><div><p className="text-xs font-bold text-slate-500">Invoices</p><p className="mt-1 font-black">{money(depot.invoiceTotal)}</p></div></div>
    </article>)}</section>
    {ranked.length>1&&<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h2 className="text-xl font-black">Branch profitability ranking</h2><div className="mt-5 space-y-3">{ranked.map((depot,index)=><div key={depot.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-black shadow-sm dark:bg-slate-800">{index+1}</span><div><p className="font-black">{depot.name}</p><p className="text-xs text-slate-500">{depot.openJobs} open jobs · {depot.loadPercent}% workshop load</p></div></div><p className="font-black">{money(depot.profit)}</p></div>)}</div></section>}
  </main>;
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>}
