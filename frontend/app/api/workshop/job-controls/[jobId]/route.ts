import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { requireApiModule } from "@/lib/modules/api-access";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, any>;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function canManage(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.role === "service_manager" ||
    auth.permissions.includes("jobs.edit") ||
    auth.permissions.includes("jobs.review")
  );
}

async function loadJobForScope(jobId: string) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;

  const admin = createSupabaseAdmin();
  const branchIds = auth.activeBranchId ? [auth.activeBranchId] : auth.accessibleOperationalBranchIds;
  let query = admin
    .from("jobs")
    .select("id,branch_id,job_number,status,priority")
    .eq("company_id", auth.companyId)
    .eq("id", jobId);
  if (branchIds.length) query = query.in("branch_id", branchIds);
  const { data: job, error } = await query.maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) } as const;
  if (!job) return { error: NextResponse.json({ error: "Job was not found in your current depot scope." }, { status: 404 }) } as const;
  return { auth, admin, job } as const;
}

async function buildPayload(jobId: string, auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>, admin: ReturnType<typeof createSupabaseAdmin>, job: Row) {
  const [stateResult, partsResult, qcTemplateResult, qcChecksResult, approvalResult, warrantyResult, stockResult] = await Promise.all([
    admin
      .from("job_workflow_states")
      .select("stage_id,entered_at,company_workshop_stages(id,name,slug,gate_type,gate_required)")
      .eq("company_id", auth.companyId)
      .eq("job_id", jobId)
      .maybeSingle(),
    admin
      .from("job_workshop_part_requirements")
      .select("id,stock_item_id,purchase_order_id,part_number,description,quantity_required,quantity_reserved,status,supplier_eta,notes,updated_at")
      .eq("company_id", auth.companyId)
      .eq("job_id", jobId)
      .order("created_at"),
    admin
      .from("company_workshop_qc_items")
      .select("id,label,description,position,required")
      .eq("company_id", auth.companyId)
      .eq("active", true)
      .order("position"),
    admin
      .from("job_workshop_qc_checks")
      .select("id,qc_item_id,result,notes,checked_at")
      .eq("company_id", auth.companyId)
      .eq("job_id", jobId),
    admin
      .from("job_workshop_approvals")
      .select("id,status,note,approved_by,approved_at,created_at")
      .eq("company_id", auth.companyId)
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("job_warranty_reviews")
      .select("warranty_type,manufacturer,claim_reference,claim_status,review_status,expected_value,reimbursed_value,submitted_at,reviewed_at,notes")
      .eq("company_id", auth.companyId)
      .eq("job_id", jobId)
      .maybeSingle(),
    admin
      .from("stock_items")
      .select("id,part_number,description")
      .eq("company_id", auth.companyId)
      .eq("active", true)
      .order("part_number")
      .limit(250),
  ]);

  const firstError = [stateResult, partsResult, qcTemplateResult, qcChecksResult, approvalResult, warrantyResult, stockResult].find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const checksByItem = new Map((qcChecksResult.data ?? []).map((row: Row) => [String(row.qc_item_id), row]));
  const qc = (qcTemplateResult.data ?? []).map((item: Row) => {
    const check = checksByItem.get(String(item.id));
    return {
      id: String(item.id),
      label: String(item.label),
      description: String(item.description ?? ""),
      required: Boolean(item.required),
      result: String(check?.result ?? "pending"),
      notes: String(check?.notes ?? ""),
      checkedAt: check?.checked_at ?? null,
    };
  });

  const partRows = (partsResult.data ?? []) as Row[];
  const partsComplete = partRows.length > 0 && partRows.every((row) => ["available", "received", "waived"].includes(String(row.status)));
  const requiredQc = qc.filter((row) => row.required);
  const qcComplete = requiredQc.length > 0 && requiredQc.every((row) => row.result === "pass");

  return {
    job: {
      id: String(job.id),
      jobNumber: String(job.job_number ?? ""),
      status: String(job.status ?? ""),
    },
    stage: stateResult.data?.company_workshop_stages ?? null,
    parts: partRows,
    stockItems: stockResult.data ?? [],
    qc,
    approval: approvalResult.data ?? null,
    warranty: warrantyResult.data ?? null,
    gateStatus: {
      partsComplete,
      qcComplete,
      managerApproved: approvalResult.data?.status === "approved",
      warrantyReviewed: ["reviewed", "not_warranty", "approved"].includes(String(warrantyResult.data?.review_status ?? "")),
    },
    canManage: canManage(auth),
  };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const gate = await requireApiModule("workshop_operations");
  if (gate) return gate;
  const { jobId } = await context.params;
  const scoped = await loadJobForScope(jobId);
  if ("error" in scoped) return scoped.error;

  try {
    return NextResponse.json(await buildPayload(jobId, scoped.auth, scoped.admin, scoped.job));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load workshop controls." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const gate = await requireApiModule("workshop_operations");
  if (gate) return gate;
  const { jobId } = await context.params;
  const scoped = await loadJobForScope(jobId);
  if ("error" in scoped) return scoped.error;
  if (!canManage(scoped.auth)) return NextResponse.json({ error: "You do not have permission to manage workshop controls." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const action = clean(body?.action);
  const now = new Date().toISOString();
  const { admin, auth, job } = scoped;

  try {
    if (action === "add_part") {
      const stockItemId = clean(body?.stockItemId) || null;
      const description = clean(body?.description);
      const quantityRequired = Number(body?.quantityRequired ?? 1);
      if (!description || !Number.isFinite(quantityRequired) || quantityRequired <= 0) {
        return NextResponse.json({ error: "Part description and a positive quantity are required." }, { status: 400 });
      }

      let partNumber = clean(body?.partNumber) || null;
      if (stockItemId) {
        const { data: stockItem, error } = await admin
          .from("stock_items")
          .select("id,part_number,description")
          .eq("company_id", auth.companyId)
          .eq("id", stockItemId)
          .maybeSingle();
        if (error) throw error;
        if (!stockItem) return NextResponse.json({ error: "Stock item was not found." }, { status: 404 });
        partNumber = partNumber || stockItem.part_number || null;
      }

      const { error } = await admin.from("job_workshop_part_requirements").insert({
        company_id: auth.companyId,
        job_id: jobId,
        stock_item_id: stockItemId,
        purchase_order_id: clean(body?.purchaseOrderId) || null,
        part_number: partNumber,
        description,
        quantity_required: quantityRequired,
        status: clean(body?.status) || "required",
        supplier_eta: clean(body?.supplierEta) || null,
        notes: clean(body?.notes) || null,
        created_by: auth.userId,
        updated_at: now,
      });
      if (error) throw error;
    } else if (action === "update_part") {
      const id = clean(body?.id);
      const status = clean(body?.status);
      if (!id || !["required", "reserved", "ordered", "available", "received", "backorder", "waived"].includes(status)) {
        return NextResponse.json({ error: "A valid part requirement and status are required." }, { status: 400 });
      }
      const { error } = await admin
        .from("job_workshop_part_requirements")
        .update({ status, supplier_eta: clean(body?.supplierEta) || null, notes: clean(body?.notes) || null, updated_at: now })
        .eq("company_id", auth.companyId)
        .eq("job_id", jobId)
        .eq("id", id);
      if (error) throw error;
    } else if (action === "set_qc") {
      const qcItemId = clean(body?.qcItemId);
      const result = clean(body?.result);
      if (!qcItemId || !["pending", "pass", "fail", "not_applicable"].includes(result)) {
        return NextResponse.json({ error: "A valid QC item and result are required." }, { status: 400 });
      }
      const { data: item, error: itemError } = await admin
        .from("company_workshop_qc_items")
        .select("id")
        .eq("company_id", auth.companyId)
        .eq("id", qcItemId)
        .eq("active", true)
        .maybeSingle();
      if (itemError) throw itemError;
      if (!item) return NextResponse.json({ error: "QC item was not found." }, { status: 404 });
      const { error } = await admin.from("job_workshop_qc_checks").upsert({
        company_id: auth.companyId,
        job_id: jobId,
        qc_item_id: qcItemId,
        result,
        notes: clean(body?.notes) || null,
        checked_by: auth.userId,
        checked_at: result === "pending" ? null : now,
        updated_at: now,
      }, { onConflict: "job_id,qc_item_id" });
      if (error) throw error;
    } else if (action === "approval") {
      const status = clean(body?.status);
      if (!["approved", "rejected"].includes(status)) return NextResponse.json({ error: "Approval must be approved or rejected." }, { status: 400 });
      const { error } = await admin.from("job_workshop_approvals").insert({
        company_id: auth.companyId,
        job_id: jobId,
        status,
        note: clean(body?.note) || null,
        approved_by: auth.userId,
        approved_at: now,
      });
      if (error) throw error;
    } else if (action === "warranty") {
      const reviewStatus = clean(body?.reviewStatus) || "pending";
      const warrantyType = clean(body?.warrantyType) || null;
      if (!["pending", "reviewed", "not_warranty", "approved"].includes(reviewStatus)) {
        return NextResponse.json({ error: "Invalid warranty review status." }, { status: 400 });
      }
      const { error } = await admin.from("job_warranty_reviews").upsert({
        company_id: auth.companyId,
        job_id: jobId,
        warranty_type: warrantyType,
        manufacturer: clean(body?.manufacturer) || null,
        claim_reference: clean(body?.claimReference) || null,
        claim_status: clean(body?.claimStatus) || (reviewStatus === "not_warranty" ? "not_applicable" : "draft"),
        review_status: reviewStatus,
        expected_value: body?.expectedValue === "" || body?.expectedValue == null ? null : Number(body.expectedValue),
        reimbursed_value: body?.reimbursedValue === "" || body?.reimbursedValue == null ? null : Number(body.reimbursedValue),
        submitted_at: clean(body?.submittedAt) || null,
        reviewed_by: reviewStatus === "pending" ? null : auth.userId,
        reviewed_at: reviewStatus === "pending" ? null : now,
        notes: clean(body?.notes) || null,
        updated_at: now,
      }, { onConflict: "job_id" });
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "Unsupported workshop control action." }, { status: 400 });
    }

    const { data: workflowState } = await admin
      .from("job_workflow_states")
      .select("workflow_id,stage_id")
      .eq("company_id", auth.companyId)
      .eq("job_id", jobId)
      .maybeSingle();

    if (workflowState?.workflow_id && workflowState?.stage_id) {
      await admin.from("job_workflow_events").insert({
        company_id: auth.companyId,
        job_id: jobId,
        workflow_id: workflowState.workflow_id,
        to_stage_id: workflowState.stage_id,
        event_type: `control_${action}`,
        note: clean(body?.note || body?.notes) || null,
        changed_by: auth.userId,
        changed_at: now,
      });
    }

    return NextResponse.json(await buildPayload(jobId, auth, admin, job));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update workshop controls." }, { status: 500 });
  }
}
