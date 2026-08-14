"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Branch={id:string;name:string;code:string;isHeadOffice:boolean};
export default function FinanceBranchSwitcher({branches,accessibleIds,activeFinanceBranchId,financeScope}:{branches:Branch[];accessibleIds:string[];activeFinanceBranchId:string|null;financeScope:string}){
 const router=useRouter(); const [busy,setBusy]=useState(false); const allowed=new Set(accessibleIds); const options=branches.filter(b=>allowed.has(b.id)); const canAll=financeScope==="company"||financeScope==="selected";
 if(options.length<=1||financeScope==="none")return null;
 return <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold shadow-sm dark:border-slate-800 dark:bg-slate-950"><span className="text-slate-500">Finance depot</span><select disabled={busy} value={activeFinanceBranchId??"all"} onChange={async e=>{setBusy(true);try{const r=await fetch("/api/auth/finance-branch-context",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({branchId:e.target.value})});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to switch finance depot.");router.refresh();window.location.reload();}finally{setBusy(false);}}} className="bg-transparent font-black outline-none">{canAll?<option value="all">All accessible depots</option>:null}{options.map(b=><option key={b.id} value={b.id}>{b.name}{b.isHeadOffice?" · Head Office":""}</option>)}</select></label>;
}
