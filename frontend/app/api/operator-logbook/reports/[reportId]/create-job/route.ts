import { NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const respond = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const auth = await getAuthenticatedUserContext();
  if (!auth?.companyId) return respond("Sign in required", 401);
  if (!auth.permissions.includes("jobs.edit")) return respond("Job editing permission required", 403);
  const { reportId } = await params;
  if (!UUID.test(reportId)) return respond("Invalid report ID", 400);
  const admin = createSupabaseAdmin();
  // Branch scope is derived exclusively from the authenticated server context.
  if (auth.operationsScope === "own_jobs") return respond("Company or branch job access required", 403);
  const allowedBranches = auth.operationsScope === "company" ? null : auth.accessibleOperationalBranchIds;
  if (allowedBranches !== null && allowedBranches.length === 0) return respond("No accessible branches", 403);
  const { data, error } = await admin.rpc("agricore_create_job_from_operator_breakdown", {
    p_report_id: reportId, p_company_id: auth.companyId, p_allowed_branch_ids: allowedBranches,
  });
  if (error) {
    console.error("Unable to create job from operator breakdown", { code: error.code, message: error.message });
    if (error.code === "42501") return respond("Not permitted for this branch", 403);
    return respond("Unable to create job from this breakdown", 409);
  }
  const job = Array.isArray(data) ? data[0] : data;
  if (!job?.job_id) return respond("Job creation returned no result", 500);
  return NextResponse.json({ ok: true, job: { id: job.job_id, job_number: job.job_number }, alreadyCreated: job.already_created }, { headers: { "Cache-Control": "no-store" } });
}
