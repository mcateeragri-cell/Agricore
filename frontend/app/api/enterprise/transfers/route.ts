import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["job","customer","machine","technician"]);
const clean = (value:unknown,max=500) => typeof value === "string" ? value.trim().slice(0,max) : "";

async function guard() {
  const auth = await requirePermission(["settings.manage","jobs.assign"]);
  const admin = createSupabaseAdmin();
  if (!(await isCompanyFeatureEnabled(admin, auth.companyId, "multi_branch"))) throw new Error("Transfer Centre is available on Enterprise.");
  return { auth, admin };
}

export async function GET() {
  const moduleGate = await requireApiModule("multi_branch");
  if (moduleGate) return moduleGate;

  try {
    const { auth, admin } = await guard();
    const allowed = auth.accessibleOperationalBranchIds;
    const [branches, jobs, customers, machines, profiles, roles, scopes, history] = await Promise.all([
      admin.from("company_branches").select("id,code,name,is_head_office").eq("company_id",auth.companyId).eq("active",true).in("id",allowed).order("is_head_office",{ascending:false}).order("name"),
      admin.from("jobs").select("id,branch_id,job_number,status,fault_reported,customers(business_name,contact_name),machines(make,model,registration)").eq("company_id",auth.companyId).in("branch_id",allowed).not("status","in",'("completed","cancelled")').order("created_at",{ascending:false}).limit(250),
      admin.from("customers").select("id,branch_id,business_name,contact_name").eq("company_id",auth.companyId).in("branch_id",allowed).order("business_name").limit(500),
      admin.from("machines").select("id,branch_id,make,model,registration,serial_number,customers(business_name,contact_name)").eq("company_id",auth.companyId).in("branch_id",allowed).order("make").limit(500),
      admin.from("company_member_profiles").select("user_id,full_name,is_active").eq("company_id",auth.companyId).eq("is_active",true),
      admin.from("company_member_roles").select("user_id,role").eq("company_id",auth.companyId),
      admin.from("company_member_branch_scopes").select("user_id,home_branch_id").eq("company_id",auth.companyId),
      admin.from("branch_transfer_requests").select("id,entity_type,entity_label,from_branch_id,to_branch_id,reason,status,requested_at,requested_by").eq("company_id",auth.companyId).order("requested_at",{ascending:false}).limit(50),
    ]);
    const err = branches.error||jobs.error||customers.error||machines.error||profiles.error||roles.error||scopes.error||history.error; if(err)throw new Error(err.message);
    const roleMap=new Map((roles.data??[]).map(r=>[String(r.user_id),String(r.role??"")]));
    const homeMap=new Map((scopes.data??[]).map(r=>[String(r.user_id),r.home_branch_id?String(r.home_branch_id):null]));
    const technicians=(profiles.data??[]).map(p=>({id:String(p.user_id),branchId:homeMap.get(String(p.user_id))??null,label:String(p.full_name??"Engineer"),role:roleMap.get(String(p.user_id))??""})).filter(p=>["technician","apprentice","service_manager"].includes(p.role)&&p.branchId&&allowed.includes(p.branchId));
    return NextResponse.json({branches:branches.data??[],jobs:jobs.data??[],customers:customers.data??[],machines:machines.data??[],technicians,history:history.data??[]},{headers:{"Cache-Control":"no-store"}});
  } catch (error) { return NextResponse.json({error:error instanceof Error?error.message:"Unable to load Transfer Centre."},{status:500}); }
}

