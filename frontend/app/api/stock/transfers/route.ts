import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest,NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
export const dynamic="force-dynamic";
export async function GET(){
  const moduleGate = await requireApiModule("stock");
  if (moduleGate) return moduleGate;
try{const auth=await requirePermission(["stock.view","stock.manage"], { mode: "any" });const admin=createSupabaseAdmin();const ids=auth.accessibleOperationalBranchIds;const {data,error}=await admin.from("stock_transfers").select("id,quantity,reference,notes,status,created_at,stock_items(part_number,description),from:company_branches!stock_transfers_from_branch_id_fkey(code,name),to:company_branches!stock_transfers_to_branch_id_fkey(code,name)").eq("company_id",auth.companyId).or(ids.map(id=>`from_branch_id.eq.${id},to_branch_id.eq.${id}`).join(",")).order("created_at",{ascending:false}).limit(200);if(error)throw new Error(error.message);return NextResponse.json({transfers:data??[]})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to load stock transfers."},{status:500})}}
export async function POST(req:NextRequest){
  const moduleGate = await requireApiModule("stock");
  if (moduleGate) return moduleGate;
try{const auth=await requirePermission(["stock.manage"]);const body=await req.json();const item=String(body.stockItemId||""),from=String(body.fromBranchId||""),to=String(body.toBranchId||"");const quantity=Number(body.quantity);if(!item||!from||!to||!Number.isFinite(quantity)||quantity<=0)return NextResponse.json({error:"Choose a part, source depot, destination depot and quantity."},{status:400});const allowed=new Set(auth.accessibleOperationalBranchIds);if(!allowed.has(from)||!allowed.has(to))return NextResponse.json({error:"You do not have access to both depots."},{status:403});const admin=createSupabaseAdmin();const {data,error}=await admin.rpc("agricore_transfer_depot_stock",{p_company:auth.companyId,p_item:item,p_from:from,p_to:to,p_quantity:quantity,p_reference:String(body.reference||""),p_notes:String(body.notes||""),p_user:auth.userId});if(error)throw new Error(error.message);return NextResponse.json({id:data,message:"Stock transferred successfully."})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to transfer stock."},{status:500})}}
