import {NextResponse} from "next/server";
import {getAuthenticatedUserContext} from "@/lib/auth/require-permission";
import {createSupabaseAdmin} from "@/lib/payments/supabase-admin";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{reportId:string}>}){
 const auth=await getAuthenticatedUserContext();if(!auth?.companyId)return NextResponse.json({error:"Sign in required"},{status:401});
 if(!auth.permissions.includes("machines.edit")&&!auth.permissions.includes("settings.manage"))return NextResponse.json({error:"Not permitted"},{status:403});
 const {reportId}=await params;if(!/^[0-9a-f-]{36}$/i.test(reportId))return NextResponse.json({error:"Invalid report"},{status:400});
 const admin=createSupabaseAdmin();
 const {data:report,error}=await admin.from("machine_operator_submissions").select("id,company_id,machine_id,kind,operator_name,hours,checks,description,severity,status,created_at,created_job_id").eq("id",reportId).maybeSingle();
 if(error||!report)return NextResponse.json({error:"Report not found"},{status:404});
 let allowed=report.company_id===auth.companyId;
 if(!allowed){const assignment=await admin.from("machine_company_assignments").select("id").eq("machine_id",report.machine_id).eq("assigned_company_id",auth.companyId).eq("enabled",true).eq("can_view_operator_reports",true).maybeSingle();allowed=!!assignment.data;}
 if(!allowed)return NextResponse.json({error:"Report not available to this company"},{status:404});
 const {data:machine}=await admin.from("machines").select("id,customer_id,make,model").eq("id",report.machine_id).maybeSingle();
 return NextResponse.json({report,machine,canReview:report.company_id===auth.companyId,canCreateJob:report.company_id===auth.companyId&&auth.permissions.includes("jobs.edit")&&auth.operationsScope!=="own_jobs"&&(auth.operationsScope==="company"||auth.accessibleOperationalBranchIds.length>0)},{headers:{"Cache-Control":"no-store"}});
}
