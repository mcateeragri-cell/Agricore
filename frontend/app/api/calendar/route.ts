import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  CalendarCustomer,
  CalendarJob,
  CalendarJobAssignment,
  CalendarMachine,
  CalendarResponse,
  CalendarTechnician,
  StaffCalendarEvent,
} from "@/types/calendar";

export const dynamic = "force-dynamic";

type DatabaseRow = Record<string, unknown>;

// Deliberately kept untyped here because Supabase 2.110 generates
// incompatible generic signatures when no generated Database type exists.
type AdminSupabaseClient = SupabaseClient;

const ACTIVE_COMPANY_COOKIE = "agricore_company_id";

const TECHNICIAN_COLOURS = [
  "#166534",
  "#0369a1",
  "#7c3aed",
  "#b45309",
  "#be123c",
  "#0f766e",
  "#4338ca",
  "#a16207",
];

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Calendar API configuration is missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to view the calendar.",
        },
        { status: 401 },
      );
    }

    const adminClient: AdminSupabaseClient =
      createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Your session has expired. Please sign in again.",
        },
        { status: 401 },
      );
    }

    const companyId = await resolveCompanyId(
      adminClient,
      user.id,
      request,
    );

    if (!companyId) {
      return NextResponse.json(
        {
          error:
            "No active company is available for this account.",
        },
        { status: 403 },
      );
    }

    const requestUrl = new URL(request.url);

    const startValue =
      requestUrl.searchParams.get("start");

    const endValue =
      requestUrl.searchParams.get("end");

    if (!startValue || !endValue) {
      return NextResponse.json(
        {
          error:
            "A calendar start and end date are required.",
        },
        { status: 400 },
      );
    }

    const rangeStart = new Date(startValue);
    const rangeEnd = new Date(endValue);

    if (
      Number.isNaN(rangeStart.getTime()) ||
      Number.isNaN(rangeEnd.getTime())
    ) {
      return NextResponse.json(
        {
          error:
            "The requested calendar date range is invalid.",
        },
        { status: 400 },
      );
    }

    if (rangeEnd <= rangeStart) {
      return NextResponse.json(
        {
          error:
            "The calendar end date must be after the start date.",
        },
        { status: 400 },
      );
    }

    const [
      profilesResult,
      rolesResult,
      assignmentsResult,
      eventsResult,
    ] = await Promise.all([
      adminClient
        .from("app_user_profiles")
        .select("*"),

      adminClient
        .from("app_user_roles")
        .select("*"),

      adminClient
        .from("job_assignments")
        .select("*")
        .eq("company_id", companyId)
        .lt(
          "scheduled_start",
          rangeEnd.toISOString(),
        )
        .gt(
          "scheduled_end",
          rangeStart.toISOString(),
        )
        .neq(
          "assignment_status",
          "cancelled",
        )
        .order("scheduled_start", {
          ascending: true,
        }),

      adminClient
        .from("staff_calendar_events")
        .select("*")
        .eq("company_id", companyId)
        .lt("starts_at", rangeEnd.toISOString())
        .gt("ends_at", rangeStart.toISOString())
        .order("starts_at", {
          ascending: true,
        }),
    ]);

    if (profilesResult.error) {
      throw new Error(
        `Unable to load staff profiles: ${profilesResult.error.message}`,
      );
    }

    if (rolesResult.error) {
      throw new Error(
        `Unable to load staff roles: ${rolesResult.error.message}`,
      );
    }

    if (assignmentsResult.error) {
      throw new Error(
        `Unable to load job assignments: ${assignmentsResult.error.message}`,
      );
    }

    if (eventsResult.error) {
      throw new Error(
        `Unable to load staff events: ${eventsResult.error.message}`,
      );
    }

    const profileRows = toRows(
      profilesResult.data,
    );

    const roleRows = toRows(
      rolesResult.data,
    );

    const assignmentRows = toRows(
      assignmentsResult.data,
    );

    const eventRows = toRows(
      eventsResult.data,
    );

    const rolesByUserId =
      buildRolesByUserId(roleRows);

    const referencedUserIds =
      collectReferencedUserIds(
        assignmentRows,
        eventRows,
      );

    const technicians =
      buildTechnicians(
        profileRows,
        rolesByUserId,
        referencedUserIds,
      );

    const missingUserIds = Array.from(
      referencedUserIds,
    ).filter(
      (userId) =>
        !technicians.some(
          (technician) =>
            technician.id === userId,
        ),
    );

    if (missingUserIds.length > 0) {
      const fallbackTechnicians =
        await loadAuthenticationUsers(
          adminClient,
          missingUserIds,
        );

      technicians.push(
        ...fallbackTechnicians,
      );

      technicians.sort((first, second) =>
        first.fullName.localeCompare(
          second.fullName,
        ),
      );
    }

    const assignments = assignmentRows
      .map(normaliseAssignment)
      .filter(
        (
          assignment,
        ): assignment is CalendarJobAssignment =>
          assignment !== null,
      );

    const events = eventRows
      .map(normaliseStaffEvent)
      .filter(
        (
          staffEvent,
        ): staffEvent is StaffCalendarEvent =>
          staffEvent !== null,
      );

    const assignedJobIds = uniqueStrings(
      assignments.map(
        (assignment) => assignment.jobId,
      ),
    );

    const jobs = await loadCalendarJobs(
      adminClient,
      assignedJobIds,
      companyId,
    );

    const customerIds = uniqueStrings(
      jobs
        .map((job) => job.customerId)
        .filter(
          (customerId): customerId is string =>
            Boolean(customerId),
        ),
    );

    const machineIds = uniqueStrings(
      jobs
        .map((job) => job.machineId)
        .filter(
          (machineId): machineId is string =>
            Boolean(machineId),
        ),
    );

    const [customers, machines] =
      await Promise.all([
        loadCustomers(
          adminClient,
          customerIds,
          companyId,
        ),
        loadMachines(
          adminClient,
          machineIds,
          companyId,
        ),
      ]);

    const response: CalendarResponse = {
      technicians,
      assignments,
      events,
      jobs,
      customers,
      machines,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error(
      "Calendar API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load the calendar.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Calendar API configuration is missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to schedule work.",
        },
        { status: 401 },
      );
    }

    const adminClient: AdminSupabaseClient =
      createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Your session has expired. Please sign in again.",
        },
        { status: 401 },
      );
    }

    const companyId = await resolveCompanyId(
      adminClient,
      user.id,
      request,
    );

    if (!companyId) {
      return NextResponse.json(
        {
          error:
            "No active company is available for this account.",
        },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null
    ) {
      return NextResponse.json(
        { error: "Invalid scheduling request." },
        { status: 400 },
      );
    }

    const requestBody = body as Record<
      string,
      unknown
    >;

    const jobId = readBodyString(
      requestBody,
      "jobId",
    );

    const userId = readBodyString(
      requestBody,
      "userId",
    );

    const scheduledStartValue =
      readBodyString(
        requestBody,
        "scheduledStart",
      );

    const scheduledEndValue =
      readBodyString(
        requestBody,
        "scheduledEnd",
      );

    const notes = readBodyString(
      requestBody,
      "notes",
    );

    if (
      !jobId ||
      !userId ||
      !scheduledStartValue ||
      !scheduledEndValue
    ) {
      return NextResponse.json(
        {
          error:
            "Job, technician, start time and finish time are required.",
        },
        { status: 400 },
      );
    }

    const scheduledStart = new Date(
      scheduledStartValue,
    );

    const scheduledEnd = new Date(
      scheduledEndValue,
    );

    if (
      Number.isNaN(scheduledStart.getTime()) ||
      Number.isNaN(scheduledEnd.getTime())
    ) {
      return NextResponse.json(
        {
          error:
            "The selected start or finish time is invalid.",
        },
        { status: 400 },
      );
    }

    if (scheduledEnd <= scheduledStart) {
      return NextResponse.json(
        {
          error:
            "The finish time must be after the start time.",
        },
        { status: 400 },
      );
    }

    const durationHours =
      (scheduledEnd.getTime() -
        scheduledStart.getTime()) /
      3_600_000;

    if (durationHours > 168) {
      return NextResponse.json(
        {
          error:
            "A single assignment cannot be longer than seven days.",
        },
        { status: 400 },
      );
    }

    const [jobResult, profileResult] =
      await Promise.all([
        adminClient
          .from("jobs")
          .select("id, status, company_id")
          .eq("id", jobId)
          .eq("company_id", companyId)
          .maybeSingle(),
        adminClient
  .from("app_user_profiles")
  .select("*")
  .eq("user_id", userId)
  .maybeSingle(),
      ]);

    if (jobResult.error) {
      throw new Error(
        `Unable to check the job: ${jobResult.error.message}`,
      );
    }

    if (!jobResult.data) {
      return NextResponse.json(
        { error: "The selected job no longer exists." },
        { status: 404 },
      );
    }

    if (profileResult.error) {
      throw new Error(
        `Unable to check the technician: ${profileResult.error.message}`,
      );
    }

    if (!profileResult.data) {
      return NextResponse.json(
        {
          error:
            "The selected technician could not be found.",
        },
        { status: 404 },
      );
    }

    const {
      data: technicianMembership,
      error: technicianMembershipError,
    } = await adminClient
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (technicianMembershipError) {
      throw new Error(
        `Unable to verify the technician company membership: ${technicianMembershipError.message}`,
      );
    }

    if (!technicianMembership) {
      return NextResponse.json(
        {
          error:
            "The selected technician does not belong to the active company.",
        },
        { status: 409 },
      );
    }

    const profileRow =
      profileResult.data as DatabaseRow;

    const technicianIsActive = readBoolean(
      profileRow,
      ["is_active", "active", "enabled"],
      true,
    );

    if (!technicianIsActive) {
      return NextResponse.json(
        {
          error:
            "The selected technician is not active.",
        },
        { status: 409 },
      );
    }

    const [assignmentClashResult, eventClashResult] =
      await Promise.all([
        adminClient
          .from("job_assignments")
          .select("id")
          .eq("company_id", companyId)
          .eq("user_id", userId)
          .neq("assignment_status", "cancelled")
          .lt(
            "scheduled_start",
            scheduledEnd.toISOString(),
          )
          .gt(
            "scheduled_end",
            scheduledStart.toISOString(),
          )
          .limit(1),
        adminClient
          .from("staff_calendar_events")
          .select("id, title")
          .eq("company_id", companyId)
          .eq("user_id", userId)
          .lt(
            "starts_at",
            scheduledEnd.toISOString(),
          )
          .gt(
            "ends_at",
            scheduledStart.toISOString(),
          )
          .limit(1),
      ]);

    if (assignmentClashResult.error) {
      throw new Error(
        `Unable to check existing assignments: ${assignmentClashResult.error.message}`,
      );
    }

    if (eventClashResult.error) {
      throw new Error(
        `Unable to check technician availability: ${eventClashResult.error.message}`,
      );
    }

    if (
      Array.isArray(assignmentClashResult.data) &&
      assignmentClashResult.data.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "This technician already has work scheduled during the selected time.",
        },
        { status: 409 },
      );
    }

    if (
      Array.isArray(eventClashResult.data) &&
      eventClashResult.data.length > 0
    ) {
      const eventTitle =
        typeof eventClashResult.data[0]
          ?.title === "string"
          ? eventClashResult.data[0].title
          : "an unavailable period";

      return NextResponse.json(
        {
          error: `This technician is unavailable because of ${eventTitle}.`,
        },
        { status: 409 },
      );
    }

    const { data: insertedRow, error: insertError } =
      await adminClient
        .from("job_assignments")
        .insert({
          company_id: companyId,
          job_id: jobId,
          user_id: userId,
          scheduled_start:
            scheduledStart.toISOString(),
          scheduled_end:
            scheduledEnd.toISOString(),
          assignment_status: "scheduled",
          notes: notes || null,
          created_by: user.id,
        })
        .select("*")
        .single();

    if (insertError) {
      throw new Error(
        `Unable to schedule the job: ${insertError.message}`,
      );
    }

    const assignment = normaliseAssignment(
      insertedRow as DatabaseRow,
    );

    if (!assignment) {
      throw new Error(
        "The assignment was saved but returned an invalid response.",
      );
    }

    const currentStatus = normaliseStatus(
      typeof jobResult.data.status === "string"
        ? jobResult.data.status
        : "open",
    );

    if (
      currentStatus === "open" ||
      currentStatus === "new" ||
      currentStatus === "booked"
    ) {
      const { error: updateJobError } =
        await adminClient
          .from("jobs")
          .update({
            status: "scheduled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId)
          .eq("company_id", companyId);

      if (updateJobError) {
        console.error(
          "Assignment saved but job status was not updated:",
          updateJobError,
        );
      }
    }

    return NextResponse.json(
      { assignment },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error(
      "Calendar scheduling API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to schedule the job.",
      },
      { status: 500 },
    );
  }
}


