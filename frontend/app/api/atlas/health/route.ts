import { requireApiModule } from "@/lib/modules/api-access";
import { NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany, isPlatformAdministrator } from "@/lib/platform/core";

export const dynamic = "force-dynamic";

export async function GET() {
  const moduleGate = await requireApiModule("atlas_intelligence");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth)) return NextResponse.json({ error: "Company administration permission is required." }, { status: 403 });

  const admin = createSupabaseAdmin();
  const companyId = auth.companyId;
  const canSeePlatformRuns = isPlatformAdministrator(auth);

  const [queued, running, completed, failed, runs, snapshot, events, cache] = await Promise.all([
    admin.from("atlas_queue").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "queued"),
    admin.from("atlas_queue").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "running"),
    admin.from("atlas_queue").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "completed"),
    admin.from("atlas_queue").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "failed"),
    canSeePlatformRuns
      ? admin.from("atlas_processing_runs").select("id,status,started_at,completed_at,tasks_processed,tasks_failed,companies_processed,last_error").order("started_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [], error: null }),
    admin.from("atlas_intelligence_snapshots").select("generated_at,updated_at").eq("company_id", companyId).maybeSingle(),
    admin.from("atlas_events").select("id,processed_at,processing_error,occurred_at", { count: "exact" }).eq("company_id", companyId).order("occurred_at", { ascending: false }).limit(20),
    admin.from("atlas_ai_context_cache").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ]);

  const firstError = queued.error || running.error || completed.error || failed.error || runs.error || snapshot.error || events.error || cache.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({
    companyId,
    queue: {
      queued: queued.count ?? 0,
      running: running.count ?? 0,
      completed: completed.count ?? 0,
      failed: failed.count ?? 0,
    },
    recentRuns: runs.data ?? [],
    snapshot: snapshot.data ?? null,
    recentEvents: events.data ?? [],
    eventCount: events.count ?? 0,
    contextCacheCount: cache.count ?? 0,
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim() || process.env.AGRICORE_CRON_SECRET?.trim()),
  }, { headers: { "Cache-Control": "no-store" } });
}
