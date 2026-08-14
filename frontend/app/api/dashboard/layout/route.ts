import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import {
  dashboardScopeForCompanyRole,
  mergeDashboardLayout,
  normaliseDashboardLayout,
  systemDashboardLayout,
} from "@/lib/dashboard/widget-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadPreset(admin: ReturnType<typeof createSupabaseAdmin>, companyId: string, role: string) {
  const { data, error } = await admin
    .from("company_dashboard_role_layouts")
    .select("role,layout,allow_user_customisation")
    .eq("company_id", companyId)
    .eq("role", role)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function resolveBaseLayout(
  admin: ReturnType<typeof createSupabaseAdmin>,
  companyId: string,
  role: string,
) {
  const scope = dashboardScopeForCompanyRole(role);
  const [rolePreset, companyDefault] = await Promise.all([
    scope === "company_default" ? Promise.resolve(null) : loadPreset(admin, companyId, scope),
    loadPreset(admin, companyId, "company_default"),
  ]);

  const roleLayout = normaliseDashboardLayout(rolePreset?.layout);
  const companyLayout = normaliseDashboardLayout(companyDefault?.layout);
  const systemLayout = systemDashboardLayout(scope);

  if (rolePreset && roleLayout.length) {
    return {
      layout: mergeDashboardLayout(roleLayout, systemLayout),
      source: "role" as const,
      allowUserCustomisation: rolePreset.allow_user_customisation !== false,
      scope,
    };
  }

  if (companyDefault && companyLayout.length) {
    return {
      layout: mergeDashboardLayout(companyLayout, systemLayout),
      source: "company" as const,
      allowUserCustomisation: companyDefault.allow_user_customisation !== false,
      scope,
    };
  }

  return {
    layout: systemLayout,
    source: "system" as const,
    allowUserCustomisation: true,
    scope,
  };
}

export async function GET() {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const admin = createSupabaseAdmin();
    const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, "dashboard_builder");
    if (!enabled) return NextResponse.json({ layout: [], source: "disabled", allowUserCustomisation: false });

    const base = await resolveBaseLayout(admin, auth.companyId, auth.role);

    const { data: personal, error } = await admin
      .from("company_dashboard_layouts")
      .select("layout")
      .eq("company_id", auth.companyId)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const personalLayout = normaliseDashboardLayout(personal?.layout);
    if (base.allowUserCustomisation && personalLayout.length) {
      return NextResponse.json({
        layout: mergeDashboardLayout(personalLayout, base.layout),
        source: "user",
        inheritedSource: base.source,
        allowUserCustomisation: true,
        roleScope: base.scope,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({
      layout: base.layout,
      source: base.source,
      allowUserCustomisation: base.allowUserCustomisation,
      roleScope: base.scope,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load dashboard layout." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const admin = createSupabaseAdmin();
    const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, "dashboard_builder");
    if (!enabled) return NextResponse.json({ error: "Dashboard customisation is not enabled." }, { status: 403 });

    const base = await resolveBaseLayout(admin, auth.companyId, auth.role);
    if (!base.allowUserCustomisation) {
      return NextResponse.json({ error: "Your company has locked this role to its managed dashboard layout." }, { status: 403 });
    }

    let body: { layout?: unknown };
    try {
      body = (await request.json()) as { layout?: unknown };
    } catch {
      return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 });
    }

    const layout = normaliseDashboardLayout(body.layout);
    if (!layout.length) return NextResponse.json({ error: "A dashboard layout is required." }, { status: 400 });

    const { error } = await admin.from("company_dashboard_layouts").upsert({
      company_id: auth.companyId,
      user_id: auth.userId,
      layout,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,user_id" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ saved: true, layout, source: "user", allowUserCustomisation: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save dashboard layout." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from("company_dashboard_layouts")
      .delete()
      .eq("company_id", auth.companyId)
      .eq("user_id", auth.userId);
    if (error) throw new Error(error.message);

    const base = await resolveBaseLayout(admin, auth.companyId, auth.role);
    return NextResponse.json({
      reset: true,
      layout: base.layout,
      source: base.source,
      allowUserCustomisation: base.allowUserCustomisation,
      roleScope: base.scope,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reset dashboard layout." }, { status: 500 });
  }
}