export async function POST(request:NextRequest) {
  const moduleGate = await requireApiModule("multi_branch");
  if (moduleGate) return moduleGate;

  try {
    const { auth, admin } = await guard();
    const body=await request.json(); const entityType=clean(body.entityType,40); const entityId=clean(body.entityId,80); const toBranchId=clean(body.toBranchId,80); const reason=clean(body.reason,1000);
    if(!TYPES.has(entityType)||!entityId||!toBranchId)return NextResponse.json({error:"Entity type, item and destination depot are required."},{status:400});
    if(!auth.accessibleOperationalBranchIds.includes(toBranchId))return NextResponse.json({error:"You do not have access to the destination depot."},{status:403});
    const {data:destination,error:destinationError}=await admin.from("company_branches").select("id,name").eq("company_id",auth.companyId).eq("id",toBranchId).eq("active",true).maybeSingle();
    if(destinationError)throw new Error(destinationError.message); if(!destination)return NextResponse.json({error:"Destination depot was not found."},{status:404});

    let fromBranchId="", label="", metadata:Record<string,unknown>={};
    if(entityType==="job"){
      const {data,error}=await admin.from("jobs").select("id,branch_id,job_number,fault_reported").eq("company_id",auth.companyId).eq("id",entityId).maybeSingle(); if(error)throw new Error(error.message); if(!data)return NextResponse.json({error:"Job was not found."},{status:404}); fromBranchId=String(data.branch_id??""); label=String(data.job_number||data.fault_reported||"Job");
      if(!auth.accessibleOperationalBranchIds.includes(fromBranchId))return NextResponse.json({error:"You do not have access to the source depot."},{status:403});
      if(fromBranchId===toBranchId)return NextResponse.json({error:"The job is already in that depot."},{status:400});
      const {error:updateError}=await admin.from("jobs").update({branch_id:toBranchId,updated_at:new Date().toISOString()}).eq("company_id",auth.companyId).eq("id",entityId); if(updateError)throw new Error(updateError.message);
    } else if(entityType==="customer"){
      const {data,error}=await admin.from("customers").select("id,branch_id,business_name,contact_name").eq("company_id",auth.companyId).eq("id",entityId).maybeSingle(); if(error)throw new Error(error.message); if(!data)return NextResponse.json({error:"Customer was not found."},{status:404}); fromBranchId=String(data.branch_id??""); label=String(data.business_name||data.contact_name||"Customer");
      if(!auth.accessibleOperationalBranchIds.includes(fromBranchId))return NextResponse.json({error:"You do not have access to the source depot."},{status:403}); if(fromBranchId===toBranchId)return NextResponse.json({error:"The customer is already in that depot."},{status:400});
      const {error:updateError}=await admin.from("customers").update({branch_id:toBranchId,updated_at:new Date().toISOString()}).eq("company_id",auth.companyId).eq("id",entityId); if(updateError)throw new Error(updateError.message); metadata={note:"Existing jobs and machines keep their historic servicing depot until separately transferred."};
    } else if(entityType==="machine"){
      const {data,error}=await admin.from("machines").select("id,branch_id,make,model,registration,serial_number").eq("company_id",auth.companyId).eq("id",entityId).maybeSingle(); if(error)throw new Error(error.message); if(!data)return NextResponse.json({error:"Machine was not found."},{status:404}); fromBranchId=String(data.branch_id??""); label=[data.make,data.model,data.registration].filter(Boolean).join(" ")||String(data.serial_number||"Machine");
      if(!auth.accessibleOperationalBranchIds.includes(fromBranchId))return NextResponse.json({error:"You do not have access to the source depot."},{status:403}); if(fromBranchId===toBranchId)return NextResponse.json({error:"The machine is already in that depot."},{status:400});
      const {error:updateError}=await admin.from("machines").update({branch_id:toBranchId,updated_at:new Date().toISOString()}).eq("company_id",auth.companyId).eq("id",entityId); if(updateError)throw new Error(updateError.message); metadata={note:"Historic jobs remain with the depot that completed them."};
    } else {
      const [{data:profile,error:profileError},{data:scope,error:scopeError}]=await Promise.all([admin.from("company_member_profiles").select("user_id,full_name,is_active").eq("company_id",auth.companyId).eq("user_id",entityId).eq("is_active",true).maybeSingle(),admin.from("company_member_branch_scopes").select("home_branch_id,operations_scope,finance_scope").eq("company_id",auth.companyId).eq("user_id",entityId).maybeSingle()]);
      if(profileError||scopeError)throw new Error((profileError||scopeError)!.message); if(!profile||!scope)return NextResponse.json({error:"Engineer was not found."},{status:404}); fromBranchId=String(scope.home_branch_id??""); label=String(profile.full_name??"Engineer"); if(!auth.accessibleOperationalBranchIds.includes(fromBranchId))return NextResponse.json({error:"You do not have access to the engineer's current depot."},{status:403}); if(fromBranchId===toBranchId)return NextResponse.json({error:"The engineer is already based in that depot."},{status:400});
      const {error:updateError}=await admin.from("company_member_branch_scopes").update({home_branch_id:toBranchId,updated_at:new Date().toISOString()}).eq("company_id",auth.companyId).eq("user_id",entityId); if(updateError)throw new Error(updateError.message);
      await admin.from("company_member_branch_access").upsert({company_id:auth.companyId,user_id:entityId,branch_id:toBranchId},{onConflict:"company_id,user_id,branch_id"}); metadata={note:"This changes the engineer's home depot. Existing job assignments remain attached to their jobs."};
    }

    const {data:audit,error:auditError}=await admin.from("branch_transfer_requests").insert({company_id:auth.companyId,entity_type:entityType,entity_id:entityId,entity_label:label,from_branch_id:fromBranchId,to_branch_id:toBranchId,reason:reason||null,status:"completed",requested_by:auth.userId,completed_by:auth.userId,completed_at:new Date().toISOString(),metadata}).select("id").single();
    if(auditError)throw new Error(`Transfer completed but audit record failed: ${auditError.message}`);
    return NextResponse.json({success:true,transferId:audit.id,message:`${label} transferred to ${destination.name}.`});
  } catch (error) { return NextResponse.json({error:error instanceof Error?error.message:"Unable to complete transfer."},{status:500}); }
}
