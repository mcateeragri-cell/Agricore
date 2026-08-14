import { requireApiModule } from "@/lib/modules/api-access";
import { NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import { loadAtlasSnapshot, rebuildAtlasSnapshot } from "@/lib/atlas/snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const moduleGate = await requireApiModule("atlas_intelligence");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const admin = createSupabaseAdmin();
  const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, "atlas_intelligence");
  if (!enabled) return NextResponse.json({ error: "AgriCore Intelligence is not enabled for this company." }, { status: 403 });

  try {
    const snapshot = await loadAtlasSnapshot(admin, auth.companyId, 30);
    const overview = snapshot?.overview ?? await rebuildAtlasSnapshot(admin, auth.companyId);
    const { data: alerts } = await admin.from("atlas_alerts").select("id,severity,title,detail,href,status,created_at").eq("company_id", auth.companyId).eq("status", "open").order("created_at", { ascending: false }).limit(20);
    return NextResponse.json({ overview, alerts: alerts ?? [], source: snapshot ? "background_snapshot" : "live" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to build Atlas intelligence." }, { status: 500 });
  }
}