export async function PATCH(request: NextRequest) {
  try {
    const context = await createAuthenticatedAdminClient(
      request,
      "You must be signed in to update scheduled work.",
    );

    if (context instanceof NextResponse) {
      return context;
    }

    const { adminClient, companyId } = context;
    const body = await readRequestBody(request);

    if (body instanceof NextResponse) {
      return body;
    }

    const assignmentId = readBodyString(body, "assignmentId");
    const userId = readBodyString(body, "userId");
    const scheduledStartValue = readBodyString(body, "scheduledStart");
    const scheduledEndValue = readBodyString(body, "scheduledEnd");
    const assignmentStatus =
      normaliseStatus(readBodyString(body, "assignmentStatus") || "scheduled");
    const notes = readBodyString(body, "notes");

    if (
      !assignmentId ||
      !userId ||
      !scheduledStartValue ||
      !scheduledEndValue
    ) {
      return NextResponse.json(
        {
          error:
            "Assignment, technician, start time and finish time are required.",
        },
        { status: 400 },
      );
    }

    const allowedStatuses = new Set([
      "scheduled",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ]);

    if (!allowedStatuses.has(assignmentStatus)) {
      return NextResponse.json(
        { error: "The selected assignment status is invalid." },
        { status: 400 },
      );
    }

    const scheduledStart = new Date(scheduledStartValue);
    const scheduledEnd = new Date(scheduledEndValue);

    const dateValidationError = validateAssignmentDates(
      scheduledStart,
      scheduledEnd,
    );

    if (dateValidationError) {
      return NextResponse.json(
        { error: dateValidationError },
        { status: 400 },
      );
    }

    const [assignmentResult, profileResult] = await Promise.all([
      adminClient
        .from("job_assignments")
        .select("*")
        .eq("id", assignmentId)
        .eq("company_id", companyId)
        .maybeSingle(),
      adminClient
        .from("app_user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (assignmentResult.error) {
      throw new Error(
        `Unable to load the assignment: ${assignmentResult.error.message}`,
      );
    }

    if (!assignmentResult.data) {
      return NextResponse.json(
        { error: "The selected assignment no longer exists." },
        { status: 404 },
      );
    }

    if (profileResult.error) {
      throw new Error(
        `Unable to check the technician: ${profileResult.error.message}`,
      );
    }

    if (!profileResult.data) {
      return NextResponse.json(
        { error: "The selected technician could not be found." },
        { status: 404 },
      );
    }

    const profileRow = profileResult.data as DatabaseRow;
    const technicianIsActive = readBoolean(
      profileRow,
      ["is_active", "active", "enabled"],
      true,
    );

    if (!technicianIsActive) {
      return NextResponse.json(
        { error: "The selected technician is not active." },
        { status: 409 },
      );
    }

    if (assignmentStatus !== "cancelled") {
      const clashError = await findSchedulingClash(
        adminClient,
        userId,
        scheduledStart,
        scheduledEnd,
        companyId,
        assignmentId,
      );

      if (clashError) {
        return NextResponse.json(
          { error: clashError },
          { status: 409 },
        );
      }
    }

    const { data: updatedRow, error: updateError } =
      await adminClient
        .from("job_assignments")
        .update({
          user_id: userId,
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          assignment_status: assignmentStatus,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignmentId)
        .eq("company_id", companyId)
        .select("*")
        .single();

    if (updateError) {
      throw new Error(
        `Unable to update the assignment: ${updateError.message}`,
      );
    }

    const assignment = normaliseAssignment(updatedRow as DatabaseRow);

    if (!assignment) {
      throw new Error(
        "The assignment was updated but returned an invalid response.",
      );
    }

    return NextResponse.json({ assignment });
  } catch (error: unknown) {
    console.error("Calendar update API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update the assignment.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await createAuthenticatedAdminClient(
      request,
      "You must be signed in to remove scheduled work.",
    );

    if (context instanceof NextResponse) {
      return context;
    }

    const { adminClient, companyId } = context;
    const body = await readRequestBody(request);

    if (body instanceof NextResponse) {
      return body;
    }

    const assignmentId = readBodyString(body, "assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "An assignment is required." },
        { status: 400 },
      );
    }

    const { data: existingAssignment, error: loadError } =
      await adminClient
        .from("job_assignments")
        .select("id, job_id")
        .eq("id", assignmentId)
        .eq("company_id", companyId)
        .maybeSingle();

    if (loadError) {
      throw new Error(
        `Unable to load the assignment: ${loadError.message}`,
      );
    }

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "The selected assignment no longer exists." },
        { status: 404 },
      );
    }

    const jobId =
      typeof existingAssignment.job_id === "string"
        ? existingAssignment.job_id
        : "";

    const { error: deleteError } =
      await adminClient
        .from("job_assignments")
        .delete()
        .eq("id", assignmentId)
        .eq("company_id", companyId);

    if (deleteError) {
      throw new Error(
        `Unable to remove the assignment: ${deleteError.message}`,
      );
    }

    if (jobId) {
      const { data: remainingAssignments, error: remainingError } =
        await adminClient
          .from("job_assignments")
          .select("id")
          .eq("company_id", companyId)
          .eq("job_id", jobId)
          .neq("assignment_status", "cancelled")
          .limit(1);

      if (remainingError) {
        console.error(
          "Assignment removed but remaining assignments could not be checked:",
          remainingError,
        );
      } else if (
        Array.isArray(remainingAssignments) &&
        remainingAssignments.length === 0
      ) {
        const { data: jobRow, error: jobLoadError } =
          await adminClient
            .from("jobs")
            .select("status")
            .eq("id", jobId)
            .eq("company_id", companyId)
            .maybeSingle();

        if (!jobLoadError && jobRow) {
          const currentStatus = normaliseStatus(
            typeof jobRow.status === "string" ? jobRow.status : "",
          );

          if (
            currentStatus === "scheduled" ||
            currentStatus === "booked"
          ) {
            const { error: jobUpdateError } =
              await adminClient
                .from("jobs")
                .update({
                  status: "open",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", jobId)
                .eq("company_id", companyId);

            if (jobUpdateError) {
              console.error(
                "Assignment removed but job status was not reset:",
                jobUpdateError,
              );
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      assignmentId,
    });
  } catch (error: unknown) {
    console.error("Calendar delete API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove the assignment.",
      },
      { status: 500 },
    );
  }
}

async function createAuthenticatedAdminClient(
  request: NextRequest,
  unauthorisedMessage: string,
): Promise<
  | {
      adminClient: AdminSupabaseClient;
      userId: string;
      companyId: string;
    }
  | NextResponse
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Calendar API configuration is missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: unauthorisedMessage },
      { status: 401 },
    );
  }

  const adminClient: AdminSupabaseClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const companyId = await resolveCompanyId(
    adminClient,
    user.id,
    request,
  );

  if (!companyId) {
    return NextResponse.json(
      {
        error:
          "No active company is available for this account.",
      },
      { status: 403 },
    );
  }

  return {
    adminClient,
    userId: user.id,
    companyId,
  };
}

