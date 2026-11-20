import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedUserContext} from "@/lib/auth/require-permission";
import {createSupabaseAdmin} from "@/lib/payments/supabase-admin";
export const runtime="nodejs";
export async function PATCH(req:NextRequest,{params}:{params:Promise<{reportId:string}>}){
 const ctx=await getAuthenticatedUserContext();if(!ctx?.companyId)return NextResponse.json({error:"Sign in required"},{status:401});
 if(!ctx.permissions.includes("machines.edit")&&!ctx.permissions.includes("settings.manage"))return NextResponse.json({error:"Not permitted"},{status:403});
 const {reportId}=await params;if(!/^[0-9a-f-]{36}$/i.test(reportId))return NextResponse.json({error:"Invalid report"},{status:400});
 let body:unknown;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const status=(body as {status?:unknown})?.status;if(status!=="reviewed"&&status!=="rejected")return NextResponse.json({error:"Invalid status"},{status:400});
 const admin=createSupabaseAdmin();const current=await admin.from("machine_operator_submissions").select("id,company_id,status").eq("id",reportId).maybeSingle();
 if(current.error||!current.data)return NextResponse.json({error:"Not found"},{status:404});
 // Only the machine-owning company may approve/reject reports; assigned companies may view but not change them.
 if(current.data.company_id!==ctx.companyId)return NextResponse.json({error:"Not permitted"},{status:403});
 if(current.data.status!=="pending")return NextResponse.json({error:"Already reviewed"},{status:409});
 const result=await admin.from("machine_operator_submissions").update({status}).eq("id",reportId).eq("company_id",ctx.companyId).eq("status","pending").select("id");
 if(result.error)return NextResponse.json({error:"Unable to update"},{status:500});
 if(!result.data?.length)return NextResponse.json({error:"Already reviewed"},{status:409});
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
