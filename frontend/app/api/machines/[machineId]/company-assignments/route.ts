import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedUserContext} from "@/lib/auth/require-permission";
import {createSupabaseAdmin} from "@/lib/payments/supabase-admin";
export const runtime="nodejs";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function owner(machineId:string){const ctx=await getAuthenticatedUserContext();if(!ctx?.companyId)return null;
 if(!ctx.permissions.includes("settings.manage"))return null;
 const admin=createSupabaseAdmin();const m=await admin.from("machines").select("id").eq("id",machineId).eq("company_id",ctx.companyId).maybeSingle();
 return m.data?{ctx,admin}:null;}
export async function GET(_req:NextRequest,{params}:{params:Promise<{machineId:string}>}){
 const {machineId}=await params;if(!UUID.test(machineId))return NextResponse.json({error:"Invalid machine"},{status:400});
 const a=await owner(machineId);if(!a)return NextResponse.json({error:"Not permitted"},{status:403});
 const r=await a.admin.from("machine_company_assignments").select("id,assigned_company_id,can_view_machine,can_receive_breakdowns,can_view_operator_reports,enabled").eq("machine_id",machineId).eq("owner_company_id",a.ctx.companyId);
 return r.error?NextResponse.json({error:"Unable to load"},{status:500}):NextResponse.json({assignments:r.data});}
export async function PUT(req:NextRequest,{params}:{params:Promise<{machineId:string}>}){
 const {machineId}=await params;if(!UUID.test(machineId))return NextResponse.json({error:"Invalid machine"},{status:400});
 const a=await owner(machineId);if(!a)return NextResponse.json({error:"Not permitted"},{status:403});
 let b:Record<string,unknown>;try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(typeof b.companyId!=="string"||!UUID.test(b.companyId)||b.companyId===a.ctx.companyId)return NextResponse.json({error:"Invalid company"},{status:400});
 const exists=await a.admin.from("companies").select("id").eq("id",b.companyId).maybeSingle();if(!exists.data)return NextResponse.json({error:"Company not found"},{status:404});
 const r=await a.admin.from("machine_company_assignments").upsert({machine_id:machineId,owner_company_id:a.ctx.companyId,assigned_company_id:b.companyId,can_view_machine:b.canViewMachine===true,can_receive_breakdowns:b.canReceiveBreakdowns===true,can_view_operator_reports:b.canViewOperatorReports===true,enabled:b.enabled===true},{onConflict:"machine_id,assigned_company_id"});
 return r.error?NextResponse.json({error:"Unable to save assignment"},{status:500}):NextResponse.json({ok:true});}
