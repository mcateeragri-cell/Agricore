import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { processAtlasQueue } from "@/lib/atlas/processor";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany } from "@/lib/platform/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cronAuthorised(request: NextRequest) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = process.env.CRON_SECRET?.trim() || process.env.AGRICORE_CRON_SECRET?.trim() || "";
  return Boolean(expected && supplied === expected);
}

async function manualContext() {
  const auth = await getAuthenticatedUserContext();
  return canManageCompany(auth) ? auth : null;
}

async function run(request: NextRequest) {
  const isCron = cronAuthorised(request);
  const auth = isCron ? null : await manualContext();
  if (!isCron && !auth) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();
    // Scheduled runs process the shared queue. Manual company-admin runs are scoped
    // to the active tenant so one customer never triggers another tenant's work.
    const result = await processAtlasQueue(admin, 100, isCron ? null : auth!.companyId);
    return NextResponse.json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Atlas worker failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const moduleGate = await requireApiModule("atlas_intelligence");
  if (moduleGate) return moduleGate;
 return run(request); }
export async function POST(request: NextRequest) {
  const moduleGate = await requireApiModule("atlas_intelligence");
  if (moduleGate) return moduleGate;
 return run(request); }
