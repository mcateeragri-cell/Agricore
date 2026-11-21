import { NextRequest,NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canSeeNotification } from "@/lib/notifications/access";
import type { AuthenticatedUserContext } from "@/lib/auth/require-permission";
export const runtime="nodejs";
export const maxDuration=60;
// Server-only scheduled delivery. The cron bearer token is never exposed to browsers.
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorised"},{status:401});
 const admin=createSupabaseAdmin();
 const {data:events,error}=await admin.from("agricore_notification_events").select("id,company_id,branch_id,category,title,detail,created_at").gte("created_at",new Date(Date.now()-48*3600*1000).toISOString()).order("created_at",{ascending:true}).limit(100);
 if(error)return NextResponse.json({error:"Unable to load events"},{status:500});
 let sent=0,failed=0;
 for(const event of events??[]){
  const {data:members}=await admin.from("company_member_roles").select("user_id,role").eq("company_id",event.company_id).in("role",["company_admin","administrator","service_manager","office"]);
  const {data:active}=await admin.from("company_members").select("user_id").eq("company_id",event.company_id).eq("is_active",true);
  const activeIds=new Set((active??[]).map(m=>m.user_id));
  for(const member of members??[]){
   if(!activeIds.has(member.user_id))continue;
   // Company/role scope is rechecked for every dispatch; branch-scoped users do not receive unscoped branch alerts.
   if(event.branch_id){const {data:scope}=await admin.from("company_member_branch_scopes").select("operations_scope,home_branch_id").eq("company_id",event.company_id).eq("user_id",member.user_id).maybeSingle();if(scope&&scope.operations_scope!=="company"&&scope.home_branch_id!==event.branch_id)continue;}
   const {data:existing}=await admin.from("agricore_notification_deliveries").select("channel,delivered_at").eq("event_id",event.id).eq("user_id",member.user_id);
   const done=new Set((existing??[]).filter(d=>d.delivered_at).map(d=>d.channel));
   if(!done.has("email")&&process.env.RESEND_API_KEY&&process.env.AGRICORE_EMAIL_FROM){
    try{const {data:user,error:userError}=await admin.auth.admin.getUserById(member.user_id);if(userError||!user.user?.email)throw Error("Recipient unavailable");
     const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.AGRICORE_EMAIL_FROM,to:[user.user.email],subject:`AgriCore: ${event.title}`,text:`${event.title}\n${event.detail}\n\nSign in to your company dashboard: https://app.getagricore.com/dashboard`})});if(!response.ok)throw Error(`Email HTTP ${response.status}`);
     await admin.from("agricore_notification_deliveries").upsert({event_id:event.id,user_id:member.user_id,channel:"email",delivered_at:new Date().toISOString(),last_error:null},{onConflict:"event_id,user_id,channel"});sent++;
    }catch(e){failed++;console.error("Notification email delivery failed",event.id,e instanceof Error?e.message:"unknown")}
   }
   if(!done.has("push")&&process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT){
    const {data:subs}=await admin.from("agricore_push_subscriptions").select("endpoint,p256dh,auth_secret").eq("company_id",event.company_id).eq("user_id",member.user_id);
    if(subs?.length){let delivered=false;
     try{const webpush=await import("web-push");webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
      for(const sub of subs){try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_secret}},JSON.stringify({title:event.title,body:event.detail,url:"/dashboard"}));delivered=true}catch(e){console.error("Push delivery failed",event.id,e instanceof Error?e.message:"unknown")}}
      if(delivered){await admin.from("agricore_notification_deliveries").upsert({event_id:event.id,user_id:member.user_id,channel:"push",delivered_at:new Date().toISOString(),last_error:null},{onConflict:"event_id,user_id,channel"});sent++}
     }catch(e){failed++;console.error("Push dispatch failed",e instanceof Error?e.message:"unknown")}
    }
   }
  }
 }
 return NextResponse.json({ok:true,sent,failed});
}
