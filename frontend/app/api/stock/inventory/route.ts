import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const auth=await requirePermission([]); const admin=createSupabaseAdmin();
  const ids=auth.activeBranchId?[auth.activeBranchId]:auth.accessibleOperationalBranchIds;
  const [{data:items,error:ie},{data:balances,error:be},{data:branches,error:bre}]=await Promise.all([
   admin.from("stock_items").select("id,part_number,description,category,manufacturer,supplier,unit_cost,unit_price,barcode,notes,active,created_at,updated_at").eq("company_id",auth.companyId).eq("active",true).order("description"),
   ids.length?admin.from("stock_branch_balances").select("stock_item_id,branch_id,quantity_in_stock,quantity_reserved,minimum_stock,reorder_level,location").eq("company_id",auth.companyId).in("branch_id",ids):Promise.resolve({data:[],error:null}),
   admin.from("company_branches").select("id,code,name").eq("company_id",auth.companyId).in("id",ids.length?ids:["00000000-0000-0000-0000-000000000000"]),
  ]); if(ie||be||bre) throw new Error((ie||be||bre)!.message);
  const branchMap=new Map((branches??[]).map((b:any)=>[String(b.id),b])); const byItem=new Map<string,any[]>();
  for(const b of balances??[]){const key=String((b as any).stock_item_id); const arr=byItem.get(key)||[]; arr.push({...b,branch:branchMap.get(String((b as any).branch_id))||null});byItem.set(key,arr)}
  const rows=(items??[]).map((item:any)=>{const bs=byItem.get(String(item.id))||[];const qty=bs.reduce((s,b)=>s+Number(b.quantity_in_stock||0),0);const min=auth.activeBranchId?Number(bs[0]?.minimum_stock||0):bs.reduce((s,b)=>s+Number(b.minimum_stock||0),0);return {...item,quantity_in_stock:qty,minimum_stock:min,location:auth.activeBranchId?(bs[0]?.location??null):null,branch_balances:bs}});
  return NextResponse.json({items:rows,activeBranchId:auth.activeBranchId,branchIds:ids});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to load depot stock."},{status:500})}
}