async function resolveCompanyId(
  adminClient: AdminSupabaseClient,
  userId: string,
  request: NextRequest,
): Promise<string | null> {
  const requestedCompanyId =
    request.cookies
      .get(ACTIVE_COMPANY_COOKIE)
      ?.value?.trim() ?? "";

  let membershipQuery = adminClient
    .from("company_members")
    .select("company_id, joined_at")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (requestedCompanyId) {
    const {
      data: requestedMembership,
      error: requestedMembershipError,
    } = await membershipQuery
      .eq("company_id", requestedCompanyId)
      .maybeSingle();

    if (requestedMembershipError) {
      throw new Error(
        `Unable to resolve the active company: ${requestedMembershipError.message}`,
      );
    }

    if (
      requestedMembership &&
      typeof requestedMembership.company_id ===
        "string"
    ) {
      return requestedMembership.company_id;
    }
  }

  const {
    data: memberships,
    error: membershipsError,
  } = await adminClient
    .from("company_members")
    .select("company_id, joined_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("joined_at", {
      ascending: true,
    })
    .limit(1);

  if (membershipsError) {
    throw new Error(
      `Unable to resolve the active company: ${membershipsError.message}`,
    );
  }

  const firstMembership =
    Array.isArray(memberships)
      ? memberships[0]
      : null;

  return firstMembership &&
    typeof firstMembership.company_id ===
      "string"
    ? firstMembership.company_id
    : null;
}

