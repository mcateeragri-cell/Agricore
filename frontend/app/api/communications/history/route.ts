import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(["settings.manage"]);
    const limit = Math.min(200, Math.max(1, Number(new URL(request.url).searchParams.get("limit") || 100)));
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.from("email_messages").select("id,template_key,recipient_email,recipient_name,subject,status,created_at,sent_at,delivered_at,opened_at,clicked_at,bounced_at,failed_at,error_message,related_entity_type,related_entity_id").eq("company_id", user.companyId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return NextResponse.json({ messages: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load email history." }, { status: 500 });
  }
}
