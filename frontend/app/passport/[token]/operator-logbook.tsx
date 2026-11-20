"use client";
import { useState } from "react";
type Kind="daily_check"|"hours"|"breakdown";
const items=[{key:"oil",name:"Engine oil"},{key:"coolant",name:"Coolant"},{key:"hydraulics",name:"Hydraulic oil"},{key:"tyres",name:"Tyres and wheels"},{key:"lights",name:"Lights and beacons"},{key:"brakes",name:"Brakes and steering"}];
export default function OperatorLogbook({token}:{token:string}) {
 const [kind,setKind]=useState<Kind>("daily_check");const [pin,setPin]=useState("");const [operatorName,setOperatorName]=useState("");
 const [hours,setHours]=useState("");const [description,setDescription]=useState("");const [severity,setSeverity]=useState("medium");
 const [checks,setChecks]=useState<Record<string,string>>({});const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");
 try{const body={pin,kind,operatorName,hours:hours.trim()?Number(hours):null,description,severity,checks};
 const res=await fetch(`/api/passport/${encodeURIComponent(token)}/submit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
 const data=await res.json();if(!res.ok)throw new Error(data.error||"Submission failed");setMessage(data.message||"Saved");setDescription("");setChecks({});setPin("");}
 catch(e){setError(e instanceof Error?e.message:"Submission failed")}finally{setBusy(false)} }
 const input="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900";
 return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"><h3 className="text-xl font-bold">Operator logbook</h3><p className="text-sm text-slate-600">Enter the machine operator PIN to submit a record. Submissions are reviewed by the responsible company; they do not automatically create jobs.</p>
 <form onSubmit={submit} className="space-y-4">
 <label className="block text-sm font-semibold">Record type<select className={input} value={kind} onChange={e=>{setKind(e.target.value as Kind);setMessage("");}}><option value="daily_check">Daily inspection</option><option value="hours">Engine hours</option><option value="breakdown">Breakdown / defect</option></select></label>
 <label className="block text-sm font-semibold">Operator name<input className={input} maxLength={100} required minLength={2} value={operatorName} onChange={e=>setOperatorName(e.target.value)}/></label>
 <label className="block text-sm font-semibold">Operator PIN<input className={input} type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required value={pin} onChange={e=>setPin(e.target.value)}/></label>
 {kind!=="breakdown"&&<label className="block text-sm font-semibold">Current engine hours<input className={input} type="number" min="0" max="9999999" step="0.1" required value={hours} onChange={e=>setHours(e.target.value)}/></label>}
 {kind==="daily_check"&&<fieldset className="space-y-3"><legend className="font-semibold">Daily safety checks</legend>{items.map(item=><div key={item.key} className="flex items-center justify-between gap-2 text-sm"><span>{item.name}</span><select aria-label={item.name} required className="rounded border border-slate-300 p-2" value={checks[item.key]||""} onChange={e=>setChecks(old=>({...old,[item.key]:e.target.value}))}><option value="">Select</option><option value="pass">Pass</option><option value="fail">Fail</option></select></div>)}</fieldset>}
 {kind==="breakdown"&&<label className="block text-sm font-semibold">Urgency<select className={input} value={severity} onChange={e=>setSeverity(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical — stop machine</option></select></label>}
 {kind!=="hours"&&<label className="block text-sm font-semibold">{kind==="breakdown"?"Describe the breakdown":"Notes / failed checks"}<textarea className={input} maxLength={2000} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label>}
 {error&&<p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message&&<p role="status" className="rounded bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
 <button disabled={busy} className="rounded-lg bg-emerald-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?"Submitting…":"Submit record"}</button></form></section>;
}
