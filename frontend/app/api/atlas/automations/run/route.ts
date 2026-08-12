import { NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import { buildAtlasOverview } from "@/lib/atlas/analysis";
import { executeAtlasAutomations } from "@/lib/atlas/automation-executor";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const admin = createSupabaseAdmin();
  if (!(await isCompanyFeatureEnabled(admin, auth.companyId, "atlas_automations"))) {
    return NextResponse.json({ error: "Atlas Automations is not enabled." }, { status: 403 });
  }

  try {
    const overview = await buildAtlasOverview(admin, auth.companyId);
    const result = await executeAtlasAutomations(admin, auth.companyId, overview);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to run Atlas automations." }, { status: 500 });
  }
}
