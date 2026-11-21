import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const ctx=await getAuthenticatedUserContext();if(!ctx?.companyId)return NextResponse.json({error:"Unauthorised"},{status:401});
 if(!ctx.permissions.includes("machines.edit")&&!ctx.permissions.includes("settings.manage")&&!(["company_admin","administrator","service_manager","office"].includes(ctx.role)))return NextResponse.json({error:"Not permitted"},{status:403});
 let body:{endpoint?:unknown;keys?:{p256dh?:unknown;auth?:unknown}};
 try{body=await request.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(typeof body.endpoint!=="string"||body.endpoint.length>2048||!body.endpoint.startsWith("https://")||typeof body.keys?.p256dh!=="string"||typeof body.keys.auth!=="string"||body.keys.p256dh.length>256||body.keys.auth.length>256)return NextResponse.json({error:"Invalid subscription"},{status:400});
 const admin=createSupabaseAdmin();const {error}=await admin.from("agricore_push_subscriptions").upsert({user_id:ctx.userId,company_id:ctx.companyId,endpoint:body.endpoint,p256dh:body.keys.p256dh,auth_secret:body.keys.auth},{onConflict:"user_id,company_id,endpoint"});
 return error?NextResponse.json({error:"Unable to save subscription"},{status:500}):NextResponse.json({ok:true});
}
