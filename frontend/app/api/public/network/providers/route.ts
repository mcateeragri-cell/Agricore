import { NextRequest,NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const clean=(v:unknown,n=200)=>typeof v==="string"?v.trim().slice(0,n):"";

export async function GET(request:NextRequest){
  const admin=createSupabaseAdmin();
  const q=clean(request.nextUrl.searchParams.get("q"),120).toLowerCase();

  const profiles=await admin.from("network_provider_profiles")
    .select("id,company_id,public_slug,display_name,description,town_city,postcode,service_radius_miles,emergency_callouts,phone,email,website,brands,services,business_verification,identity_verification,insurance_verification,insurance_expiry,updated_at")
    .eq("opted_in",true).eq("approval_status","approved")
    .order("updated_at",{ascending:false}).limit(250);
  if(profiles.error)return NextResponse.json({error:"Unable to load providers."},{status:500});

  const companyIds=(profiles.data??[]).map(p=>p.company_id);
  let eligible=new Set<string>();
  if(companyIds.length){
    const companies=await admin.from("companies")
      .select("id,slug,billing_mode,is_active")
      .in("id",companyIds).eq("is_active",true).neq("billing_mode","demo");
    if(!companies.error)eligible=new Set((companies.data??[]).filter(c=>!String(c.slug).startsWith("demo-")).map(c=>c.id));
  }

  const result=(profiles.data??[])
    .filter(p=>eligible.has(p.company_id))
    .filter(p=>{
      if(!q)return true;
      const hay=[p.display_name,p.description,p.town_city,p.postcode,...(p.brands??[]),...(p.services??[])].join(" ").toLowerCase();
      return hay.includes(q);
    })
    .map(p=>({
      slug:p.public_slug,name:p.display_name,description:p.description,townCity:p.town_city,postcode:p.postcode,
      serviceRadiusMiles:p.service_radius_miles,emergencyCallouts:p.emergency_callouts,
      brands:p.brands??[],services:p.services??[],
      verification:{
        business:p.business_verification==="verified",
        identity:p.identity_verification==="verified",
        insurance:p.insurance_verification==="verified"&&(!p.insurance_expiry||new Date(p.insurance_expiry)>=new Date(new Date().toISOString().slice(0,10))),
      },
    }));

  return NextResponse.json({providers:result},{headers:{"Cache-Control":"public, max-age=60, s-maxage=300"}});
}
