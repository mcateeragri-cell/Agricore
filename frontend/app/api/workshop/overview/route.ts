import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { requireApiModule } from "@/lib/modules/api-access";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, any>;

const CLOSED_JOB_STATUSES = new Set([
  "completed",
  "closed",
  "cancelled",
  "invoiced",
]);

const WAITING_PARTS_STATUSES = new Set([
  "waiting_parts",
  "waiting parts",
  "awaiting_parts",
  "awaiting parts",
  "parts_required",
  "parts required",
]);

function norm(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function localDate(value: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const now = new Date();
  const adjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
}

function hoursBetween(start: unknown, end: unknown) {
  const a = new Date(String(start ?? ""));
  const b = new Date(String(end ?? ""));
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) return 0;
  return Math.max(0, (b.getTime() - a.getTime()) / 3_600_000);
}

function firstRelated<T = Row>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function GET(request: NextRequest) {
  const moduleGate = await requireApiModule("workshop_operations");
  if (moduleGate) return moduleGate;

  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (auth.role === "technician" || auth.role === "apprentice") {
      return NextResponse.json(
        { error: "Workshop Operations is restricted to office and management roles." },
        { status: 403 },
      );
    }

    const branchIds = auth.activeBranchId
      ? [auth.activeBranchId]
      : auth.accessibleOperationalBranchIds;

    if (branchIds.length === 0) {
      return NextResponse.json({
        date: localDate(request.nextUrl.searchParams.get("date")),
        settings: { workdayHours: 8, overloadPercent: 100, tvRefreshSeconds: 30 },
        technicians: [],
        jobs: [],
        stats: {
          openJobs: 0,
          urgentJobs: 0,
          waitingParts: 0,
          inProgress: 0,
          readyForReview: 0,
          completedToday: 0,
          workshopLoadPercent: 0,
        },
      });
    }

    const date = localDate(request.nextUrl.searchParams.get("date"));
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);

    const admin = createSupabaseAdmin();

    const [workflowResult, workflowStagesResult] = await Promise.all([
      admin
        .from("company_workshop_workflows")
        .select("id,name,slug,is_default")
        .eq("company_id", auth.companyId)
        .eq("active", true)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("company_workshop_stages")
        .select("id,workflow_id,name,slug,position,status_mapping,colour,is_terminal,gate_type,gate_required")
        .eq("company_id", auth.companyId)
        .eq("active", true)
        .order("position"),
    ]);

    if (workflowResult.error) throw new Error(workflowResult.error.message);
    if (workflowStagesResult.error) throw new Error(workflowStagesResult.error.message);

    const [
      settingsResult,
      profilesResult,
      scopesResult,
      assignmentsResult,
      jobsResult,
    ] = await Promise.all([
      admin
        .from("company_workshop_settings")
        .select("workday_hours,overload_percent,tv_refresh_seconds")
        .eq("company_id", auth.companyId)
        .maybeSingle(),

      admin
        .from("company_member_profiles")
        .select("user_id,full_name,job_title,calendar_colour,is_active")
        .eq("company_id", auth.companyId)
        .eq("is_active", true)
        .order("full_name"),

      admin
        .from("company_member_branch_scopes")
        .select("user_id,home_branch_id,operations_scope")
        .eq("company_id", auth.companyId),

      admin
        .from("job_assignments")
        .select(`
          id,
          job_id,
          user_id,
          branch_id,
          scheduled_start,
          scheduled_end,
          assignment_status,
          notes
        `)
        .eq("company_id", auth.companyId)
        .in("branch_id", branchIds)
        .lt("scheduled_start", end.toISOString())
        .gt("scheduled_end", start.toISOString())
        .neq("assignment_status", "cancelled"),

      admin
        .from("jobs")
        .select(`
          id,
          branch_id,
          job_number,
          status,
          priority,
          engineer_name,
          fault_reported,
          opened_date,
          created_at,
          customers (
            id,
            contact_name,
            business_name
          ),
          machines (
            id,
            make,
            model,
            registration
          )
        `)
        .eq("company_id", auth.companyId)
        .in("branch_id", branchIds)
        .order("created_at", { ascending: false }),
    ]);

    const firstError =
      settingsResult.error ||
      profilesResult.error ||
      scopesResult.error ||
      assignmentsResult.error ||
      jobsResult.error;

    if (firstError) throw new Error(firstError.message);

    const settings = {
      workdayHours: Number(settingsResult.data?.workday_hours ?? 8),
      overloadPercent: Number(settingsResult.data?.overload_percent ?? 100),
      tvRefreshSeconds: Number(settingsResult.data?.tv_refresh_seconds ?? 30),
    };

    const scopeByUser = new Map<string, Row>();
    for (const row of (scopesResult.data ?? []) as Row[]) {
      scopeByUser.set(String(row.user_id), row);
    }

    const assignments = (assignmentsResult.data ?? []) as Row[];
    const jobs = (jobsResult.data ?? []) as Row[];
    const jobById = new Map(jobs.map((job) => [String(job.id), job]));

    const technicianIdsWithWork = new Set(
      assignments.map((row) => String(row.user_id)).filter(Boolean),
    );

    const technicians = ((profilesResult.data ?? []) as Row[])
      .filter((profile) => {
        const userId = String(profile.user_id);
        const scope = scopeByUser.get(userId);
        const homeBranchId = String(scope?.home_branch_id ?? "");
        return (
          technicianIdsWithWork.has(userId) ||
          !homeBranchId ||
          branchIds.includes(homeBranchId)
        );
      })
      .map((profile) => {
        const userId = String(profile.user_id);
        const userAssignments = assignments.filter(
          (assignment) => String(assignment.user_id) === userId,
        );
        const scheduledHours = userAssignments.reduce(
          (sum, assignment) =>
            sum + hoursBetween(assignment.scheduled_start, assignment.scheduled_end),
          0,
        );
        const capacityHours = Math.max(0.5, settings.workdayHours);
        const loadPercent = Math.round((scheduledHours / capacityHours) * 100);

        return {
          userId,
          fullName: String(profile.full_name ?? "Engineer"),
          jobTitle: String(profile.job_title ?? ""),
          colour: String(profile.calendar_colour ?? ""),
          scheduledHours: Math.round(scheduledHours * 10) / 10,
          capacityHours,
          loadPercent,
          assignments: userAssignments.map((assignment) => {
            const job = jobById.get(String(assignment.job_id));
            return {
              id: String(assignment.id),
              jobId: String(assignment.job_id),
              scheduledStart: assignment.scheduled_start,
              scheduledEnd: assignment.scheduled_end,
              status: String(assignment.assignment_status ?? "scheduled"),
              jobNumber: String(job?.job_number ?? ""),
              priority: String(job?.priority ?? "normal"),
              customerName: String(
                firstRelated(job?.customers)?.business_name ||
                  firstRelated(job?.customers)?.contact_name ||
                  "Customer",
              ),
              machine: [firstRelated(job?.machines)?.make, firstRelated(job?.machines)?.model]
                .filter(Boolean)
                .join(" "),
            };
          }),
        };
      });

    const scheduledJobIds = new Set(assignments.map((row) => String(row.job_id)));
    const todayKey = date;

    const workflow = workflowResult.data ?? null;
    const workflowStages = ((workflowStagesResult.data ?? []) as Row[]).filter(
      (stage) => !workflow || String(stage.workflow_id) === String(workflow.id),
    );

    const jobIds = jobs.map((job) => String(job.id));
    const { data: workflowStates, error: workflowStatesError } = jobIds.length
      ? await admin
          .from("job_workflow_states")
          .select("job_id,workflow_id,stage_id,entered_at")
          .eq("company_id", auth.companyId)
          .in("job_id", jobIds)
      : { data: [], error: null };

    if (workflowStatesError) throw new Error(workflowStatesError.message);

    const stateByJob = new Map(
      ((workflowStates ?? []) as Row[]).map((row) => [String(row.job_id), row]),
    );
    const stageById = new Map(workflowStages.map((stage) => [String(stage.id), stage]));
    const stageByStatus = new Map<string, Row>();
    for (const stage of workflowStages) {
      const status = norm(stage.status_mapping);
      if (status && !stageByStatus.has(status)) stageByStatus.set(status, stage);
    }

    const mappedJobs = jobs
      .filter((job) => !CLOSED_JOB_STATUSES.has(norm(job.status)) || scheduledJobIds.has(String(job.id)))
      .map((job) => {
        const customer = firstRelated(job.customers);
        const machine = firstRelated(job.machines);
        const jobAssignments = assignments.filter(
          (assignment) => String(assignment.job_id) === String(job.id),
        );

        return {
          id: String(job.id),
          branchId: String(job.branch_id ?? ""),
          jobNumber: String(job.job_number ?? ""),
          status: String(job.status ?? "open"),
          priority: String(job.priority ?? "normal"),
          engineerName: String(job.engineer_name ?? ""),
          faultReported: String(job.fault_reported ?? ""),
          openedDate: job.opened_date,
          customerName: String(customer?.business_name || customer?.contact_name || "Customer"),
          machine: [machine?.make, machine?.model].filter(Boolean).join(" "),
          registration: String(machine?.registration ?? ""),
          scheduled: jobAssignments.length > 0,
          workflowStage: (() => {
            const state = stateByJob.get(String(job.id));
            const explicit = state ? stageById.get(String(state.stage_id)) : null;
            const fallback = stageByStatus.get(norm(job.status));
            const stage = explicit ?? fallback ?? workflowStages[0] ?? null;
            return stage
              ? {
                  id: String(stage.id),
                  name: String(stage.name),
                  slug: String(stage.slug),
                  position: Number(stage.position ?? 0),
                  statusMapping: String(stage.status_mapping ?? "open"),
                  colour: String(stage.colour ?? "#0f766e"),
                  isTerminal: Boolean(stage.is_terminal),
                  gateType: String(stage.gate_type ?? "none"),
                  gateRequired: Boolean(stage.gate_required),
                  enteredAt: state?.entered_at ?? null,
                }
              : null;
          })(),
          assignments: jobAssignments.map((assignment) => ({
            id: String(assignment.id),
            userId: String(assignment.user_id),
            scheduledStart: assignment.scheduled_start,
            scheduledEnd: assignment.scheduled_end,
            status: String(assignment.assignment_status ?? "scheduled"),
          })),
        };
      });

    const openJobs = mappedJobs.filter((job) => !CLOSED_JOB_STATUSES.has(norm(job.status)));
    const waitingParts = openJobs.filter((job) => WAITING_PARTS_STATUSES.has(norm(job.status))).length;
    const inProgress = openJobs.filter((job) =>
      ["in_progress", "working", "on_site", "travelling"].includes(norm(job.status)),
    ).length;
    const urgentJobs = openJobs.filter((job) =>
      ["urgent", "critical", "emergency", "high"].includes(norm(job.priority)),
    ).length;

    const scheduledHoursTotal = technicians.reduce(
      (sum, tech) => sum + tech.scheduledHours,
      0,
    );
    const capacityTotal = technicians.reduce(
      (sum, tech) => sum + tech.capacityHours,
      0,
    );

    const { data: completions, error: completionError } = await admin
      .from("job_completions")
      .select("job_id,status,submitted_at,approved_at")
      .eq("company_id", auth.companyId)
      .in("job_id", mappedJobs.map((job) => job.id));

    if (completionError) throw new Error(completionError.message);

    const readyForReview = (completions ?? []).filter(
      (row) => norm(row.status) === "submitted",
    ).length;

    const completedToday = (completions ?? []).filter((row) => {
      const completedAt = row.approved_at || row.submitted_at;
      return completedAt ? String(completedAt).slice(0, 10) === todayKey : false;
    }).length;

    return NextResponse.json(
      {
        date,
        settings,
        workflow: workflow
          ? {
              id: String(workflow.id),
              name: String(workflow.name),
              slug: String(workflow.slug),
              stages: workflowStages.map((stage) => ({
                id: String(stage.id),
                name: String(stage.name),
                slug: String(stage.slug),
                position: Number(stage.position ?? 0),
                statusMapping: String(stage.status_mapping ?? "open"),
                colour: String(stage.colour ?? "#0f766e"),
                isTerminal: Boolean(stage.is_terminal),
                gateType: String(stage.gate_type ?? "none"),
                gateRequired: Boolean(stage.gate_required),
              })),
            }
          : null,
        technicians,
        jobs: mappedJobs,
        stats: {
          openJobs: openJobs.length,
          urgentJobs,
          waitingParts,
          inProgress,
          readyForReview,
          completedToday,
          workshopLoadPercent:
            capacityTotal > 0
              ? Math.round((scheduledHoursTotal / capacityTotal) * 100)
              : 0,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Workshop Operations.",
      },
      { status: 500 },
    );
  }
}
