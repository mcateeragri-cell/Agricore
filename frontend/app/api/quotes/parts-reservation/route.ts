import { NextRequest,NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
export const runtime="nodejs";export const dynamic="force-dynamic";
const clean=(v:unknown,n=120)=>typeof v==="string"?v.trim().slice(0,n):"";
export async function POST(request:NextRequest){
 const auth=await getAuthenticatedUserContext();if(!auth)return NextResponse.json({error:"Authentication required."},{status:401});
 const allowed=auth.platformRole==="super_admin"||auth.platformRole==="platform_admin"||["company_admin","administrator","office","parts_manager","parts_advisor"].includes(auth.role)||auth.permissions.includes("parts.sales");
 if(!allowed)return NextResponse.json({error:"Parts sales permission is required."},{status:403});
 const body=await request.json().catch(()=>({}));const action=clean(body.action,40),quoteId=clean(body.quoteId,100);if(!quoteId)return NextResponse.json({error:"Quote id is required."},{status:400});
 const admin=createSupabaseAdmin();const q=await admin.from("quotes").select("id,commercial_type").eq("company_id",auth.companyId).eq("id",quoteId).maybeSingle();
 if(q.error)return NextResponse.json({error:q.error.message},{status:500});if(!q.data||q.data.commercial_type!=="parts")return NextResponse.json({error:"Parts quote not found."},{status:404});
 if(action==="reserve"){const branch=clean(body.branchId,100)||auth.activeBranchId||auth.accessibleOperationalBranchIds[0]||"";if(!branch||!auth.accessibleOperationalBranchIds.includes(branch))return NextResponse.json({error:"Choose an accessible depot."},{status:400});
  const r=await admin.rpc("agricore_reserve_parts_quote",{p_company:auth.companyId,p_branch:branch,p_quote:quoteId,p_user:auth.userId});return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json(r.data);}
 if(["release","decline","cancel"].includes(action)){const r=await admin.rpc("agricore_release_parts_quote",{p_company:auth.companyId,p_quote:quoteId});if(r.error)return NextResponse.json({error:r.error.message},{status:400});
  if(action!=="release"){const status=action==="decline"?"rejected":"draft";const u=await admin.from("quotes").update({status,updated_at:new Date().toISOString()}).eq("company_id",auth.companyId).eq("id",quoteId);if(u.error)return NextResponse.json({error:u.error.message},{status:500});}return NextResponse.json(r.data);}
 if(action==="invoice"){const no=`INV-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;const r=await admin.rpc("agricore_invoice_reserved_parts_quote",{p_company:auth.companyId,p_quote:quoteId,p_user:auth.userId,p_invoice_number:no});return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json(r.data,{status:201});}
 return NextResponse.json({error:"Unsupported action."},{status:400});}