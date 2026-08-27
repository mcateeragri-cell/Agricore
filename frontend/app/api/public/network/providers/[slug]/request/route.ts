import { NextRequest,NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
export const runtime="nodejs";
const clean=(v:unknown,n=1000)=>typeof v==="string"?v.trim().slice(0,n):"";
export async function POST(request:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const{slug}=await params;const body=await request.json().catch(()=>({})) as Record<string,unknown>;
 if(clean(body.company,200))return NextResponse.json({received:true}); // honeypot
 const name=clean(body.customer_name,160),email=clean(body.customer_email,240),phone=clean(body.customer_phone,80),
  location=clean(body.location,240),service=clean(body.service_required,200),message=clean(body.message,3000);
 if(!name||!location||!service||(!email&&!phone))return NextResponse.json({error:"Name, location, service required and a contact method are required."},{status:400});
 const admin=createSupabaseAdmin();
 const p=await admin.from("network_provider_profiles").select("id,company_id").eq("public_slug",slug).eq("opted_in",true).eq("approval_status","approved").maybeSingle();
 if(p.error||!p.data)return NextResponse.json({error:"Provider not found."},{status:404});
 const c=await admin.from("companies").select("id,slug,billing_mode,is_active").eq("id",p.data.company_id).maybeSingle();
 if(!c.data||!c.data.is_active||c.data.billing_mode==="demo"||String(c.data.slug).startsWith("demo-"))return NextResponse.json({error:"Provider not found."},{status:404});

 const since=new Date(Date.now()-60*60*1000).toISOString();
 if(email){
  const recent=await admin.from("network_provider_requests").select("id",{count:"exact",head:true})
   .eq("provider_company_id",p.data.company_id).eq("customer_email",email).gte("created_at",since);
  if((recent.count??0)>=3)return NextResponse.json({error:"Too many requests have been sent recently. Please try again later."},{status:429});
 }
 const urgencyRaw=clean(body.urgency,30);
 const urgency=["routine","soon","urgent","breakdown"].includes(urgencyRaw)?urgencyRaw:"routine";
 const contactRaw=clean(body.preferred_contact,30);
 const preferred=["phone","email","whatsapp"].includes(contactRaw)?contactRaw:"phone";
 const ins=await admin.from("network_provider_requests").insert({
  provider_company_id:p.data.company_id,provider_profile_id:p.data.id,customer_name:name,
  customer_email:email||null,customer_phone:phone||null,location,
  machine_description:clean(body.machine_description,1000)||null,service_required:service,urgency,
  preferred_contact:preferred,message:message||null,status:"submitted",source:"network_direct"
 }).select("id").single();
 if(ins.error)return NextResponse.json({error:"Unable to send request."},{status:500});
 return NextResponse.json({received:true,reference:ins.data.id},{status:201});
}