import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission(["settings.manage"]);
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.from("company_email_settings").select("*").eq("company_id", user.companyId).maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({
      settings: data ?? {
        company_id: user.companyId,
        provider: "resend",
        sender_name: user.companyName,
        reply_to_email: user.email,
        from_email: null,
        custom_sender_verified: false,
        enabled: true,
      },
      providerConfigured: Boolean(process.env.RESEND_API_KEY?.trim() && process.env.AGRICORE_EMAIL_FROM?.trim()),
      webhookConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load email settings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requirePermission(["settings.manage"]);
    const body = await request.json() as Record<string, unknown>;
    const text = (key: string, max = 254) => typeof body[key] === "string" ? String(body[key]).trim().slice(0, max) || null : null;
    const replyTo = text("reply_to_email");
    if (replyTo && !replyTo.includes("@")) return NextResponse.json({ error: "Enter a valid reply-to email address." }, { status: 400 });
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.from("company_email_settings").upsert({
      company_id: user.companyId,
      provider: "resend",
      sender_name: text("sender_name", 120) || user.companyName,
      reply_to_email: replyTo,
      enabled: body.enabled !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id" }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ settings: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save email settings." }, { status: 500 });
  }
}
