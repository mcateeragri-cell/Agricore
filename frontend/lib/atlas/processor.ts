import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimPlatformQueue,
  completePlatformQueueTasks,
  pruneCompletedPlatformQueue,
  retryPlatformQueueTask,
  type PlatformQueueTask,
} from "@/lib/platform/core";
import { executeAtlasAutomations } from "@/lib/atlas/automation-executor";
import { refreshAtlasMachineContext } from "@/lib/atlas/context-cache";
import { rebuildAtlasSnapshot } from "@/lib/atlas/snapshots";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import { processFinancePostingTask } from "@/lib/platform/finance";


function machineIdsFromTasks(tasks: PlatformQueueTask[]) {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (task.entity_type === "machines" && task.entity_id) ids.add(task.entity_id);
    const payload = task.payload ?? {};
    for (const key of ["machine_id", "machineId"] as const) {
      const value = payload[key];
      if (typeof value === "string" && value) ids.add(value);
    }
  }
  return [...ids].slice(0, 20);
}

export async function processAtlasQueue(admin: SupabaseClient, limit = 100, companyId: string | null = null) {
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await admin
    .from("atlas_processing_runs")
    .insert({ status: "running", started_at: startedAt })
    .select("id")
    .single();
  if (runError) throw new Error(runError.message);

  let processed = 0;
  let failed = 0;
  let companiesProcessed = 0;
  let lastError: string | null = null;

  try {
    const tasks = await claimPlatformQueue(admin, limit, companyId);

    const byCompany = new Map<string, PlatformQueueTask[]>();
    for (const task of tasks) {
      const current = byCompany.get(task.company_id) ?? [];
      current.push(task);
      byCompany.set(task.company_id, current);
    }

    for (const [companyId, companyTasks] of byCompany) {
      // Finance posting tasks are processed independently so one accounting error never
      // prevents normal Atlas intelligence/automation tasks for the same company.
      const financeTasks = companyTasks.filter((task) => task.task_type === "finance_posting");
      const atlasTasks = companyTasks.filter((task) => task.task_type !== "finance_posting");

      for (const task of financeTasks) {
        try {
          await processFinancePostingTask(admin, task);
          await completePlatformQueueTasks(admin, [task.id]);
          processed += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown finance posting error";
          lastError = message;
          failed += 1;
          await retryPlatformQueueTask(admin, task, message);
        }
      }

      if (!atlasTasks.length) {
        companiesProcessed += 1;
        continue;
      }

      try {
        let overview = null;
        if (await isCompanyFeatureEnabled(admin, companyId, "atlas_intelligence")) {
          overview = await rebuildAtlasSnapshot(admin, companyId);
          for (const machineId of machineIdsFromTasks(atlasTasks)) {
            await refreshAtlasMachineContext(admin, companyId, machineId);
          }
        }

        if (
          overview &&
          (await isCompanyFeatureEnabled(admin, companyId, "atlas_automations"))
        ) {
          await executeAtlasAutomations(admin, companyId, overview);
        }

        const eventIds = atlasTasks.map((task) => task.source_event_id).filter(Boolean) as string[];
        if (eventIds.length) {
          await admin.from("atlas_events").update({ processed_at: new Date().toISOString(), processing_error: null }).in("id", eventIds);
        }

        const taskIds = atlasTasks.map((task) => task.id);
        await completePlatformQueueTasks(admin, taskIds);

        processed += atlasTasks.length;
        companiesProcessed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Atlas processing error";
        lastError = message;
        failed += atlasTasks.length;
        for (const task of atlasTasks) {
          await retryPlatformQueueTask(admin, task, message);
        }
        const eventIds = atlasTasks.map((task) => task.source_event_id).filter(Boolean) as string[];
        if (eventIds.length) {
          await admin.from("atlas_events").update({ processing_error: message }).in("id", eventIds);
        }
      }
    }

    await pruneCompletedPlatformQueue(admin, 30);

    await admin.from("atlas_processing_runs").update({
      status: failed ? "completed_with_errors" : "completed",
      completed_at: new Date().toISOString(),
      tasks_processed: processed,
      tasks_failed: failed,
      companies_processed: companiesProcessed,
      last_error: lastError,
    }).eq("id", run.id);

    return { processed, failed, companiesProcessed, runId: run.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Atlas worker error";
    await admin.from("atlas_processing_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      tasks_processed: processed,
      tasks_failed: failed,
      companies_processed: companiesProcessed,
      last_error: message,
    }).eq("id", run.id);
    throw error;
  }
}
