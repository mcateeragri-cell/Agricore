import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { requireApiModule } from "@/lib/modules/api-access";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_GATE_TYPES = new Set(["none", "waiting_parts", "quality_check", "manager_approval", "warranty_review"]);

const ALLOWED_STATUS_MAPPINGS = new Set([
  "open",
  "scheduled",
  "in_progress",
  "waiting_parts",
  "waiting_customer",
  "completed",
]);

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function canManage(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.role === "service_manager" ||
    auth.permissions.includes("settings.manage") ||
    auth.permissions.includes("jobs.assign") ||
    auth.permissions.includes("jobs.edit")
  );
}

export async function GET() {
  const gate = await requireApiModule("workshop_operations");
  if (gate) return gate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: workflow, error } = await admin
    .from("company_workshop_workflows")
    .select("id,name,slug,is_default,active")
    .eq("company_id", auth.companyId)
    .eq("active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!workflow) return NextResponse.json({ workflow: null, stages: [], canManage: canManage(auth) });

  const { data: stages, error: stagesError } = await admin
    .from("company_workshop_stages")
    .select("id,name,slug,position,status_mapping,colour,is_terminal,gate_type,gate_required,active")
    .eq("company_id", auth.companyId)
    .eq("workflow_id", workflow.id)
    .eq("active", true)
    .order("position");
  if (stagesError) return NextResponse.json({ error: stagesError.message }, { status: 500 });

  return NextResponse.json({ workflow, stages: stages ?? [], canManage: canManage(auth) });
}

