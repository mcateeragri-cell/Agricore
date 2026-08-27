import { NextRequest,NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const{slug}=await params;const admin=createSupabaseAdmin();
 const p=await admin.from("network_provider_profiles")
  .select("id,company_id,public_slug,display_name,description,town_city,postcode,service_radius_miles,emergency_callouts,phone,email,website,brands,services,business_verification,identity_verification,insurance_verification,insurance_expiry")
  .eq("public_slug",slug).eq("opted_in",true).eq("approval_status","approved").maybeSingle();
 if(p.error||!p.data)return NextResponse.json({error:"Provider not found."},{status:404});
 const c=await admin.from("companies").select("id,slug,billing_mode,is_active").eq("id",p.data.company_id).maybeSingle();
 if(c.error||!c.data||!c.data.is_active||c.data.billing_mode==="demo"||String(c.data.slug).startsWith("demo-"))
  return NextResponse.json({error:"Provider not found."},{status:404});
 const x=p.data;
 return NextResponse.json({provider:{
  slug:x.public_slug,name:x.display_name,description:x.description,townCity:x.town_city,postcode:x.postcode,
  serviceRadiusMiles:x.service_radius_miles,emergencyCallouts:x.emergency_callouts,phone:x.phone,email:x.email,website:x.website,
  brands:x.brands??[],services:x.services??[],
  verification:{business:x.business_verification==="verified",identity:x.identity_verification==="verified",
   insurance:x.insurance_verification==="verified"&&(!x.insurance_expiry||new Date(x.insurance_expiry)>=new Date(new Date().toISOString().slice(0,10)))}
 }},{headers:{"Cache-Control":"public, max-age=60, s-maxage=300"}});
}