async function readRequestBody(
  request: NextRequest,
): Promise<Record<string, unknown> | NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The request body is invalid." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "The request body is invalid." },
      { status: 400 },
    );
  }

  return body as Record<string, unknown>;
}

function validateAssignmentDates(
  scheduledStart: Date,
  scheduledEnd: Date,
): string | null {
  if (
    Number.isNaN(scheduledStart.getTime()) ||
    Number.isNaN(scheduledEnd.getTime())
  ) {
    return "The selected start or finish time is invalid.";
  }

  if (scheduledEnd <= scheduledStart) {
    return "The finish time must be after the start time.";
  }

  const durationHours =
    (scheduledEnd.getTime() - scheduledStart.getTime()) / 3_600_000;

  if (durationHours > 168) {
    return "A single assignment cannot be longer than seven days.";
  }

  return null;
}

async function findSchedulingClash(
  adminClient: AdminSupabaseClient,
  userId: string,
  scheduledStart: Date,
  scheduledEnd: Date,
  companyId: string,
  excludedAssignmentId?: string,
): Promise<string | null> {
  let assignmentQuery = adminClient
    .from("job_assignments")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .neq("assignment_status", "cancelled")
    .lt("scheduled_start", scheduledEnd.toISOString())
    .gt("scheduled_end", scheduledStart.toISOString());

  if (excludedAssignmentId) {
    assignmentQuery = assignmentQuery.neq("id", excludedAssignmentId);
  }

  const [assignmentClashResult, eventClashResult] = await Promise.all([
    assignmentQuery.limit(1),
    adminClient
      .from("staff_calendar_events")
      .select("id, title")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .lt("starts_at", scheduledEnd.toISOString())
      .gt("ends_at", scheduledStart.toISOString())
      .limit(1),
  ]);

  if (assignmentClashResult.error) {
    throw new Error(
      `Unable to check existing assignments: ${assignmentClashResult.error.message}`,
    );
  }

  if (eventClashResult.error) {
    throw new Error(
      `Unable to check technician availability: ${eventClashResult.error.message}`,
    );
  }

  if (
    Array.isArray(assignmentClashResult.data) &&
    assignmentClashResult.data.length > 0
  ) {
    return "This technician already has work scheduled during the selected time.";
  }

  if (
    Array.isArray(eventClashResult.data) &&
    eventClashResult.data.length > 0
  ) {
    const eventTitle =
      typeof eventClashResult.data[0]?.title === "string"
        ? eventClashResult.data[0].title
        : "an unavailable period";

    return `This technician is unavailable because of ${eventTitle}.`;
  }

  return null;
}