export async function PUT(request: NextRequest) {
  const gate = await requireApiModule("workshop_operations");
  if (gate) return gate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManage(auth)) return NextResponse.json({ error: "You do not have permission to manage workshop workflows." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const stages = Array.isArray(body?.stages) ? body.stages : [];
  if (stages.length < 2 || stages.length > 20) {
    return NextResponse.json({ error: "A workflow must contain between 2 and 20 stages." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: workflow, error: workflowError } = await admin
    .from("company_workshop_workflows")
    .select("id")
    .eq("company_id", auth.companyId)
    .eq("active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (workflowError) return NextResponse.json({ error: workflowError.message }, { status: 500 });
  if (!workflow) return NextResponse.json({ error: "No active workshop workflow exists." }, { status: 404 });

  const normalised = stages.map((stage: any, index: number) => {
    const name = clean(stage?.name);
    const slug = slugify(clean(stage?.slug) || name);
    const statusMapping = clean(stage?.statusMapping || stage?.status_mapping || "in_progress").toLowerCase();
    if (!name || !slug) throw new Error(`Stage ${index + 1} needs a name.`);
    if (!ALLOWED_STATUS_MAPPINGS.has(statusMapping)) throw new Error(`Stage ${name} has an unsupported compatibility status.`);
    return {
      id: clean(stage?.id) || null,
      company_id: auth.companyId,
      workflow_id: workflow.id,
      name,
      slug,
      position: index,
      status_mapping: statusMapping,
      colour: clean(stage?.colour) || "#0f766e",
      is_terminal: Boolean(stage?.isTerminal ?? stage?.is_terminal),
      gate_type: (() => {
        const value = clean(stage?.gateType ?? stage?.gate_type ?? "none").toLowerCase();
        if (!ALLOWED_GATE_TYPES.has(value)) throw new Error(`Stage ${name} has an unsupported control type.`);
        return value;
      })(),
      gate_required: Boolean(stage?.gateRequired ?? stage?.gate_required),
      active: true,
      updated_at: new Date().toISOString(),
    };
  });

  if (normalised.filter((stage: any) => stage.is_terminal).length > 1) {
    return NextResponse.json({ error: "Only one workflow stage can be marked terminal." }, { status: 400 });
  }

  const idsToKeep = normalised.map((row: any) => row.id).filter(Boolean);
  let disableQuery = admin
    .from("company_workshop_stages")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("company_id", auth.companyId)
    .eq("workflow_id", workflow.id);
  if (idsToKeep.length) disableQuery = disableQuery.not("id", "in", `(${idsToKeep.join(",")})`);
  const { error: disableError } = await disableQuery;
  if (disableError) return NextResponse.json({ error: disableError.message }, { status: 500 });

  for (const row of normalised) {
    const payload = { ...row } as any;
    if (!payload.id) delete payload.id;
    const query = payload.id
      ? admin.from("company_workshop_stages").update(payload).eq("id", payload.id).eq("company_id", auth.companyId)
      : admin.from("company_workshop_stages").insert(payload);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return GET();
}

export async function POST(request: NextRequest) {
  const gate = await requireApiModule("workshop_operations");
  if (gate) return gate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManage(auth)) return NextResponse.json({ error: "You do not have permission to move workshop jobs." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const jobId = clean(body?.jobId);
  const stageId = clean(body?.stageId);
  const note = clean(body?.note);
  if (!jobId || !stageId) return NextResponse.json({ error: "jobId and stageId are required." }, { status: 400 });

  const admin = createSupabaseAdmin();
  const branchIds = auth.activeBranchId ? [auth.activeBranchId] : auth.accessibleOperationalBranchIds;

  let jobQuery = admin.from("jobs").select("id,branch_id,status").eq("company_id", auth.companyId).eq("id", jobId);
  if (branchIds.length) jobQuery = jobQuery.in("branch_id", branchIds);
  const { data: job, error: jobError } = await jobQuery.maybeSingle();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  if (!job) return NextResponse.json({ error: "Job was not found in your current depot scope." }, { status: 404 });

  const { data: stage, error: stageError } = await admin
    .from("company_workshop_stages")
    .select("id,workflow_id,name,status_mapping,is_terminal,gate_type,gate_required")
    .eq("company_id", auth.companyId)
    .eq("id", stageId)
    .eq("active", true)
    .maybeSingle();
  if (stageError) return NextResponse.json({ error: stageError.message }, { status: 500 });
  if (!stage) return NextResponse.json({ error: "Workflow stage was not found." }, { status: 404 });

  const { data: previousState } = await admin
    .from("job_workflow_states")
    .select("stage_id")
    .eq("company_id", auth.companyId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (previousState?.stage_id && String(previousState.stage_id) !== String(stage.id)) {
    const { data: currentStage, error: currentStageError } = await admin
      .from("company_workshop_stages")
      .select("id,name,gate_type,gate_required")
      .eq("company_id", auth.companyId)
      .eq("id", previousState.stage_id)
      .maybeSingle();
    if (currentStageError) return NextResponse.json({ error: currentStageError.message }, { status: 500 });

    if (currentStage?.gate_required && currentStage.gate_type && currentStage.gate_type !== "none") {
      const gateType = String(currentStage.gate_type);
      let gateError: string | null = null;

      if (gateType === "waiting_parts") {
        const { data: rows, error } = await admin
          .from("job_workshop_part_requirements")
          .select("id,status")
          .eq("company_id", auth.companyId)
          .eq("job_id", jobId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!rows?.length) gateError = "Add at least one required part before leaving Waiting Parts.";
        else if (rows.some((row) => !["available", "received", "waived"].includes(String(row.status)))) gateError = "All required parts must be available, received or waived before this job can move on.";
      }

      if (gateType === "quality_check") {
        const { data: templateItems, error: templateError } = await admin
          .from("company_workshop_qc_items")
          .select("id,required")
          .eq("company_id", auth.companyId)
          .eq("active", true);
        if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 });
        const requiredIds = (templateItems ?? []).filter((row) => row.required).map((row) => String(row.id));
        const { data: checks, error: checksError } = await admin
          .from("job_workshop_qc_checks")
          .select("qc_item_id,result")
          .eq("company_id", auth.companyId)
          .eq("job_id", jobId);
        if (checksError) return NextResponse.json({ error: checksError.message }, { status: 500 });
        const passed = new Set((checks ?? []).filter((row) => row.result === "pass").map((row) => String(row.qc_item_id)));
        if (!requiredIds.length) gateError = "Configure at least one required QC item before using a mandatory Quality Check stage.";
        else if (requiredIds.some((id) => !passed.has(id))) gateError = "All required quality checks must pass before this job can move on.";
      }

      if (gateType === "manager_approval") {
        const { data: approval, error } = await admin
          .from("job_workshop_approvals")
          .select("status")
          .eq("company_id", auth.companyId)
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (approval?.status !== "approved") gateError = "Manager approval is required before this job can move on.";
      }

      if (gateType === "warranty_review") {
        const { data: review, error } = await admin
          .from("job_warranty_reviews")
          .select("review_status")
          .eq("company_id", auth.companyId)
          .eq("job_id", jobId)
          .maybeSingle();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!review || !["reviewed", "not_warranty", "approved"].includes(String(review.review_status))) gateError = "Complete the warranty review before this job can move on.";
      }

      if (gateError) return NextResponse.json({ error: gateError, code: "WORKFLOW_GATE_BLOCKED", gateType, stage: currentStage.name }, { status: 409 });
    }
  }

  const enteredAt = new Date().toISOString();
  const { error: stateError } = await admin.from("job_workflow_states").upsert({
    company_id: auth.companyId,
    job_id: jobId,
    workflow_id: stage.workflow_id,
    stage_id: stage.id,
    entered_at: enteredAt,
    updated_at: enteredAt,
    updated_by: auth.userId,
  }, { onConflict: "job_id" });
  if (stateError) return NextResponse.json({ error: stateError.message }, { status: 500 });

  const statusMapping = ALLOWED_STATUS_MAPPINGS.has(String(stage.status_mapping)) ? String(stage.status_mapping) : "in_progress";
  const update: Record<string, unknown> = { status: statusMapping, updated_at: enteredAt };
  if (statusMapping === "completed") update.completed_date = enteredAt.slice(0, 10);
  const { error: jobUpdateError } = await admin.from("jobs").update(update).eq("company_id", auth.companyId).eq("id", jobId);
  if (jobUpdateError) return NextResponse.json({ error: jobUpdateError.message }, { status: 500 });

  const { error: auditError } = await admin.from("job_workflow_events").insert({
    company_id: auth.companyId,
    job_id: jobId,
    workflow_id: stage.workflow_id,
    from_stage_id: previousState?.stage_id ?? null,
    to_stage_id: stage.id,
    event_type: "stage_changed",
    note: note || null,
    changed_by: auth.userId,
    changed_at: enteredAt,
  });
  if (auditError) return NextResponse.json({ error: auditError.message }, { status: 500 });

  return NextResponse.json({ ok: true, stage, status: statusMapping });
}
