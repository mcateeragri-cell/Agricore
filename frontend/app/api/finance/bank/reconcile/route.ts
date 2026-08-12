import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany, writePlatformAudit } from "@/lib/platform/core";
export const dynamic = "force-dynamic";
function allowed(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) { return canManageCompany(auth) || auth.permissions.includes("settings.manage") || auth.permissions.includes("finance.manage"); }
const money=(v:unknown)=>Math.round((Number(v??0)+Number.EPSILON)*100)/100;

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUserContext(); if (!auth) return NextResponse.json({error:"Authentication required."},{status:401}); if(!allowed(auth))return NextResponse.json({error:"Finance management permission is required."},{status:403});
  const body=await request.json().catch(()=>({})); const transactionId=String(body.bank_transaction_id??"").trim(); const journalId=String(body.journal_id??"").trim()||null; const supplierPaymentId=String(body.supplier_payment_id??"").trim()||null; const amount=money(body.matched_amount); if(!transactionId||(!journalId&&!supplierPaymentId)||amount<=0)return NextResponse.json({error:"Transaction, match target and positive matched amount are required."},{status:400});
  const admin=createSupabaseAdmin(); const {data,error}=await admin.from("finance_bank_reconciliation_matches").insert({company_id:auth.companyId,bank_transaction_id:transactionId,journal_id:journalId,supplier_payment_id:supplierPaymentId,matched_amount:amount,matched_by:auth.userId,notes:String(body.notes??"").trim().slice(0,500)||null}).select("id").single(); if(error)return NextResponse.json({error:error.message},{status:500});
  await writePlatformAudit(admin,{companyId:auth.companyId,userId:auth.userId,entityType:"finance_bank_transaction",entityId:transactionId,entityReference:transactionId,action:"finance_bank_transaction_matched",metadata:{match_id:data.id,journal_id:journalId,supplier_payment_id:supplierPaymentId,matched_amount:amount}}); return NextResponse.json({matchId:data.id});
}

export async function PATCH(request: NextRequest) {
  const auth=await getAuthenticatedUserContext(); if(!auth)return NextResponse.json({error:"Authentication required."},{status:401}); if(!allowed(auth))return NextResponse.json({error:"Finance management permission is required."},{status:403}); const body=await request.json().catch(()=>({})); const id=String(body.id??"").trim(); const status=String(body.status??"").trim(); if(!id||status!=="ignored")return NextResponse.json({error:"Only the ignored reconciliation status can be set manually."},{status:400});
  const admin=createSupabaseAdmin(); const {error}=await admin.from("finance_bank_transactions").update({reconciliation_status:"ignored",updated_at:new Date().toISOString()}).eq("company_id",auth.companyId).eq("id",id); if(error)return NextResponse.json({error:error.message},{status:500}); await writePlatformAudit(admin,{companyId:auth.companyId,userId:auth.userId,entityType:"finance_bank_transaction",entityId:id,entityReference:id,action:"finance_bank_transaction_ignored"}); return NextResponse.json({ok:true});
}