function readBodyString(
  body: Record<string, unknown>,
  key: string,
): string {
  const value = body[key];

  return typeof value === "string"
    ? value.trim()
    : "";
}

function normaliseStatus(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getBearerToken(
  request: NextRequest,
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] =
    authorization.split(" ");

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

function toRows(
  value: unknown,
): DatabaseRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is DatabaseRow =>
      typeof item === "object" &&
      item !== null,
  );
}

function buildRolesByUserId(
  roleRows: DatabaseRow[],
) {
  const rolesByUserId =
    new Map<string, string>();

  for (const row of roleRows) {
    const userId = readString(row, [
      "user_id",
      "id",
    ]);

    const role = readString(row, [
      "role",
      "role_name",
      "name",
    ]);

    if (userId && role) {
      rolesByUserId.set(userId, role);
    }
  }

  return rolesByUserId;
}

function collectReferencedUserIds(
  assignmentRows: DatabaseRow[],
  eventRows: DatabaseRow[],
) {
  const userIds = new Set<string>();

  for (const row of assignmentRows) {
    const userId = readString(row, [
      "user_id",
    ]);

    if (userId) {
      userIds.add(userId);
    }
  }

  for (const row of eventRows) {
    const userId = readString(row, [
      "user_id",
    ]);

    if (userId) {
      userIds.add(userId);
    }
  }

  return userIds;
}

