import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import { canManageCompany } from "@/lib/platform/core";

export const dynamic = "force-dynamic";

const RULES = new Set(["service_due","quote_stale","low_stock","job_completed_uninvoiced","high_parts_cost"]);

export async function GET() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const admin = createSupabaseAdmin();
  if (!(await isCompanyFeatureEnabled(admin, auth.companyId, "atlas_automations"))) return NextResponse.json({ rules: [], enabled: false });
  const { data, error } = await admin.from("atlas_automation_rules").select("*").eq("company_id", auth.companyId).order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [], enabled: true, canManage: canManageCompany(auth) });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth)) return NextResponse.json({ error: "Company administration permission is required." }, { status: 403 });
  const admin = createSupabaseAdmin();
  if (!(await isCompanyFeatureEnabled(admin, auth.companyId, "atlas_automations"))) return NextResponse.json({ error: "Atlas Automations is not enabled." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const ruleType = String(body.rule_type ?? "");
  if (!RULES.has(ruleType)) return NextResponse.json({ error: "Unsupported automation rule." }, { status: 400 });
  const { data, error } = await admin.from("atlas_automation_rules").insert({
    company_id: auth.companyId,
    name: String(body.name ?? ruleType).trim().slice(0, 120),
    rule_type: ruleType,
    enabled: body.enabled !== false,
    threshold: Number(body.threshold ?? 0),
    config: typeof body.config === "object" && body.config ? body.config : {},
    created_by: auth.userId,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth)) return NextResponse.json({ error: "Company administration permission is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Rule id is required." }, { status: 400 });
  const admin = createSupabaseAdmin();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.threshold != null) patch.threshold = Number(body.threshold);
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 120);
  const { data, error } = await admin.from("atlas_automation_rules").update(patch).eq("id", id).eq("company_id", auth.companyId).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}
