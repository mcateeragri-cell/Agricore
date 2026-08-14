"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, PackageSearch, ShieldCheck, X } from "lucide-react";

type Stage = { id: string; name: string; slug: string; gate_type?: string; gate_required?: boolean };
type PartRequirement = { id: string; stock_item_id?: string | null; part_number?: string | null; description: string; quantity_required: number; status: string; supplier_eta?: string | null; notes?: string | null };
type QcItem = { id: string; label: string; description: string; required: boolean; result: string; notes: string };
type Payload = {
  job: { id: string; jobNumber: string; status: string };
  stage: Stage | null;
  parts: PartRequirement[];
  stockItems: Array<{ id: string; part_number?: string | null; description?: string | null }>;
  qc: QcItem[];
  approval: { status: string; note?: string | null; approved_at?: string | null } | null;
  warranty: { warranty_type?: string | null; manufacturer?: string | null; claim_reference?: string | null; claim_status?: string | null; review_status?: string | null; expected_value?: number | null; reimbursed_value?: number | null; notes?: string | null } | null;
  gateStatus: { partsComplete: boolean; qcComplete: boolean; managerApproved: boolean; warrantyReviewed: boolean };
  canManage: boolean;
  error?: string;
};

const partStatuses = [["required","Required"],["reserved","Reserved"],["ordered","Ordered"],["backorder","Back order"],["available","Available"],["received","Received"],["waived","Waived"]];