function buildTechnicians(
  profileRows: DatabaseRow[],
  rolesByUserId: Map<string, string>,
  referencedUserIds: Set<string>,
): CalendarTechnician[] {
  const schedulableRoles = new Set([
    "administrator",
    "admin",
    "service_manager",
    "workshop_manager",
    "technician",
    "engineer",
    "mechanic",
    "apprentice",
  ]);

  return profileRows
    .map(
      (
        row,
        index,
      ): CalendarTechnician | null => {
        const id = readString(row, [
          "user_id",
          "id",
        ]);

        if (!id) {
          return null;
        }

        const role =
          rolesByUserId.get(id) ?? null;

        const fullName =
          readString(row, [
            "full_name",
            "display_name",
            "name",
          ]) || "Unnamed technician";

        const email = readString(row, [
          "email",
        ]);

        const isActive = readBoolean(
          row,
          [
            "is_active",
            "active",
            "enabled",
          ],
          true,
        );

        const calendarColour =
          readString(row, [
            "calendar_colour",
            "calendar_color",
            "colour",
            "color",
          ]) ||
          TECHNICIAN_COLOURS[
            index %
              TECHNICIAN_COLOURS.length
          ];

        return {
          id,
          fullName,
          email,
          role,
          calendarColour,
          isActive,
        };
      },
    )
    .filter(
      (
        technician,
      ): technician is CalendarTechnician => {
        if (!technician) {
          return false;
        }

        if (!technician.isActive) {
          return false;
        }

        const normalisedRole =
          technician.role
            ?.trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_") ??
          null;

        return (
          normalisedRole === null ||
          schedulableRoles.has(
            normalisedRole,
          ) ||
          referencedUserIds.has(
            technician.id,
          )
        );
      },
    )
    .sort((first, second) =>
      first.fullName.localeCompare(
        second.fullName,
      ),
    );
}

