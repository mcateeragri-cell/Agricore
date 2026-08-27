import { NextRequest,NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const clean=(value:unknown,max=1000)=>typeof value==="string"?value.trim().slice(0,max):"";
const list=(value:unknown,max=30)=>Array.isArray(value)
  ? value.map((item)=>clean(item,100)).filter(Boolean).slice(0,max)
  : clean(value,3000).split(",").map((item)=>item.trim()).filter(Boolean).slice(0,max);

function slugify(value:string){
  return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"provider";
}

async function access(){
  const auth=await getAuthenticatedUserContext();
  if(!auth)return {error:NextResponse.json({error:"Authentication required."},{status:401})} as const;
  if(!(auth.platformRole==="super_admin"||auth.platformRole==="platform_admin"||
      auth.role==="company_admin"||auth.role==="administrator"||auth.permissions.includes("settings.manage"))){
    return {error:NextResponse.json({error:"Company administrator access is required."},{status:403})} as const;
  }
  const admin=createSupabaseAdmin();
  if(!(await isCompanyFeatureEnabled(admin,auth.companyId,"network_provider_marketplace"))){
    return {error:NextResponse.json({error:"AgriCore Network provider listing is not enabled for this subscription."},{status:403})} as const;
  }
  return {auth,admin,error:null} as const;
}

export async function GET(){
  const a=await access();if(a.error)return a.error;const{auth,admin}=a;
  const [company,profile,requests]=await Promise.all([
    admin.from("companies").select("id,company_name,slug,billing_mode,is_active").eq("id",auth.companyId).maybeSingle(),
    admin.from("network_provider_profiles").select("*").eq("company_id",auth.companyId).maybeSingle(),
    admin.from("network_provider_requests").select("*").eq("provider_company_id",auth.companyId).order("created_at",{ascending:false}).limit(100),
  ]);
  const error=company.error||profile.error||requests.error;
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({company:company.data,profile:profile.data,requests:requests.data??[]},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:NextRequest){
  const a=await access();if(a.error)return a.error;const{auth,admin}=a;
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const action=clean(body.action,40)||"save";

  const companyResult=await admin.from("companies")
    .select("id,company_name,slug,billing_mode,is_active")
    .eq("id",auth.companyId).maybeSingle();
  if(companyResult.error||!companyResult.data)return NextResponse.json({error:companyResult.error?.message||"Company not found."},{status:404});
  const company=companyResult.data;

  if(company.billing_mode==="demo"||String(company.slug).startsWith("demo-")){
    return NextResponse.json({error:"Demo workspaces cannot be listed publicly."},{status:403});
  }

  if(action==="save"||action==="submit"){
    const existing=await admin.from("network_provider_profiles").select("id,approval_status,public_slug").eq("company_id",auth.companyId).maybeSingle();
    if(existing.error)return NextResponse.json({error:existing.error.message},{status:500});

    const displayName=clean(body.display_name,180)||company.company_name;
    let publicSlug=clean(body.public_slug,80)||existing.data?.public_slug||slugify(displayName);
    const collision=await admin.from("network_provider_profiles").select("company_id").eq("public_slug",publicSlug).neq("company_id",auth.companyId).maybeSingle();
    if(collision.data)publicSlug=`${publicSlug}-${auth.companyId.slice(0,6)}`;

    const currentStatus=existing.data?.approval_status||"draft";
    const approvalStatus=action==="submit"?"pending":currentStatus==="approved"?"pending":currentStatus;
    const payload={
      company_id:auth.companyId,
      public_slug:publicSlug,
      opted_in:Boolean(body.opted_in),
      approval_status:approvalStatus,
      display_name:displayName,
      description:clean(body.description,4000)||null,
      town_city:clean(body.town_city,160)||null,
      postcode:clean(body.postcode,30)||null,
      service_radius_miles:Math.min(500,Math.max(1,Number(body.service_radius_miles||30))),
      emergency_callouts:Boolean(body.emergency_callouts),
      phone:clean(body.phone,80)||null,
      email:clean(body.email,240)||null,
      website:clean(body.website,400)||null,
      brands:list(body.brands),
      services:list(body.services),
      application_notes:clean(body.application_notes,3000)||null,
      submitted_at:action==="submit"?new Date().toISOString():undefined,
      updated_at:new Date().toISOString(),
    };
    const result=await admin.from("network_provider_profiles")
      .upsert(payload,{onConflict:"company_id"}).select("*").single();
    if(result.error)return NextResponse.json({error:result.error.message},{status:400});
    return NextResponse.json({saved:true,profile:result.data});
  }

  if(action==="mark_request_viewed"){
    const id=clean(body.request_id,100);
    const result=await admin.from("network_provider_requests")
      .update({status:"viewed",updated_at:new Date().toISOString()})
      .eq("id",id).eq("provider_company_id",auth.companyId).eq("status","submitted");
    if(result.error)return NextResponse.json({error:result.error.message},{status:500});
    return NextResponse.json({saved:true});
  }

  return NextResponse.json({error:"Unsupported action."},{status:400});
}
