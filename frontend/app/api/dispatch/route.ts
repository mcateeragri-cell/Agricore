import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type AssignmentPayload = {
  jobId?: string;
  userId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  notes?: string;
};

async function createSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Cookie writing may not be available
                // in every server context.
              }
            },
          );
        },
      },
    },
  );
}

async function getAuthenticatedUser() {
  const supabase = await createSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
    };
  }

  return {
    supabase,
    user,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } =
      await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorised",
        },
        {
          status: 401,
        },
      );
    }

    const selectedDate =
      request.nextUrl.searchParams.get("date") ??
      getLocalDate();

    if (!isValidDateInput(selectedDate)) {
      return NextResponse.json(
        {
          error: "The selected date is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const nextDate = addDays(selectedDate, 1);

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
    ] = await Promise.all([
      supabase
        .from("app_user_profiles")
        .select(`
          user_id,
          full_name,
          job_title,
          calendar_colour,
          is_active
        `)
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
        .gte("scheduled_start", startOfDay)
        .lt("scheduled_start", startOfNextDay)
        .order("scheduled_start", {
          ascending: true,
        }),
    ]);

    if (techniciansResult.error) {
      console.error(
        "Unable to load technicians:",
        techniciansResult.error,
      );

      throw new Error(
        techniciansResult.error.message,
      );
    }

    if (jobsResult.error) {
      console.error(
        "Unable to load dispatch jobs:",
        jobsResult.error,
      );

      throw new Error(jobsResult.error.message);
    }

    if (assignmentsResult.error) {
      console.error(
        "Unable to load assignments:",
        assignmentsResult.error,
      );

      throw new Error(
        assignmentsResult.error.message,
      );
    }

    return NextResponse.json({
      date: selectedDate,
      technicians: techniciansResult.data ?? [],
      jobs: jobsResult.data ?? [],
      assignments: assignmentsResult.data ?? [],
    });
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

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } =
      await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorised",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      (await request.json()) as AssignmentPayload;

    const jobId = body.jobId?.trim() ?? "";
    const userId = body.userId?.trim() ?? "";

    const scheduledStart =
      body.scheduledStart?.trim() ?? "";

    const scheduledEnd =
      body.scheduledEnd?.trim() ?? "";

    const notes = body.notes?.trim() || null;

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

    if (!scheduledStart || !scheduledEnd) {
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

    const startDate = new Date(scheduledStart);
    const endDate = new Date(scheduledEnd);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return NextResponse.json(
        {
          error: "Enter a valid schedule.",
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
        .from("app_user_profiles")
        .select(`
          user_id,
          full_name,
          is_active
        `)
        .eq("user_id", userId)
        .maybeSingle(),

      supabase
        .from("jobs")
        .select(`
          id,
          job_number
        `)
        .eq("id", jobId)
        .maybeSingle(),

      supabase
        .from("job_assignments")
        .select(`
          id,
          job_id
        `)
        .eq("job_id", jobId)
        .limit(1)
        .maybeSingle(),
    ]);

    if (technicianResult.error) {
      throw new Error(
        technicianResult.error.message,
      );
    }

    if (
      !technicianResult.data ||
      technicianResult.data.is_active !== true
    ) {
      return NextResponse.json(
        {
          error:
            "The selected technician is unavailable.",
        },
        {
          status: 400,
        },
      );
    }

    if (jobResult.error) {
      throw new Error(jobResult.error.message);
    }

    if (!jobResult.data) {
      return NextResponse.json(
        {
          error: "The selected job could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    if (existingAssignmentResult.error) {
      throw new Error(
        existingAssignmentResult.error.message,
      );
    }

    const now = new Date().toISOString();

    let assignmentId: string;
    let message: string;

    if (existingAssignmentResult.data) {
      const { data, error } = await supabase
        .from("job_assignments")
        .update({
          user_id: userId,
          scheduled_start: startDate.toISOString(),
          scheduled_end: endDate.toISOString(),
          assignment_status: "scheduled",
          notes,
          updated_at: now,
        })
        .eq(
          "id",
          existingAssignmentResult.data.id,
        )
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      assignmentId = data.id;
      message = "Job assignment updated.";
    } else {
      const { data, error } = await supabase
        .from("job_assignments")
        .insert({
          job_id: jobId,
          user_id: userId,
          scheduled_start: startDate.toISOString(),
          scheduled_end: endDate.toISOString(),
          assignment_status: "scheduled",
          notes,
          created_by: user.id,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      assignmentId = data.id;
      message = "Job scheduled successfully.";
    }

    const { error: jobUpdateError } =
      await supabase
        .from("jobs")
        .update({
          engineer_name:
            technicianResult.data.full_name,
          updated_at: now,
        })
        .eq("id", jobId);

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

    return NextResponse.json({
      success: true,
      assignmentId,
      message,
    });
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
  try {
    const { supabase, user } =
      await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorised",
        },
        {
          status: 401,
        },
      );
    }

    const assignmentId =
      request.nextUrl.searchParams
        .get("assignmentId")
        ?.trim() ?? "";

    if (!assignmentId) {
      return NextResponse.json(
        {
          error: "Assignment ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const { data: assignment, error: loadError } =
      await supabase
        .from("job_assignments")
        .select(`
          id,
          job_id
        `)
        .eq("id", assignmentId)
        .maybeSingle();

    if (loadError) {
      throw new Error(loadError.message);
    }

    if (!assignment) {
      return NextResponse.json(
        {
          error: "The assignment could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const { error: deleteError } = await supabase
      .from("job_assignments")
      .delete()
      .eq("id", assignmentId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { error: jobUpdateError } =
      await supabase
        .from("jobs")
        .update({
          engineer_name: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignment.job_id);

    if (jobUpdateError) {
      console.error(
        "Assignment removed but job engineer could not be cleared:",
        jobUpdateError,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Job removed from the schedule.",
    });
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
  const offset = date.getTimezoneOffset();

  return new Date(
    date.getTime() - offset * 60_000,
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

  date.setDate(date.getDate() + days);

  return getDateInputValue(date);
}

function getDateInputValue(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}