export default function WorkshopJobControls({ jobId, jobLabel, onClose, onChanged }: { jobId: string; jobLabel: string; onClose: () => void; onChanged?: () => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newPart, setNewPart] = useState({ stockItemId: "", description: "", quantityRequired: "1", supplierEta: "" });
  const [approvalNote, setApprovalNote] = useState("");
  const [warranty, setWarranty] = useState({ warrantyType: "", manufacturer: "", claimReference: "", claimStatus: "draft", reviewStatus: "pending", expectedValue: "", reimbursedValue: "", notes: "" });

  const load = useCallback(async () => {
    setError("");
    const response = await fetch(`/api/workshop/job-controls/${jobId}`, { cache: "no-store" });
    const body = (await response.json()) as Payload;
    if (!response.ok) throw new Error(body.error || "Unable to load workshop controls.");
    setData(body);
    if (body.warranty) setWarranty({
      warrantyType: String(body.warranty.warranty_type ?? ""), manufacturer: String(body.warranty.manufacturer ?? ""), claimReference: String(body.warranty.claim_reference ?? ""), claimStatus: String(body.warranty.claim_status ?? "draft"), reviewStatus: String(body.warranty.review_status ?? "pending"), expectedValue: body.warranty.expected_value == null ? "" : String(body.warranty.expected_value), reimbursedValue: body.warranty.reimbursed_value == null ? "" : String(body.warranty.reimbursed_value), notes: String(body.warranty.notes ?? "")
    });
  }, [jobId]);

  useEffect(() => { void load().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load workshop controls.")); }, [load]);

  async function action(payload: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/workshop/job-controls/${jobId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = (await response.json()) as Payload;
      if (!response.ok) throw new Error(body.error || "Unable to update workshop controls.");
      setData(body); onChanged?.();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update workshop controls."); }
    finally { setBusy(false); }
  }

  const activeGate = data?.stage?.gate_type || "none";
  const gateComplete = useMemo(() => {
    if (!data) return false;
    if (activeGate === "waiting_parts") return data.gateStatus.partsComplete;
    if (activeGate === "quality_check") return data.gateStatus.qcComplete;
    if (activeGate === "manager_approval") return data.gateStatus.managerApproved;
    if (activeGate === "warranty_review") return data.gateStatus.warrantyReviewed;
    return true;
  }, [activeGate, data]);

  return <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/35 backdrop-blur-[1px]" onMouseDown={onClose}>
    <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl dark:bg-slate-950" onMouseDown={(event)=>event.stopPropagation()}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Workshop controls</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{jobLabel}</h2>{data?.stage?<p className="mt-1 text-sm font-semibold text-slate-500">{data.stage.name} · {data.stage.gate_required?(gateComplete?"Gate complete":"Action required"):"No mandatory gate"}</p>:null}</div>
        <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"><X className="h-5 w-5"/></button>
      </header>
      <div className="space-y-5 p-5">
        {error?<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div>:null}
        {!data?<p className="text-sm font-bold text-slate-500">Loading controls…</p>:<>
          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2"><PackageSearch className="h-4 w-4 text-amber-600"/><h3 className="font-black">Waiting parts</h3><Status ok={data.gateStatus.partsComplete}/></div>
            <div className="mt-4 space-y-2">{data.parts.length===0?<p className="text-xs font-semibold text-slate-500">No required parts recorded.</p>:data.parts.map((row)=><div key={row.id} className="grid gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:grid-cols-[1fr_145px] sm:items-center"><div><p className="text-sm font-black">{row.part_number?`${row.part_number} · `:""}{row.description}</p><p className="text-xs text-slate-500">Qty {row.quantity_required}{row.supplier_eta?` · ETA ${row.supplier_eta}`:""}</p></div><select disabled={!data.canManage||busy} value={row.status} onChange={(e)=>void action({action:"update_part",id:row.id,status:e.target.value,supplierEta:row.supplier_eta||"",notes:row.notes||""})} className="rounded-lg border px-2 py-2 text-xs font-bold dark:bg-slate-950">{partStatuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>)}</div>
            {data.canManage?<div className="mt-4 grid gap-2 sm:grid-cols-2"><select value={newPart.stockItemId} onChange={(e)=>{const id=e.target.value;const item=data.stockItems.find((row)=>String(row.id)===id);setNewPart((current)=>({...current,stockItemId:id,description:item?.description||current.description}))}} className="rounded-xl border px-3 py-2.5 text-sm font-bold dark:bg-slate-900"><option value="">Manual / non-stock part</option>{data.stockItems.map((item)=><option key={item.id} value={item.id}>{item.part_number||"Part"} · {item.description||""}</option>)}</select><input value={newPart.description} onChange={(e)=>setNewPart({...newPart,description:e.target.value})} placeholder="Part description" className="rounded-xl border px-3 py-2.5 text-sm dark:bg-slate-900"/><input type="number" min="0.001" step="0.001" value={newPart.quantityRequired} onChange={(e)=>setNewPart({...newPart,quantityRequired:e.target.value})} className="rounded-xl border px-3 py-2.5 text-sm dark:bg-slate-900"/><input type="date" value={newPart.supplierEta} onChange={(e)=>setNewPart({...newPart,supplierEta:e.target.value})} className="rounded-xl border px-3 py-2.5 text-sm dark:bg-slate-900"/><button disabled={busy||!newPart.description.trim()} onClick={()=>void action({action:"add_part",...newPart})} className="rounded-xl bg-[#103D2E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50 sm:col-span-2">Add required part</button></div>:null}
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-cyan-700"/><h3 className="font-black">Quality control</h3><Status ok={data.gateStatus.qcComplete}/></div>
            <div className="mt-4 space-y-2">{data.qc.map((item)=><div key={item.id} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-sm font-black">{item.label}{item.required?" *":""}</p>{item.description?<p className="text-xs text-slate-500">{item.description}</p>:null}</div><div className="flex gap-1">{[["pass","Pass"],["fail","Fail"],["not_applicable","N/A"]].map(([value,label])=><button key={value} disabled={!data.canManage||busy} onClick={()=>void action({action:"set_qc",qcItemId:item.id,result:value,notes:item.notes})} className={`rounded-lg border px-2.5 py-1.5 text-xs font-black ${item.result===value?"border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30":"border-slate-200 dark:border-slate-700"}`}>{label}</button>)}</div></div>)}</div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-700"/><h3 className="font-black">Manager approval</h3><Status ok={data.gateStatus.managerApproved}/></div><p className="mt-2 text-xs font-semibold text-slate-500">Latest status: {data.approval?.status||"Not reviewed"}</p>{data.canManage?<div className="mt-3 space-y-2"><textarea value={approvalNote} onChange={(e)=>setApprovalNote(e.target.value)} placeholder="Approval note (optional)" className="min-h-20 w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900"/><div className="flex gap-2"><button disabled={busy} onClick={()=>void action({action:"approval",status:"approved",note:approvalNote})} className="rounded-xl bg-[#103D2E] px-4 py-2 text-sm font-black text-white">Approve</button><button disabled={busy} onClick={()=>void action({action:"approval",status:"rejected",note:approvalNote})} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-black text-red-700">Reject</button></div></div>:null}</section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-700"/><h3 className="font-black">Warranty review</h3><Status ok={data.gateStatus.warrantyReviewed}/></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><select disabled={!data.canManage} value={warranty.warrantyType} onChange={(e)=>setWarranty({...warranty,warrantyType:e.target.value})} className="rounded-xl border px-3 py-2.5 text-sm font-bold dark:bg-slate-900"><option value="">Select type…</option><option value="manufacturer">Manufacturer warranty</option><option value="dealer_goodwill">Dealer goodwill</option><option value="internal">Internal warranty</option><option value="not_warranty">Not warranty</option></select><input disabled={!data.canManage} value={warranty.manufacturer} onChange={(e)=>setWarranty({...warranty,manufacturer:e.target.value})} placeholder="Manufacturer" className="rounded-xl border px-3 py-2.5 text-sm dark:bg-slate-900"/><input disabled={!data.canManage} value={warranty.claimReference} onChange={(e)=>setWarranty({...warranty,claimReference:e.target.value})} placeholder="Claim reference" className="rounded-xl border px-3 py-2.5 text-sm dark:bg-slate-900"/><select disabled={!data.canManage} value={warranty.claimStatus} onChange={(e)=>setWarranty({...warranty,claimStatus:e.target.value})} className="rounded-xl border px-3 py-2.5 text-sm font-bold dark:bg-slate-900"><option value="draft">Draft</option><option value="ready">Ready</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="paid">Paid</option><option value="not_applicable">Not applicable</option></select><input disabled={!data.canManage} type="number" step="0.01" value={warranty.expectedValue} onChange={(e)=>setWarranty({...warranty,expectedValue:e.target.value})} placeholder="Expected value" className="rounded-xl border px-3 py-2.5 text-sm dark:bg-slate-900"/><input disabled={!data.canManage} type="number" step="0.01" value={warranty.reimbursedValue} onChange={(e)=>setWarranty({...warranty,reimbursedValue:e.target.value})} placeholder="Reimbursed value" className="rounded-xl border px-3 py-2.5 text-sm dark:bg-slate-900"/><textarea disabled={!data.canManage} value={warranty.notes} onChange={(e)=>setWarranty({...warranty,notes:e.target.value})} placeholder="Warranty notes" className="min-h-20 rounded-xl border px-3 py-2.5 text-sm dark:bg-slate-900 sm:col-span-2"/>{data.canManage?<div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} onClick={()=>void action({action:"warranty",...warranty,reviewStatus:warranty.warrantyType==="not_warranty"?"not_warranty":"reviewed"})} className="rounded-xl bg-[#103D2E] px-4 py-2.5 text-sm font-black text-white">Save review</button><button disabled={busy} onClick={()=>void action({action:"warranty",...warranty,warrantyType:"not_warranty",reviewStatus:"not_warranty",claimStatus:"not_applicable"})} className="rounded-xl border px-4 py-2.5 text-sm font-black">Mark not warranty</button></div>:null}</div></section>
        </>}
      </div>
    </aside>
  </div>;
}

function Status({ok}:{ok:boolean}){return <span className={`ml-auto rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${ok?"bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300":"bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>{ok?"Complete":"Action needed"}</span>}
