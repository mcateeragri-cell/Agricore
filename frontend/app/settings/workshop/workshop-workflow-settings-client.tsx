"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";

type Stage = { id?: string; name: string; slug: string; position?: number; status_mapping?: string; statusMapping?: string; colour: string; is_terminal?: boolean; isTerminal?: boolean; gate_type?: string; gateType?: string; gate_required?: boolean; gateRequired?: boolean };

type Payload = { workflow?: { id: string; name: string } | null; stages?: Stage[]; canManage?: boolean; error?: string };
type QcItem = { id?: string; label: string; description?: string; required: boolean };

const gateOptions = [["none","No stage control"],["waiting_parts","Waiting parts gate"],["quality_check","Quality check gate"],["manager_approval","Manager approval gate"],["warranty_review","Warranty review gate"]];

const statusOptions = [
  ["open", "Open"], ["scheduled", "Scheduled"], ["in_progress", "In progress"],
  ["waiting_parts", "Waiting parts"], ["waiting_customer", "Waiting customer"], ["completed", "Completed"],
];

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }

export default function WorkshopWorkflowSettingsClient() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [qcItems, setQcItems] = useState<QcItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [workflowResponse, qcResponse] = await Promise.all([fetch("/api/workshop/workflow", { cache: "no-store" }), fetch("/api/workshop/qc-template", { cache: "no-store" })]);
    const body = (await workflowResponse.json()) as Payload;
    const qcBody = await qcResponse.json();
    if (!workflowResponse.ok) throw new Error(body.error || "Unable to load workshop workflow.");
    if (!qcResponse.ok) throw new Error(qcBody.error || "Unable to load QC template.");
    setStages((body.stages ?? []).map((stage) => ({ ...stage, statusMapping: stage.status_mapping, isTerminal: stage.is_terminal, gateType: stage.gate_type || "none", gateRequired: Boolean(stage.gate_required) })));
    setQcItems((qcBody.items ?? []).map((item:any)=>({id:item.id,label:item.label,description:item.description||"",required:item.required!==false})));
    setCanManage(Boolean(body.canManage));
  }

  useEffect(() => { void load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load workflow.")); }, []);

  function update(index: number, patch: Partial<Stage>) { setStages((current) => current.map((stage, i) => i === index ? { ...stage, ...patch } : stage)); }
  function move(index: number, direction: -1 | 1) {
    setStages((current) => { const next=[...current]; const target=index+direction; if(target<0||target>=next.length)return current; [next[index],next[target]]=[next[target],next[index]]; return next; });
  }
  function add() { setStages((current) => [...current, { name: "New stage", slug: `stage_${current.length + 1}`, statusMapping: "in_progress", colour: "#0f766e", isTerminal: false, gateType: "none", gateRequired: false }]); }
  function remove(index: number) { if (stages.length <= 2) return; setStages((current) => current.filter((_, i) => i !== index)); }


  async function saveQc() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/workshop/qc-template", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: qcItems }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save QC template.");
      setMessage("Quality control template saved.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save QC template."); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/workshop/workflow", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages: stages.map((stage) => ({ ...stage, slug: slugify(stage.slug || stage.name), statusMapping: stage.statusMapping || stage.status_mapping || "in_progress", isTerminal: Boolean(stage.isTerminal ?? stage.is_terminal), gateType: stage.gateType || stage.gate_type || "none", gateRequired: Boolean(stage.gateRequired ?? stage.gate_required) })) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save workflow.");
      setMessage("Workshop workflow saved.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save workflow."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <header><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Administration · Workshop</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Workshop workflow</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Configure the stages your workshop actually uses. Each stage maps back to a safe AgriCore job status so Dispatch, Calendar, Technician and reporting remain compatible.</p></header>
    {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div> : null}
    {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</div> : null}
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Workflow stages</h2><p className="mt-1 text-xs font-semibold text-slate-500">Drag/drop on the Workshop board uses this order.</p></div>{canManage ? <button onClick={add} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black"><Plus className="h-4 w-4"/>Add stage</button> : null}</div>
      <div className="mt-5 space-y-3">{stages.map((stage,index)=><div key={stage.id || `${stage.slug}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-[auto_minmax(170px,1fr)_minmax(150px,.75fr)_minmax(170px,.8fr)_110px_auto] lg:items-center">
        <div className="flex gap-1"><button disabled={!canManage||index===0} onClick={()=>move(index,-1)} className="rounded-lg border p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4"/></button><button disabled={!canManage||index===stages.length-1} onClick={()=>move(index,1)} className="rounded-lg border p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4"/></button></div>
        <label className="text-xs font-black text-slate-600">Stage name<input disabled={!canManage} value={stage.name} onChange={(e)=>update(index,{name:e.target.value, slug: stage.id ? stage.slug : slugify(e.target.value)})} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-bold dark:bg-slate-900"/></label>
        <label className="text-xs font-black text-slate-600">AgriCore status<select disabled={!canManage} value={stage.statusMapping || stage.status_mapping || "in_progress"} onChange={(e)=>update(index,{statusMapping:e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-bold dark:bg-slate-900">{statusOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="text-xs font-black text-slate-600">Stage control<select disabled={!canManage} value={stage.gateType || stage.gate_type || "none"} onChange={(e)=>update(index,{gateType:e.target.value,gateRequired:e.target.value!=="none"})} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-bold dark:bg-slate-900">{gateOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <label className="text-xs font-black text-slate-600">Colour<input disabled={!canManage} type="color" value={stage.colour || "#0f766e"} onChange={(e)=>update(index,{colour:e.target.value})} className="mt-1 h-10 w-full rounded-xl border p-1"/></label>
        <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs font-black"><input disabled={!canManage || (stage.gateType || stage.gate_type || "none")==="none"} type="checkbox" checked={Boolean(stage.gateRequired ?? stage.gate_required)} onChange={(e)=>update(index,{gateRequired:e.target.checked})}/>Gate</label><label className="flex items-center gap-2 text-xs font-black"><input disabled={!canManage} type="checkbox" checked={Boolean(stage.isTerminal ?? stage.is_terminal)} onChange={(e)=>setStages((current)=>current.map((row,i)=>({...row,isTerminal:i===index?e.target.checked:false})))} />Terminal</label>{canManage ? <button disabled={stages.length<=2} onClick={()=>remove(index)} className="rounded-lg border p-2 text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button> : null}</div>
      </div>)}</div>
      {canManage ? <button disabled={busy} onClick={()=>void save()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#103D2E] px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4"/>{busy?"Saving…":"Save workflow"}</button> : null}
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Quality control template</h2><p className="mt-1 text-xs font-semibold text-slate-500">Required items must pass before a mandatory Quality Check stage can move on.</p></div>{canManage?<button onClick={()=>setQcItems((current)=>[...current,{label:"New QC item",description:"",required:true}])} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black"><Plus className="h-4 w-4"/>Add QC item</button>:null}</div>
      <div className="mt-5 space-y-3">{qcItems.map((item,index)=><div key={item.id||index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-[1fr_1.3fr_auto_auto] md:items-center"><input disabled={!canManage} value={item.label} onChange={(e)=>setQcItems((current)=>current.map((row,i)=>i===index?{...row,label:e.target.value}:row))} className="rounded-xl border px-3 py-2.5 text-sm font-bold dark:bg-slate-900"/><input disabled={!canManage} value={item.description||""} onChange={(e)=>setQcItems((current)=>current.map((row,i)=>i===index?{...row,description:e.target.value}:row))} placeholder="Optional guidance" className="rounded-xl border px-3 py-2.5 text-sm dark:bg-slate-900"/><label className="flex items-center gap-2 text-xs font-black"><input disabled={!canManage} type="checkbox" checked={item.required} onChange={(e)=>setQcItems((current)=>current.map((row,i)=>i===index?{...row,required:e.target.checked}:row))}/>Required</label>{canManage?<button disabled={qcItems.length<=1} onClick={()=>setQcItems((current)=>current.filter((_,i)=>i!==index))} className="rounded-lg border p-2 text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button>:null}</div>)}</div>
      {canManage?<button disabled={busy||!qcItems.length} onClick={()=>void saveQc()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#103D2E] px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4"/>{busy?"Saving…":"Save QC template"}</button>:null}
    </section>
  </main>;
}
