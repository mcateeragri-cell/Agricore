import { NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany } from "@/lib/platform/core";
export const dynamic = "force-dynamic";
const n=(v:unknown)=>Number(v??0)||0, m=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
export async function GET(){
 const auth=await getAuthenticatedUserContext(); if(!auth)return NextResponse.json({error:"Authentication required."},{status:401}); if(!canManageCompany(auth)&&!auth.permissions.includes("finance.reports"))return NextResponse.json({error:"Finance reporting permission is required."},{status:403});
 const admin=createSupabaseAdmin(); const today=new Date().toISOString().slice(0,10); const yearStart=`${new Date().getUTCFullYear()}-01-01`;
 const [invoices,credits,journals,issues]=await Promise.all([
  admin.from("invoices").select("id,status,total,amount_paid,due_date,issue_date").eq("company_id",auth.companyId),
  admin.from("finance_credit_notes").select("total,status,issue_date").eq("company_id",auth.companyId).eq("status","issued"),
  admin.from("finance_journal_lines").select("debit,credit,finance_accounts!inner(system_key,account_type),finance_journals!inner(journal_date,status)").eq("company_id",auth.companyId).gte("finance_journals.journal_date",yearStart),
  admin.from("finance_validation_issues").select("id",{count:"exact",head:true}).eq("company_id",auth.companyId).eq("status","open")
 ]);
 const error=invoices.error||credits.error||journals.error||issues.error; if(error)return NextResponse.json({error:error.message},{status:500});
 const inv=invoices.data??[]; const outstanding=m(inv.filter(x=>x.status!=="void").reduce((s,x)=>s+Math.max(0,n(x.total)-n(x.amount_paid)),0));
 const overdue=m(inv.filter(x=>x.status!=="void"&&x.due_date&&x.due_date<today&&n(x.total)>n(x.amount_paid)).reduce((s,x)=>s+(n(x.total)-n(x.amount_paid)),0));
 let bank=0,revenue=0,expenses=0,tax=0; for(const row of journals.data??[]){const a=(row.finance_accounts as unknown as {system_key:string|null;account_type:string}); const debit=n(row.debit),credit=n(row.credit); if(a.system_key==="bank")bank+=debit-credit; if(a.account_type==="income")revenue+=credit-debit; if(a.account_type==="expense")expenses+=debit-credit; if(a.system_key==="tax_payable")tax+=credit-debit;}
 return NextResponse.json({summary:{cashPosition:m(bank),outstandingInvoices:outstanding,overdueReceivables:overdue,revenueYtd:m(revenue),expensesYtd:m(expenses),profitYtd:m(revenue-expenses),taxLiability:m(tax),creditsIssued:m((credits.data??[]).reduce((s,x)=>s+n(x.total),0)),openValidationIssues:issues.count??0},recentInvoices:inv.slice(0,10)}, {headers:{"Cache-Control":"no-store"}});
}
