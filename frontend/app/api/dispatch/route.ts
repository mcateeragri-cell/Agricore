import { requireApiModule } from "@/lib/modules/api-access";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUserContext,
} from "@/lib/auth/require-permission";
import {
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { loadFieldOperationsSettings } from "@/lib/field-operations-settings";
function canManageDispatch(
  permissions: string[],
) {
  return (
    permissions.includes("jobs.assign") ||
    permissions.includes("jobs.edit") ||
    permissions.includes("calendar.manage")
  );
}

type AssignmentPayload = {
  jobId?: string;
  userId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  notes?: string;
};



export async function GET(
  request: NextRequest,
) {
  const moduleGate = await requireApiModule("dispatch");
  if (moduleGate) return moduleGate;

  try {
    const auth =
      await getAuthenticatedUserContext();

    if (!auth) {
      return NextResponse.json(
        {
          error: "Unauthorised",
        },
        {
          status: 401,
        },
      );
    }

    if (
      auth.role === "technician" ||
      auth.role === "apprentice"
    ) {
      return NextResponse.json(
        {
          error:
            "Dispatch is restricted to office and management roles.",
        },
        { status: 403 },
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const features = await loadFieldOperationsSettings(supabase, auth.companyId);

    const selectedDate =
      request.nextUrl.searchParams.get(
        "date",
      ) ?? getLocalDate();

    if (!isValidDateInput(selectedDate)) {
      return NextResponse.json(
        {
          error:
            "The selected date is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const nextDate = addDays(
      selectedDate,
      1,
    );

    const startOfDay = new Date(
      `${selectedDate}T00:00:00`,
    ).toISOString();

    const startOfNextDay = new Date(
      `${nextDate}T00:00:00`,
    ).toISOString();

    const [
      techniciansResult,
      jobsResult,
      assignmentsResult,
      technicianScopesResult,
      technicianAccessResult,
    ] = await Promise.all([
      supabase
        .from("company_member_profiles")
        .select(`
          user_id,
          full_name,
          job_title,
          calendar_colour,
          is_active
        `)
        .eq(
          "company_id",
          auth.companyId,
        )
        .eq("is_active", true)
        .order("full_name", {
          ascending: true,
        }),

      supabase
        .from("jobs")
        .select(`
          id,
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
        .eq(
          "company_id",
          auth.companyId,
        )
        .in("branch_id", auth.activeBranchId ? [auth.activeBranchId] : auth.accessibleOperationalBranchIds)
        .not(
          "status",
          "in",
          '("completed","cancelled")',
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("job_assignments")
        .select(`
          id,
          job_id,
          user_id,
          scheduled_start,
          scheduled_end,
          assignment_status,
          notes,
          created_by,
          created_at,
          updated_at,
          jobs (
            id,
            job_number,
            status,
            priority,
            engineer_name,
            fault_reported,
            opened_date,
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
          )
        `)
        .eq(
          "company_id",
          auth.companyId,
        )
        .in("branch_id", auth.activeBranchId ? [auth.activeBranchId] : auth.accessibleOperationalBranchIds)
        .gte(
          "scheduled_start",
          startOfDay,
        )
        .lt(
          "scheduled_start",
          startOfNextDay,
        )
        .order("scheduled_start", {
          ascending: true,
        }),

      supabase
        .from("company_member_branch_scopes")
        .select("user_id,home_branch_id,operations_scope")
        .eq("company_id", auth.companyId),

      supabase
        .from("company_member_branch_access")
        .select("user_id,branch_id")
        .eq("company_id", auth.companyId),
    ]);

    if (techniciansResult.error) {
      throw new Error(
        `Unable to load technicians: ${techniciansResult.error.message}`,
      );
    }

    if (jobsResult.error) {
      throw new Error(
        `Unable to load dispatch jobs: ${jobsResult.error.message}`,
      );
    }

    if (assignmentsResult.error) {
      throw new Error(
        `Unable to load assignments: ${assignmentsResult.error.message}`,
      );
    }
    if (technicianScopesResult.error) throw new Error(`Unable to load technician depot scopes: ${technicianScopesResult.error.message}`);
    if (technicianAccessResult.error) throw new Error(`Unable to load technician depot access: ${technicianAccessResult.error.message}`);

    const selectedDepotIds = new Set(auth.activeBranchId ? [auth.activeBranchId] : auth.accessibleOperationalBranchIds);
    const extraAccess = new Map<string, Set<string>>();
    for (const row of technicianAccessResult.data ?? []) {
      const key = String(row.user_id);
      const set = extraAccess.get(key) ?? new Set<string>();
      set.add(String(row.branch_id));
      extraAccess.set(key, set);
    }
    const visibleTechnicianIds = new Set<string>();
    for (const row of technicianScopesResult.data ?? []) {
      const userId = String(row.user_id);
      const scope = String(row.operations_scope ?? "branch");
      const home = row.home_branch_id ? String(row.home_branch_id) : "";
      if (scope === "company") { visibleTechnicianIds.add(userId); continue; }
      if (home && selectedDepotIds.has(home)) { visibleTechnicianIds.add(userId); continue; }
      if (scope === "selected" && [...(extraAccess.get(userId) ?? [])].some((id) => selectedDepotIds.has(id))) visibleTechnicianIds.add(userId);
    }
    const visibleTechnicians = (techniciansResult.data ?? []).filter((row) => visibleTechnicianIds.has(String(row.user_id)));

    const assignmentRows = assignmentsResult.data ?? [];
    const activeUserIds = Array.from(
      new Set(assignmentRows.map((assignment) => assignment.user_id)),
    );

    const locationByUser = new Map<string, {
      jobId: string;
      latitude: number;
      longitude: number;
      capturedAt: string;
      phase: "travel_start" | "arrival";
    }>();

    if (features.dispatchLocationEnabled && activeUserIds.length > 0) {
      const { data: travelRows, error: travelError } = await supabase
        .from("job_travel_sessions")
        .select(`
          job_id,
          technician_user_id,
          started_at,
          arrived_at,
          start_latitude,
          start_longitude,
          end_latitude,
          end_longitude
        `)
        .eq("company_id", auth.companyId)
        .in("technician_user_id", activeUserIds)
        .gte("started_at", startOfDay)
        .order("started_at", { ascending: false });

      if (travelError) {
        throw new Error(`Unable to load technician locations: ${travelError.message}`);
      }

      for (const row of travelRows ?? []) {
        if (locationByUser.has(row.technician_user_id)) continue;

        const hasArrival =
          row.end_latitude !== null && row.end_longitude !== null;
        const latitude = hasArrival ? row.end_latitude : row.start_latitude;
        const longitude = hasArrival ? row.end_longitude : row.start_longitude;
        const capturedAt = hasArrival ? row.arrived_at : row.started_at;

        if (latitude === null || longitude === null || !capturedAt) continue;

        locationByUser.set(row.technician_user_id, {
          jobId: row.job_id,
          latitude: Number(latitude),
          longitude: Number(longitude),
          capturedAt,
          phase: hasArrival ? "arrival" : "travel_start",
        });
      }
    }

    const assignmentsWithLocation = assignmentRows.map((assignment) => ({
      ...assignment,
      last_location: locationByUser.get(assignment.user_id) ?? null,
    }));

    return NextResponse.json(
      {
        date: selectedDate,
        technicians:
          visibleTechnicians,
        jobs: jobsResult.data ?? [],
        assignments:
          assignmentsWithLocation,
        fieldOperations: features,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error(
      "Unable to load dispatch data:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load dispatch data.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const moduleGate = await requireApiModule("dispatch");
  if (moduleGate) return moduleGate;

  try {
    const auth =
      await getAuthenticatedUserContext();

    if (!auth) {
      return NextResponse.json(
        {
          error: "Unauthorised",
        },
        {
          status: 401,
        },
      );
    }

    if (
      !canManageDispatch(
        auth.permissions,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to schedule jobs.",
        },
        {
          status: 403,
        },
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const body =
      (await request.json()) as
        AssignmentPayload;

    const jobId =
      body.jobId?.trim() ?? "";

    const userId =
      body.userId?.trim() ?? "";

    const scheduledStart =
      body.scheduledStart?.trim() ?? "";

    const scheduledEnd =
      body.scheduledEnd?.trim() ?? "";

    const notes =
      body.notes?.trim() || null;

    if (!jobId) {
      return NextResponse.json(
        {
          error: "Select a job.",
        },
        {
          status: 400,
        },
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          error: "Select a technician.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !scheduledStart ||
      !scheduledEnd
    ) {
      return NextResponse.json(
        {
          error:
            "Enter the scheduled start and finish times.",
        },
        {
          status: 400,
        },
      );
    }

    const startDate = new Date(
      scheduledStart,
    );

    const endDate = new Date(
      scheduledEnd,
    );

    if (
      Number.isNaN(
        startDate.getTime(),
      ) ||
      Number.isNaN(
        endDate.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid schedule.",
        },
        {
          status: 400,
        },
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          error:
            "The scheduled finish must be after the start.",
        },
        {
          status: 400,
        },
      );
    }

    const [
      technicianResult,
      jobResult,
      existingAssignmentResult,
    ] = await Promise.all([
      supabase
        .from(
          "company_member_profiles",
        )
        .select(`
          user_id,
          full_name,
          is_active
        `)
        .eq(
          "company_id",
          auth.companyId,
        )
        .eq("user_id", userId)
        .maybeSingle(),

      supabase
        .from("jobs")
        .select(`
          id,
          job_number
        `)
        .eq("id", jobId)
        .eq(
          "company_id",
          auth.companyId,
        )
        .maybeSingle(),

      supabase
        .from(
          "job_assignments",
        )
        .select(`
          id,
          job_id
        `)
        .eq("job_id", jobId)
        .eq(
          "company_id",
          auth.companyId,
        )
        .neq(
          "assignment_status",
          "cancelled",
        )
        .limit(1)
        .maybeSingle(),
    ]);

    if (
      technicianResult.error
    ) {
      throw new Error(
        technicianResult.error.message,
      );
    }

    if (
      !technicianResult.data ||
      technicianResult.data
        .is_active !== true
    ) {
      return NextResponse.json(
        {
          error:
            "The selected technician is unavailable in the active company.",
        },
        {
          status: 400,
        },
      );
    }

    if (jobResult.error) {
      throw new Error(
        jobResult.error.message,
      );
    }

    if (!jobResult.data) {
      return NextResponse.json(
        {
          error:
            "The selected job could not be found in the active company.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      existingAssignmentResult.error
    ) {
      throw new Error(
        existingAssignmentResult
          .error.message,
      );
    }

    const now =
      new Date().toISOString();

    let assignmentId: string;
    let message: string;

    if (
      existingAssignmentResult.data
    ) {
      const {
        data,
        error,
      } = await supabase
        .from(
          "job_assignments",
        )
        .update({
          user_id: userId,
          scheduled_start:
            startDate.toISOString(),
          scheduled_end:
            endDate.toISOString(),
          assignment_status:
            "scheduled",
          notes,
          updated_at: now,
        })
        .eq(
          "id",
          existingAssignmentResult
            .data.id,
        )
        .eq(
          "company_id",
          auth.companyId,
        )
        .select("id")
        .single();

      if (error) {
        throw new Error(
          error.message,
        );
      }

      assignmentId = data.id;
      message =
        "Job assignment updated.";
    } else {
      const {
        data,
        error,
      } = await supabase
        .from(
          "job_assignments",
        )
        .insert({
          company_id:
            auth.companyId,
          job_id: jobId,
          user_id: userId,
          scheduled_start:
            startDate.toISOString(),
          scheduled_end:
            endDate.toISOString(),
          assignment_status:
            "scheduled",
          notes,
          created_by:
            auth.userId,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(
          error.message,
        );
      }

      assignmentId = data.id;
      message =
        "Job scheduled successfully.";
    }

    const {
      error: jobUpdateError,
    } = await supabase
      .from("jobs")
      .update({
        engineer_name:
          technicianResult.data
            .full_name,
        updated_at: now,
      })
      .eq("id", jobId)
      .eq(
        "company_id",
        auth.companyId,
      );

    if (jobUpdateError) {
      console.error(
        "Assignment saved but job engineer could not be updated:",
        jobUpdateError,
      );

      return NextResponse.json(
        {
          success: true,
          assignmentId,
          message:
            `${message} The job was scheduled, but the engineer name on the office job card could not be updated.`,
        },
        {
          status: 200,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        assignmentId,
        message,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error(
      "Unable to schedule job:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to schedule job.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  const moduleGate = await requireApiModule("dispatch");
  if (moduleGate) return moduleGate;

  try {
    const auth =
      await getAuthenticatedUserContext();

    if (!auth) {
      return NextResponse.json(
        {
          error: "Unauthorised",
        },
        {
          status: 401,
        },
      );
    }

    if (
      !canManageDispatch(
        auth.permissions,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to remove scheduled jobs.",
        },
        {
          status: 403,
        },
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const assignmentId =
      request.nextUrl.searchParams
        .get("assignmentId")
        ?.trim() ?? "";

    if (!assignmentId) {
      return NextResponse.json(
        {
          error:
            "Assignment ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: assignment,
      error: loadError,
    } = await supabase
      .from("job_assignments")
      .select(`
        id,
        job_id
      `)
      .eq("id", assignmentId)
      .eq(
        "company_id",
        auth.companyId,
      )
      .maybeSingle();

    if (loadError) {
      throw new Error(
        loadError.message,
      );
    }

    if (!assignment) {
      return NextResponse.json(
        {
          error:
            "The assignment could not be found in the active company.",
        },
        {
          status: 404,
        },
      );
    }

    const {
      error: deleteError,
    } = await supabase
      .from("job_assignments")
      .delete()
      .eq("id", assignmentId)
      .eq(
        "company_id",
        auth.companyId,
      );

    if (deleteError) {
      throw new Error(
        deleteError.message,
      );
    }

    const {
      error: jobUpdateError,
    } = await supabase
      .from("jobs")
      .update({
        engineer_name: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", assignment.job_id)
      .eq(
        "company_id",
        auth.companyId,
      );

    if (jobUpdateError) {
      console.error(
        "Assignment removed but job engineer could not be cleared:",
        jobUpdateError,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Job removed from the schedule.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error(
      "Unable to remove assignment:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove assignment.",
      },
      {
        status: 500,
      },
    );
  }
}

function getLocalDate() {
  const date = new Date();

  const offset =
    date.getTimezoneOffset();

  return new Date(
    date.getTime() -
      offset * 60_000,
  )
    .toISOString()
    .slice(0, 10);
}

function addDays(
  dateValue: string,
  days: number,
) {
  const date = new Date(
    `${dateValue}T12:00:00`,
  );

  date.setDate(
    date.getDate() + days,
  );

  return getDateInputValue(
    date,
  );
}

function getDateInputValue(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDateInput(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}