import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { hashPin, UUID } from "@/lib/passport/operator-security";
export const runtime = "nodejs";
export async function PUT(req: NextRequest, { params }: {params: Promise<{machineId:string}>}) {
 const {machineId}=await params;
 if(!UUID.test(machineId)) return NextResponse.json({error:"Invalid machine"},{status:400});
 const context=await getAuthenticatedUserContext();
 if(!context?.companyId) return NextResponse.json({error:"Sign in required"},{status:401});
 if(!context.permissions.includes("machines.edit") && !context.permissions.includes("settings.manage")) return NextResponse.json({error:"Not permitted"},{status:403});
 const client=await createSupabaseServerClient();
 const {data:machine,error}=await client.from("machines").select("id,company_id").eq("id",machineId).eq("company_id",context.companyId).maybeSingle();
 if(error||!machine) return NextResponse.json({error:"Machine unavailable"},{status:404});
 let body:unknown;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const pin=(body as {pin?:unknown})?.pin;
 if(typeof pin!=="string"|| !/^[0-9]{6,10}$/.test(pin)) return NextResponse.json({error:"Use a 6–10 digit PIN"},{status:400});
 const admin=createSupabaseAdmin();
 const result=await admin.from("machine_operator_settings").upsert({machine_id:machineId,company_id:context.companyId,pin_hash:hashPin(pin),updated_at:new Date().toISOString()},{onConflict:"machine_id"});
 if(result.error) return NextResponse.json({error:"Unable to save PIN; check migration"},{status:500});
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
