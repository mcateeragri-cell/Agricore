import { NextRequest,NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
export const runtime="nodejs";export const dynamic="force-dynamic";
async function access(){
 const auth=await getAuthenticatedUserContext();
 if(!auth)return {error:NextResponse.json({error:"Authentication required."},{status:401})} as const;
 if(auth.platformRole!=="super_admin"&&auth.platformRole!=="platform_admin")
  return {error:NextResponse.json({error:"Platform administrator access is required."},{status:403})} as const;
 return {auth,admin:createSupabaseAdmin(),error:null} as const;
}
export async function GET(){
 const a=await access();if(a.error)return a.error;const{admin}=a;
 const p=await admin.from("network_provider_profiles").select("*,companies(company_name,slug,billing_mode,is_active)").order("updated_at",{ascending:false});
 const r=await admin.from("network_provider_reports").select("*").in("status",["open","reviewing"]).order("created_at",{ascending:false}).limit(200);
 if(p.error||r.error)return NextResponse.json({error:(p.error||r.error)?.message},{status:500});
 return NextResponse.json({providers:p.data??[],reports:r.data??[]},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest){
 const a=await access();if(a.error)return a.error;const{auth,admin}=a;const body=await request.json().catch(()=>({})) as Record<string,unknown>;
 const id=String(body.profile_id??"").trim(),action=String(body.action??"").trim();if(!id)return NextResponse.json({error:"Provider profile is required."},{status:400});
 const profile=await admin.from("network_provider_profiles").select("id,company_id,approval_status,companies(slug,billing_mode,is_active)").eq("id",id).maybeSingle();
 if(!profile.data)return NextResponse.json({error:"Provider not found."},{status:404});
 const company=(profile.data as any).companies;
 if(company?.billing_mode==="demo"||String(company?.slug??"").startsWith("demo-"))return NextResponse.json({error:"Demo workspaces cannot be approved."},{status:403});
 const now=new Date().toISOString();
 if(["approve","reject","suspend"].includes(action)){
  const status=action==="approve"?"approved":action==="reject"?"rejected":"suspended";
  const upd=await admin.from("network_provider_profiles").update({
   approval_status:status,reviewed_at:now,reviewed_by:auth.userId,
   suspension_reason:action==="suspend"?String(body.reason??"").trim()||"Suspended by AgriCore":null,
  }).eq("id",id);
  if(upd.error)return NextResponse.json({error:upd.error.message},{status:500});return NextResponse.json({saved:true});
 }
 if(["business","identity","insurance"].includes(action)){
  const key=`${action}_verification`;const value=String(body.value??"verified");
  const allowed=action==="insurance"?["not_checked","verified","expired","failed"]:["not_checked","verified","failed"];
  if(!allowed.includes(value))return NextResponse.json({error:"Invalid verification status."},{status:400});
  const payload:any={[key]:value,reviewed_at:now,reviewed_by:auth.userId};
  if(action==="insurance"&&body.insurance_expiry)payload.insurance_expiry=String(body.insurance_expiry);
  const upd=await admin.from("network_provider_profiles").update(payload).eq("id",id);
  if(upd.error)return NextResponse.json({error:upd.error.message},{status:500});return NextResponse.json({saved:true});
 }
 if(action==="resolve_report"){
  const reportId=String(body.report_id??"").trim();
  const upd=await admin.from("network_provider_reports").update({status:"resolved",reviewed_at:now,reviewed_by:auth.userId}).eq("id",reportId);
  if(upd.error)return NextResponse.json({error:upd.error.message},{status:500});return NextResponse.json({saved:true});
 }
 return NextResponse.json({error:"Unsupported action."},{status:400});
}