async function loadAuthenticationUsers(
  adminClient: AdminSupabaseClient,
  requiredUserIds: string[],
): Promise<CalendarTechnician[]> {
  const requiredIds = new Set(
    requiredUserIds,
  );

  const technicians: CalendarTechnician[] =
    [];

  for (
    let pageNumber = 1;
    pageNumber <= 10;
    pageNumber += 1
  ) {
    const { data, error } =
      await adminClient.auth.admin.listUsers({
        page: pageNumber,
        perPage: 100,
      });

    if (error) {
      console.error(
        "Unable to load authentication users:",
        error,
      );

      break;
    }

    const users = Array.isArray(data?.users)
      ? data.users
      : [];

    for (const authUser of users) {
      if (
        !requiredIds.has(authUser.id)
      ) {
        continue;
      }

      const metadataName =
        typeof authUser.user_metadata
          ?.full_name === "string"
          ? authUser.user_metadata.full_name
          : "";

      technicians.push({
        id: authUser.id,
        fullName:
          metadataName ||
          authUser.email?.split("@")[0] ||
          "Unnamed technician",
        email: authUser.email ?? "",
        role: null,
        calendarColour:
          TECHNICIAN_COLOURS[
            technicians.length %
              TECHNICIAN_COLOURS.length
          ],
        isActive: true,
      });
    }

    if (users.length < 100) {
      break;
    }
  }

  return technicians;
}

async function loadCalendarJobs(
  adminClient: AdminSupabaseClient,
  assignedJobIds: string[],
  companyId: string,
): Promise<CalendarJob[]> {
  const { data, error } =
    await adminClient
      .from("jobs")
      .select("*")
      .eq("company_id", companyId)
      .order("job_sequence", {
        ascending: false,
      })
      .limit(250);

  if (error) {
    throw new Error(
      `Unable to load calendar jobs: ${error.message}`,
    );
  }

  const assignedIds = new Set(
    assignedJobIds,
  );

  const hiddenStatuses = new Set([
    "completed",
    "cancelled",
    "canceled",
    "invoiced",
    "closed",
  ]);

  return toRows(data)
    .map(normaliseJob)
    .filter(
      (job): job is CalendarJob => {
        if (!job) {
          return false;
        }

        return (
          assignedIds.has(job.id) ||
          !hiddenStatuses.has(
            normaliseStatus(job.status),
          )
        );
      },
    );
}

async function loadCustomers(
  adminClient: AdminSupabaseClient,
  customerIds: string[],
  companyId: string,
): Promise<CalendarCustomer[]> {
  if (customerIds.length === 0) {
    return [];
  }

  const { data, error } =
    await adminClient
      .from("customers")
      .select("*")
      .eq("company_id", companyId)
      .in("id", customerIds);

  if (error) {
    throw new Error(
      `Unable to load calendar customers: ${error.message}`,
    );
  }

  return toRows(data)
    .map(
      (
        row,
      ): CalendarCustomer | null => {
        const id = readString(row, [
          "id",
        ]);

        if (!id) {
          return null;
        }

        const businessName =
          readString(row, [
            "business_name",
            "company_name",
            "customer_name",
            "name",
          ]);

        const firstName = readString(
          row,
          [
            "first_name",
            "firstname",
          ],
        );

        const lastName = readString(
          row,
          [
            "last_name",
            "surname",
            "lastname",
          ],
        );

        const personalName = [
          firstName,
          lastName,
        ]
          .filter(Boolean)
          .join(" ");

        return {
          id,
          name:
            businessName ||
            personalName ||
            "Unnamed customer",
        };
      },
    )
    .filter(
      (
        customer,
      ): customer is CalendarCustomer =>
        customer !== null,
    );
}

