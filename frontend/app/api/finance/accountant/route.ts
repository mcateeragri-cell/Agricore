import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany } from "@/lib/platform/core";
export const dynamic="force-dynamic"; const n=(v:unknown)=>Number(v??0)||0, m=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
export async function GET(request:NextRequest){
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

 const auth=await getAuthenticatedUserContext(); if(!auth)return NextResponse.json({error:"Authentication required."},{status:401}); if(!canManageCompany(auth)&&!auth.permissions.includes("finance.reports"))return NextResponse.json({error:"Finance reporting permission is required."},{status:403});
 const admin=createSupabaseAdmin(); const from=request.nextUrl.searchParams.get("from")||`${new Date().getUTCFullYear()}-01-01`; const to=request.nextUrl.searchParams.get("to")||new Date().toISOString().slice(0,10);
 const {data,error}=await admin.from("finance_journal_lines").select("id,debit,credit,tax_amount,description,finance_accounts!inner(code,name,account_type,system_key),finance_journals!inner(id,journal_date,reference,description,source_type,source_id,source_action,status)").eq("company_id",auth.companyId).gte("finance_journals.journal_date",from).lte("finance_journals.journal_date",to).order("id"); if(error)return NextResponse.json({error:error.message},{status:500});
 const balances=new Map<string,{code:string;name:string;type:string;debit:number;credit:number}>(); const journals=new Map<string,Record<string,unknown>>(); let taxOutput=0,taxInput=0;
 for(const row of data??[]){const a=row.finance_accounts as unknown as {code:string;name:string;account_type:string;system_key:string|null}; const j=row.finance_journals as unknown as {id:string;journal_date:string;reference:string|null;description:string|null;source_type:string|null;source_id:string|null;source_action:string;status:string}; const key=a.code; const b=balances.get(key)||{code:a.code,name:a.name,type:a.account_type,debit:0,credit:0}; b.debit+=n(row.debit); b.credit+=n(row.credit); balances.set(key,b); if(!journals.has(j.id))journals.set(j.id,{...j,debit:0,credit:0}); const jj=journals.get(j.id)!; jj.debit=n(jj.debit)+n(row.debit); jj.credit=n(jj.credit)+n(row.credit); if(a.system_key==="tax_payable"){taxOutput+=n(row.credit);taxInput+=n(row.debit);} }
 const trialBalance=[...balances.values()].map(b=>({...b,debit:m(b.debit),credit:m(b.credit),balance:m(b.debit-b.credit)})).sort((a,b)=>a.code.localeCompare(b.code)); const journalRows=[...journals.values()].sort((a,b)=>String(b.journal_date).localeCompare(String(a.journal_date)));
 if(request.nextUrl.searchParams.get("format")==="csv"){const esc=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`; const csv=["Code,Account,Type,Debits,Credits,Balance",...trialBalance.map(r=>[r.code,r.name,r.type,r.debit,r.credit,r.balance].map(esc).join(","))].join("\n"); return new NextResponse(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename=agricore-trial-balance-${from}-to-${to}.csv`}});}
 return NextResponse.json({from,to,trialBalance,journals:journalRows,taxSummary:{outputTax:m(taxOutput),inputTax:m(taxInput),netTax:m(taxOutput-taxInput)}},{headers:{"Cache-Control":"no-store"}});
}
