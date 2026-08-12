import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlatformAuditEntry = {
  companyId: string;
  userId?: string | null;
  entityType: string;
  entityId?: string | null;
  entityReference?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
};

function isOptionalAuditSchemaError(error: { code?: string | null; message?: string | null } | null) {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

export async function writePlatformAudit(
  admin: SupabaseClient,
  entry: PlatformAuditEntry,
) {
  const { error } = await admin.from("data_management_audit").insert({
    company_id: entry.companyId,
    user_id: entry.userId ?? null,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    entity_reference: entry.entityReference ?? entry.entityId ?? null,
    action: entry.action,
    metadata: entry.metadata ?? {},
  });

  if (error && !isOptionalAuditSchemaError(error)) {
    console.error("Unable to write AgriCore platform audit entry:", error);
  }
}

export async function writeBulkPlatformAudit(
  admin: SupabaseClient,
  entry: Omit<PlatformAuditEntry, "entityId" | "entityReference"> & {
    ids: string[];
    processed: number;
  },
) {
  if (entry.processed <= 0) return;
  return writePlatformAudit(admin, {
    companyId: entry.companyId,
    userId: entry.userId,
    entityType: entry.entityType,
    entityId: entry.ids.length === 1 ? entry.ids[0] : null,
    entityReference:
      entry.ids.length === 1
        ? entry.ids[0]
        : `${entry.processed} ${entry.entityType} record(s)`,
    action: entry.action,
    metadata: {
      ...(entry.metadata ?? {}),
      requested_ids: entry.ids,
      processed: entry.processed,
    },
  });
}
