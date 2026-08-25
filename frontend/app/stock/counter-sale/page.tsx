"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Card from "@/Components/ui/Card";
import WorkspaceHeader from "@/Components/ui/WorkspaceHeader";
import StockProNav from "@/Components/stock/StockProNav";
import { useRegionalFormatters } from "@/lib/client/use-regional-formatters";

type Item = {
  id:string; part_number:string|null; description:string; category:string|null; manufacturer:string|null;
  unit:string|null; unit_price:number; vat_rate:number; barcode:string|null;
  quantity_in_stock:number; quantity_reserved:number; quantity_available:number;
};
type Customer = { id:string; business_name:string|null; contact_name:string|null; email:string|null; phone:string|null; address:string|null; postcode:string|null };
type Branch = { id:string; code:string|null; name:string };
type Line = { stockItemId:string; description:string; partNumber:string; quantity:number; unitPrice:number; vatRate:number; discountPercent:number; available:number };

export default function CounterSalePage() {
  const router = useRouter();
  const { money } = useRegionalFormatters();
  const [items,setItems]=useState<Item[]>([]);
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [branches,setBranches]=useState<Branch[]>([]);
  const [branchId,setBranchId]=useState("");
  const [search,setSearch]=useState("");
  const [customerSearch,setCustomerSearch]=useState("");
  const [customerId,setCustomerId]=useState("");
  const [walkInName,setWalkInName]=useState("");
  const [walkInEmail,setWalkInEmail]=useState("");
  const [walkInPhone,setWalkInPhone]=useState("");
  const [paymentMethod,setPaymentMethod]=useState("account");
  const [markPaid,setMarkPaid]=useState(false);
  const [notes,setNotes]=useState("");
  const [lines,setLines]=useState<Line[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{ void (async()=>{
    setLoading(true); setError("");
    try {
      const r=await fetch("/api/stock/counter-sale",{cache:"no-store"}); const b=await r.json();
      if(!r.ok) throw new Error(b.error||"Unable to load counter sale.");
      setItems(b.items??[]); setCustomers(b.customers??[]); setBranches(b.branches??[]);
      setBranchId(b.activeBranchId || b.branches?.[0]?.id || "");
    } catch(e){setError(e instanceof Error?e.message:"Unable to load counter sale.");}
    finally{setLoading(false)}
  })();},[]);

  const matches=useMemo(()=>{
    const q=search.trim().toLowerCase(); if(!q) return [];
    return items.filter(i=>[i.part_number,i.description,i.barcode,i.manufacturer].some(v=>v?.toLowerCase().includes(q))).slice(0,12);
  },[items,search]);
  const customerMatches=useMemo(()=>{
    const q=customerSearch.trim().toLowerCase(); if(!q) return [];
    return customers.filter(c=>[c.business_name,c.contact_name,c.phone,c.email].some(v=>v?.toLowerCase().includes(q))).slice(0,10);
  },[customers,customerSearch]);

  function add(item:Item){
    setLines(current=>{
      const found=current.find(l=>l.stockItemId===item.id);
      if(found) return current.map(l=>l.stockItemId===item.id?{...l,quantity:Math.min(l.quantity+1,l.available)}:l);
      return [...current,{stockItemId:item.id,description:item.description,partNumber:item.part_number||"",quantity:1,unitPrice:Number(item.unit_price||0),vatRate:Number(item.vat_rate||20),discountPercent:0,available:Number(item.quantity_available||0)}];
    });
    setSearch("");
  }
  function update(id:string, field:keyof Line, value:number){
    setLines(current=>current.map(l=>l.stockItemId===id?{...l,[field]:field==="quantity"?Math.min(Math.max(0,value),l.available):Math.max(0,value)}:l));
  }

  const totals=useMemo(()=>lines.reduce((a,l)=>{
    const net=l.quantity*l.unitPrice*(1-Math.min(100,l.discountPercent)/100);
    const vat=net*(l.vatRate/100);
    return {net:a.net+net,vat:a.vat+vat,total:a.total+net+vat};
  },{net:0,vat:0,total:0}),[lines]);

  async function complete(){
    setSaving(true); setError("");
    try{
      const r=await fetch("/api/stock/counter-sale",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        branchId,customerId:customerId||null,walkInName,walkInEmail,walkInPhone,paymentMethod,markPaid,notes,
        lines:lines.map(l=>({stockItemId:l.stockItemId,quantity:l.quantity,unitPrice:l.unitPrice,discountPercent:l.discountPercent}))
      })});
      const b=await r.json(); if(!r.ok) throw new Error(b.error||"Unable to complete sale.");
      router.push(`/invoices/${b.invoice_id}`);
    }catch(e){setError(e instanceof Error?e.message:"Unable to complete sale.");}
    finally{setSaving(false)}
  }

  return <div className="w-full space-y-6 px-5 py-5 lg:px-7">
    <WorkspaceHeader eyebrow="Parts" title="Counter Sale" description="Create a parts-only invoice directly from live stock without opening a workshop job."
      actions={<><StockProNav/><Link href="/invoices?scope=parts" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Parts invoices</Link></>}/>
    {error?<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>:null}
    {loading?<Card><div className="p-6">Loading counter sale…</div></Card>:<>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-6">
          <Card><div className="space-y-4 p-5">
            <div><h2 className="text-lg font-bold">1. Customer</h2><p className="text-sm text-slate-500">Choose an account customer, or leave blank for a walk-in sale.</p></div>
            <div className="relative">
              <input value={customerSearch} onChange={e=>{setCustomerSearch(e.target.value);setCustomerId("");}} placeholder="Search customer, phone or email…" className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3"/>
              {customerMatches.length?<div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-white shadow-xl dark:bg-slate-900">{customerMatches.map(c=><button type="button" key={c.id} onClick={()=>{setCustomerId(c.id);setCustomerSearch(c.business_name||c.contact_name||"Customer");}} className="block w-full border-b px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"><b>{c.business_name||c.contact_name}</b><div className="text-xs text-slate-500">{[c.contact_name,c.phone,c.email].filter(Boolean).join(" • ")}</div></button>)}</div>:null}
            </div>
            {!customerId?<div className="grid gap-3 md:grid-cols-3">
              <input value={walkInName} onChange={e=>setWalkInName(e.target.value)} placeholder="Walk-in name (optional)" className="rounded-xl border border-slate-200 bg-transparent px-4 py-3"/>
              <input value={walkInPhone} onChange={e=>setWalkInPhone(e.target.value)} placeholder="Phone (optional)" className="rounded-xl border border-slate-200 bg-transparent px-4 py-3"/>
              <input value={walkInEmail} onChange={e=>setWalkInEmail(e.target.value)} placeholder="Email (optional)" className="rounded-xl border border-slate-200 bg-transparent px-4 py-3"/>
            </div>:null}
          </div></Card>

          <Card><div className="space-y-4 p-5">
            <div><h2 className="text-lg font-bold">2. Add parts</h2><p className="text-sm text-slate-500">Search by part number, description or barcode.</p></div>
            <div className="relative">
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Scan barcode or search stock…" className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 text-base"/>
              {matches.length?<div className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border bg-white shadow-xl dark:bg-slate-900">{matches.map(i=><button type="button" disabled={i.quantity_available<=0} key={i.id} onClick={()=>add(i)} className="flex w-full items-center justify-between border-b px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800"><span><b>{i.part_number||"No part no."}</b> — {i.description}<span className="block text-xs text-slate-500">{i.manufacturer||i.category||"Part"}</span></span><span className="text-right text-sm"><b>{money(Number(i.unit_price||0))}</b><span className="block text-xs text-slate-500">{i.quantity_available} available</span></span></button>)}</div>:null}
            </div>

            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500"><th className="py-3">Part</th><th>Qty</th><th>Price</th><th>Discount %</th><th>VAT</th><th className="text-right">Line total</th><th></th></tr></thead>
              <tbody>{lines.map(l=>{const net=l.quantity*l.unitPrice*(1-l.discountPercent/100);const total=net*(1+l.vatRate/100);return <tr key={l.stockItemId} className="border-b">
                <td className="py-3"><b>{l.partNumber||"—"}</b><div>{l.description}</div><div className="text-xs text-slate-500">{l.available} available</div></td>
                <td><input type="number" min="0.001" max={l.available} step="1" value={l.quantity} onChange={e=>update(l.stockItemId,"quantity",Number(e.target.value))} className="w-20 rounded-lg border bg-transparent px-2 py-2"/></td>
                <td><input type="number" min="0" step=".01" value={l.unitPrice} onChange={e=>update(l.stockItemId,"unitPrice",Number(e.target.value))} className="w-24 rounded-lg border bg-transparent px-2 py-2"/></td>
                <td><input type="number" min="0" max="100" step=".1" value={l.discountPercent} onChange={e=>update(l.stockItemId,"discountPercent",Number(e.target.value))} className="w-20 rounded-lg border bg-transparent px-2 py-2"/></td>
                <td>{l.vatRate}%</td><td className="text-right font-semibold">{money(total)}</td>
                <td><button type="button" onClick={()=>setLines(x=>x.filter(v=>v.stockItemId!==l.stockItemId))} className="rounded-lg px-3 py-2 font-bold text-red-600">Remove</button></td>
              </tr>})}</tbody>
            </table>{!lines.length?<div className="py-10 text-center text-sm text-slate-500">No parts added yet.</div>:null}</div>
          </div></Card>
        </div>

        <div className="space-y-6">
          <Card><div className="space-y-4 p-5">
            <h2 className="text-lg font-bold">3. Complete sale</h2>
            {branches.length>1?<label className="block text-sm font-semibold">Depot<select value={branchId} onChange={e=>setBranchId(e.target.value)} className="mt-1 w-full rounded-xl border bg-transparent px-3 py-3">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>:null}
            <label className="block text-sm font-semibold">Payment<select value={paymentMethod} onChange={e=>{setPaymentMethod(e.target.value);setMarkPaid(e.target.value!=="account");}} className="mt-1 w-full rounded-xl border bg-transparent px-3 py-3"><option value="account">On account</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></label>
            <label className="flex items-center gap-3 rounded-xl border p-3"><input type="checkbox" checked={markPaid} onChange={e=>setMarkPaid(e.target.checked)}/><span><b>Mark paid now</b><span className="block text-xs text-slate-500">Records the invoice as fully paid at the counter.</span></span></label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Sale notes (optional)" className="w-full rounded-xl border bg-transparent px-3 py-3"/>
            <div className="space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span>Net</span><b>{money(totals.net)}</b></div><div className="flex justify-between"><span>VAT</span><b>{money(totals.vat)}</b></div><div className="flex justify-between text-xl"><span>Total</span><b>{money(totals.total)}</b></div></div>
            <button type="button" disabled={saving||!lines.length||!branchId} onClick={complete} className="w-full rounded-xl bg-[var(--brand-strong)] px-5 py-3.5 font-bold text-white disabled:opacity-50">{saving?"Completing sale…":markPaid?"Complete & mark paid":"Create parts invoice"}</button>
            <p className="text-xs text-slate-500">Stock is deducted atomically when the invoice is created. If stock has changed since you opened this screen, the sale is stopped rather than allowing negative stock.</p>
          </div></Card>
        </div>
      </div>
    </>}
  </div>;
}
