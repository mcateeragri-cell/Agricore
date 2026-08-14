import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import {
  DASHBOARD_PRESET_SCOPES,
  isDashboardPresetScope,
  mergeDashboardLayout,
  normaliseDashboardLayout,
  systemDashboardLayout,
} from "@/lib/dashboard/widget-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function context() {
  const auth = await requirePermission(["settings.manage"]);
  const admin = createSupabaseAdmin();
  const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, "dashboard_builder");
  if (!enabled) throw new Error("Dashboard Builder is not enabled for this company.");
  return { auth, admin };
}

export async function GET() {
  try {
    const { auth, admin } = await context();
    const { data, error } = await admin
      .from("company_dashboard_role_layouts")
      .select("role,layout,allow_user_customisation,updated_at")
      .eq("company_id", auth.companyId);
    if (error) throw new Error(error.message);

    const saved = new Map((data ?? []).map((row) => [row.role, row]));
    const companyDefault = saved.get("company_default");
    const companyFallback = companyDefault
      ? mergeDashboardLayout(normaliseDashboardLayout(companyDefault.layout), systemDashboardLayout("company_default"))
      : systemDashboardLayout("company_default");

    const presets = DASHBOARD_PRESET_SCOPES.map((scope) => {
      const row = saved.get(scope.key);
      const system = systemDashboardLayout(scope.key);
      const effective = row
        ? mergeDashboardLayout(normaliseDashboardLayout(row.layout), system)
        : scope.key === "company_default"
          ? system
          : companyFallback;
      return {
        ...scope,
        saved: Boolean(row),
        layout: effective,
        allowUserCustomisation: row?.allow_user_customisation ?? companyDefault?.allow_user_customisation ?? true,
        inheritedFrom: row ? null : scope.key === "company_default" ? "system" : companyDefault ? "company_default" : "system",
        updatedAt: row?.updated_at ?? null,
      };
    });

    return NextResponse.json({ presets }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load dashboard presets." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { auth, admin } = await context();
    const body = (await request.json()) as { scopeKey?: unknown; layout?: unknown; allowUserCustomisation?: unknown };
    if (!isDashboardPresetScope(body.scopeKey)) {
      return NextResponse.json({ error: "Choose a valid dashboard role." }, { status: 400 });
    }
    const layout = normaliseDashboardLayout(body.layout);
    if (!layout.length) return NextResponse.json({ error: "A dashboard layout is required." }, { status: 400 });

    const { error } = await admin.from("company_dashboard_role_layouts").upsert({
      company_id: auth.companyId,
      role: body.scopeKey,
      layout,
      allow_user_customisation: body.allowUserCustomisation !== false,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,role" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save dashboard preset." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { auth, admin } = await context();
    const url = new URL(request.url);
    const scopeKey = url.searchParams.get("scopeKey");
    if (!isDashboardPresetScope(scopeKey)) {
      return NextResponse.json({ error: "Choose a valid dashboard role." }, { status: 400 });
    }

    const { error } = await admin
      .from("company_dashboard_role_layouts")
      .delete()
      .eq("company_id", auth.companyId)
      .eq("role", scopeKey);
    if (error) throw new Error(error.message);

    return NextResponse.json({ reset: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reset dashboard preset." }, { status: 500 });
  }
}
