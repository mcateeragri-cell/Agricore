import type { SupabaseClient } from "@supabase/supabase-js";

type DeleteFailure = { id: string; error: string };
export type DeleteResult = { processed: number; failed: DeleteFailure[] };

type RpcDeleteJobResult = {
  deleted?: boolean;
  job_id?: string;
  job_number?: string | null;
};

async function removeJobPhotoObjects(
  admin: SupabaseClient,
  companyId: string,
  jobId: string,
) {
  const { data, error } = await admin
    .from("job_photos")
    .select("file_path")
    .eq("company_id", companyId)
    .eq("job_id", jobId);

  // Some older schemas do not have job_photos. The database deletion RPC handles
  // relational cleanup; storage cleanup is best-effort only.
  if (error) return;

  const paths = (data ?? [])
    .map((row: { file_path?: string | null }) => row.file_path)
    .filter((value): value is string => Boolean(value));

  if (paths.length) {
    await admin.storage.from("job-photos").remove(paths);
  }
}

/**
 * Deletes jobs through the database-owned deletion engine.
 *
 * The RPC performs the relational work transactionally: invoice protection,
 * stock restoration, stock-movement cleanup, dependent-row cleanup, job delete
 * and audit logging. Storage objects are removed separately on a best-effort basis.
 */
export async function deleteJobsSafely(
  admin: SupabaseClient,
  companyId: string,
  userId: string,
  ids: string[],
): Promise<DeleteResult> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  const failed: DeleteFailure[] = [];
  let processed = 0;

  for (const jobId of uniqueIds) {
    try {
      await removeJobPhotoObjects(admin, companyId, jobId);

      const { data, error } = await admin.rpc("agricore_delete_job", {
        p_company_id: companyId,
        p_job_id: jobId,
        p_deleted_by: userId,
      });

      if (error) throw new Error(error.message);

      const result = (data ?? {}) as RpcDeleteJobResult;
      if (result.deleted === false) {
        throw new Error("The job was not deleted.");
      }

      processed += 1;
    } catch (error) {
      failed.push({
        id: jobId,
        error: error instanceof Error ? error.message : "Unable to delete job.",
      });
    }
  }

  return { processed, failed };
}