async function loadMachines(
  adminClient: AdminSupabaseClient,
  machineIds: string[],
  companyId: string,
): Promise<CalendarMachine[]> {
  if (machineIds.length === 0) {
    return [];
  }

  const { data, error } =
    await adminClient
      .from("machines")
      .select("*")
      .eq("company_id", companyId)
      .in("id", machineIds);

  if (error) {
    throw new Error(
      `Unable to load calendar machines: ${error.message}`,
    );
  }

  return toRows(data)
    .map(
      (
        row,
      ): CalendarMachine | null => {
        const id = readString(row, [
          "id",
        ]);

        if (!id) {
          return null;
        }

        const manufacturer =
          readString(row, [
            "manufacturer",
            "make",
            "brand",
          ]);

        const model = readString(row, [
          "model",
          "model_name",
        ]);

        const registration =
          readString(row, [
            "registration",
            "registration_number",
            "reg_number",
            "reg",
          ]);

        const serialNumber =
          readString(row, [
            "serial_number",
            "serial",
            "vin",
          ]);

        const machineType =
          readString(row, [
            "machine_type",
            "type",
            "category",
          ]);

        const primaryName = [
          manufacturer,
          model,
        ]
          .filter(Boolean)
          .join(" ");

        const identifier =
          registration || serialNumber;

        const displayName = identifier
          ? `${
              primaryName ||
              machineType ||
              "Machine"
            } · ${identifier}`
          : primaryName ||
            machineType ||
            "Unnamed machine";

        return {
          id,
          displayName,
        };
      },
    )
    .filter(
      (
        machine,
      ): machine is CalendarMachine =>
        machine !== null,
    );
}

function normaliseAssignment(
  row: DatabaseRow,
): CalendarJobAssignment | null {
  const id = readString(row, ["id"]);

  const jobId = readString(row, [
    "job_id",
  ]);

  const userId = readString(row, [
    "user_id",
  ]);

  const scheduledStart = readString(
    row,
    ["scheduled_start"],
  );

  const scheduledEnd = readString(
    row,
    ["scheduled_end"],
  );

  if (
    !id ||
    !jobId ||
    !userId ||
    !scheduledStart ||
    !scheduledEnd
  ) {
    return null;
  }

  return {
    id,
    jobId,
    userId,
    scheduledStart,
    scheduledEnd,
    assignmentStatus:
      readString(row, [
        "assignment_status",
      ]) || "scheduled",
    notes: readString(row, ["notes"]),
  };
}

function normaliseStaffEvent(
  row: DatabaseRow,
): StaffCalendarEvent | null {
  const id = readString(row, ["id"]);

  const userId = readString(row, [
    "user_id",
  ]);

  const startsAt = readString(row, [
    "starts_at",
  ]);

  const endsAt = readString(row, [
    "ends_at",
  ]);

  if (
    !id ||
    !userId ||
    !startsAt ||
    !endsAt
  ) {
    return null;
  }

  return {
    id,
    userId,
    eventType:
      readString(row, ["event_type"]) ||
      "unavailable",
    title:
      readString(row, ["title"]) ||
      "Unavailable",
    startsAt,
    endsAt,
    allDay: readBoolean(
      row,
      ["all_day"],
      false,
    ),
    notes: readString(row, ["notes"]),
  };
}

function normaliseJob(
  row: DatabaseRow,
): CalendarJob | null {
  const id = readString(row, ["id"]);

  if (!id) {
    return null;
  }

  const jobSequence = readNumber(row, [
    "job_sequence",
  ]);

  const storedJobNumber =
    readString(row, ["job_number"]);

  const jobNumber =
    storedJobNumber ||
    (jobSequence !== null
      ? `JOB-${String(
          jobSequence,
        ).padStart(5, "0")}`
      : "Unnumbered job");

  return {
    id,
    jobNumber,
    jobSequence,
    customerId:
      readString(row, ["customer_id"]) ||
      null,
    machineId:
      readString(row, ["machine_id"]) ||
      null,
    status:
      readString(row, ["status"]) ||
      "open",
    priority:
      readString(row, ["priority"]) ||
      "normal",
    faultReported: readString(row, [
      "fault_reported",
      "description",
      "title",
    ]),
  };
}

function readString(
  row: DatabaseRow,
  keys: string[],
): string {
  for (const key of keys) {
    const value = row[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function readBoolean(
  row: DatabaseRow,
  keys: string[],
  fallback: boolean,
): boolean {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value !== 0;
    }

    if (typeof value === "string") {
      const normalisedValue =
        value.trim().toLowerCase();

      if (normalisedValue === "true") {
        return true;
      }

      if (normalisedValue === "false") {
        return false;
      }
    }
  }

  return fallback;
}

function readNumber(
  row: DatabaseRow,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = row[key];

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return null;
}

function uniqueStrings(
  values: string[],
): string[] {
  return Array.from(
    new Set(values.filter(Boolean)),
  );
}