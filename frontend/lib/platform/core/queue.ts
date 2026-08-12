import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlatformQueueTask = {
  id: string;
  company_id: string;
  source_event_id: string | null;
  task_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  attempts: number;
};

export async function claimPlatformQueue(
  admin: SupabaseClient,
  limit = 100,
  companyId: string | null = null,
) {
  await admin.rpc("atlas_requeue_stale_tasks");
  const { data, error } = await admin.rpc("atlas_claim_queue", {
    p_limit: limit,
    p_company_id: companyId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlatformQueueTask[];
}

export async function completePlatformQueueTasks(
  admin: SupabaseClient,
  taskIds: string[],
) {
  if (!taskIds.length) return;
  const { error } = await admin
    .from("atlas_queue")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      last_error: null,
      locked_at: null,
    })
    .in("id", taskIds);
  if (error) throw new Error(error.message);
}

export async function retryPlatformQueueTask(
  admin: SupabaseClient,
  task: PlatformQueueTask,
  message: string,
) {
  const retry = Number(task.attempts ?? 0) < 5;
  const next = new Date(Date.now() + 15 * 60_000).toISOString();
  const { error } = await admin
    .from("atlas_queue")
    .update({
      status: retry ? "queued" : "failed",
      available_at: retry ? next : new Date().toISOString(),
      locked_at: null,
      completed_at: retry ? null : new Date().toISOString(),
      last_error: message,
    })
    .eq("id", task.id);
  if (error) throw new Error(error.message);
}

export async function pruneCompletedPlatformQueue(
  admin: SupabaseClient,
  retentionDays = 30,
) {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
  const { error } = await admin
    .from("atlas_queue")
    .delete()
    .eq("status", "completed")
    .lt("completed_at", cutoff);
  if (error) throw new Error(error.message);
}
