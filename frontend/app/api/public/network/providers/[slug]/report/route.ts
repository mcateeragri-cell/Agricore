import { NextRequest,NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
export const runtime="nodejs";
const clean=(v:unknown,n=2000)=>typeof v==="string"?v.trim().slice(0,n):"";
export async function POST(request:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const{slug}=await params;const body=await request.json().catch(()=>({})) as Record<string,unknown>;
 if(clean(body.company,200))return NextResponse.json({received:true});
 const reason=clean(body.reason,300),detail=clean(body.detail,3000);
 if(!reason)return NextResponse.json({error:"Choose or enter a reason."},{status:400});
 const admin=createSupabaseAdmin();const p=await admin.from("network_provider_profiles").select("id,company_id").eq("public_slug",slug).eq("approval_status","approved").maybeSingle();
 if(!p.data)return NextResponse.json({error:"Provider not found."},{status:404});
 const ins=await admin.from("network_provider_reports").insert({provider_profile_id:p.data.id,provider_company_id:p.data.company_id,reporter_name:clean(body.reporter_name,160)||null,reporter_email:clean(body.reporter_email,240)||null,reason,detail:detail||null});
 if(ins.error)return NextResponse.json({error:"Unable to submit report."},{status:500});
 return NextResponse.json({received:true},{status:201});
}