import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { BUILT_IN_EMAIL_TEMPLATES, builtInTemplate } from "@/lib/communications/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission(["settings.manage"]);
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.from("company_email_templates").select("template_key,subject_template,body_template,enabled").eq("company_id", user.companyId);
    if (error) throw new Error(error.message);
    const overrides = new Map((data ?? []).map((row) => [row.template_key, row]));
    return NextResponse.json({ templates: BUILT_IN_EMAIL_TEMPLATES.map((base) => ({ ...base, ...overrides.get(base.key) })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load email templates." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requirePermission(["settings.manage"]);
    const body = await request.json() as { template_key?: unknown; subject_template?: unknown; body_template?: unknown; enabled?: unknown };
    const key = typeof body.template_key === "string" ? body.template_key : "";
    if (!builtInTemplate(key)) return NextResponse.json({ error: "Unknown email template." }, { status: 400 });
    const subject = typeof body.subject_template === "string" ? body.subject_template.trim().slice(0, 300) : null;
    const content = typeof body.body_template === "string" ? body.body_template.trim().slice(0, 10000) : null;
    const admin = createSupabaseAdmin();
    const { error } = await admin.from("company_email_templates").upsert({
      company_id: user.companyId,
      template_key: key,
      subject_template: subject || null,
      body_template: content || null,
      enabled: body.enabled !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,template_key" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save email template." }, { status: 500 });
  }
}
