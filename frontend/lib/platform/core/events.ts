import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlatformEventInput = {
  companyId: string;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
};

export async function emitPlatformEvent(
  admin: SupabaseClient,
  event: PlatformEventInput,
) {
  const { data, error } = await admin
    .from("atlas_events")
    .insert({
      company_id: event.companyId,
      event_type: event.eventType,
      entity_type: event.entityType,
      entity_id: event.entityId ?? null,
      payload: event.payload ?? {},
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return String(data.id);
}
