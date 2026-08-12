import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAtlasOverview, type AtlasOverview } from "@/lib/atlas/analysis";

export async function rebuildAtlasSnapshot(
  admin: SupabaseClient,
  companyId: string,
): Promise<AtlasOverview> {
  const overview = await buildAtlasOverview(admin, companyId);
  const generatedAt = overview.generatedAt || new Date().toISOString();

  const { error } = await admin.from("atlas_intelligence_snapshots").upsert(
    {
      company_id: companyId,
      overview,
      generated_at: generatedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" },
  );

  if (error) throw new Error(error.message);
  return overview;
}

export async function loadAtlasSnapshot(
  admin: SupabaseClient,
  companyId: string,
  maxAgeMinutes = 30,
) {
  const { data, error } = await admin
    .from("atlas_intelligence_snapshots")
    .select("overview,generated_at")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.overview || !data.generated_at) return null;

  const age = Date.now() - new Date(data.generated_at).getTime();
  if (!Number.isFinite(age) || age > maxAgeMinutes * 60_000) return null;

  return {
    overview: data.overview as AtlasOverview,
    generatedAt: String(data.generated_at),
  };
}
