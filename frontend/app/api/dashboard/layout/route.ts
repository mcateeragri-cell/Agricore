import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDGET_IDS = new Set([
  "executive_summary",
  "revenue_trend",
  "team_status",
  "recent_jobs",
  "recent_activity",
  "service_due",
  "schedule",
  "quick_actions",
  "atlas_intelligence",
]);

const SIZES = new Set(["small", "medium", "large", "full"]);

type LayoutItem = {
  id: string;
  visible: boolean;
  size: "small" | "medium" | "large" | "full";
};

function normaliseLayout(value: unknown): LayoutItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: LayoutItem[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const size = typeof row.size === "string" && SIZES.has(row.size) ? row.size as LayoutItem["size"] : "medium";
    if (!WIDGET_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    output.push({ id, visible: row.visible !== false, size });
  }

  return output;
}

export async function GET() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const admin = createSupabaseAdmin();
  const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, "dashboard_builder");
  if (!enabled) return NextResponse.json({ layout: [] });

  const { data, error } = await admin
    .from("company_dashboard_layouts")
    .select("layout")
    .eq("company_id", auth.companyId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ layout: normaliseLayout(data?.layout) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const admin = createSupabaseAdmin();
  const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, "dashboard_builder");
  if (!enabled) return NextResponse.json({ error: "Dashboard customisation is not enabled." }, { status: 403 });

  let body: { layout?: unknown };
  try {
    body = (await request.json()) as { layout?: unknown };
  } catch {
    return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 });
  }

  const layout = normaliseLayout(body.layout);
  if (!layout.length) return NextResponse.json({ error: "A dashboard layout is required." }, { status: 400 });

  const { error } = await admin.from("company_dashboard_layouts").upsert({
    company_id: auth.companyId,
    user_id: auth.userId,
    layout,
    updated_at: new Date().toISOString(),
  }, { onConflict: "company_id,user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, layout });
}
