import { NextRequest,NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
export const runtime="nodejs";export const dynamic="force-dynamic";
const bad=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:NextRequest){
 const ctx=await getAuthenticatedUserContext();if(!ctx?.companyId)return bad("Sign in required",401);
 if(!ctx.permissions.includes("machines.edit")&&!ctx.permissions.includes("settings.manage"))return bad("Not permitted",403);
 const admin=createSupabaseAdmin();const machineId=req.nextUrl.searchParams.get("machineId");
 if(!machineId||!/^[0-9a-f-]{36}$/i.test(machineId))return bad("Machine ID required",400);
 const owned=await admin.from("machines").select("id").eq("id",machineId).eq("company_id",ctx.companyId).maybeSingle();
 let allowed=!!owned.data;
 if(!allowed){const assignment=await admin.from("machine_company_assignments").select("id").eq("machine_id",machineId).eq("assigned_company_id",ctx.companyId).eq("enabled",true).eq("can_view_operator_reports",true).maybeSingle();allowed=!!assignment.data;}
 if(!allowed)return bad("Machine not available to your company",403);
 const result=await admin.from("machine_operator_submissions").select("id,kind,operator_name,hours,checks,description,severity,status,created_at").eq("machine_id",machineId).order("created_at",{ascending:false}).limit(100);
 if(result.error)return bad("Unable to load reports",500);
 return NextResponse.json({reports:result.data??[]},{headers:{"Cache-Control":"no-store"}});
}
