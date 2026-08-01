import { NextRequest, NextResponse } from "next/server";

import {
  getAuthenticatedUserContext,
} from "@/lib/auth/require-permission";
import {
  createSupabaseServerClient,
} from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TravelActionBody = {
  action?: unknown;
  direction?: unknown;

  startOdometerMiles?: unknown;
  endOdometerMiles?: unknown;
  confirmedDistanceMiles?: unknown;

  startLatitude?: unknown;
  startLongitude?: unknown;
  endLatitude?: unknown;
  endLongitude?: unknown;

  notes?: unknown;
};

type TravelAction = "start" | "arrive";

type TravelDirection =
  | "outbound"
  | "return"
  | "additional";

function cleanText(
  value: unknown,
  maximumLength = 2000,
) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function cleanNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : Number.NaN;
}

function asAction(
  value: unknown,
): TravelAction | null {
  return value === "start" ||
    value === "arrive"
    ? value
    : null;
}

function asDirection(
  value: unknown,
): TravelDirection {
  if (
    value === "return" ||
    value === "additional"
  ) {
    return value;
  }

  return "outbound";
}

function validLatitude(value: number | null) {
  return (
    value === null ||
    (value >= -90 && value <= 90)
  );
}

function validLongitude(value: number | null) {
  return (
    value === null ||
    (value >= -180 && value <= 180)
  );
}

function publicTravelSession<
  T extends Record<string, unknown>,
>(session: T) {
  /*
   * Deliberately remove all travel cost fields from
   * technician-facing responses.
   */
  const {
    mileage_charge: _mileageCharge,
    time_charge: _timeCharge,
    total_travel_charge: _totalTravelCharge,
    travel_hourly_rate: _travelHourlyRate,
    mileage_rate: _mileageRate,
    free_travel_miles: _freeTravelMiles,
    charge_method: _chargeMethod,
    ...visibleSession
  } = session;

  return visibleSession;
}

async function loadJob(
  jobId: string,
  companyId: string,
) {
  const supabase =
    await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, company_id")
    .eq("id", jobId)
    .eq("company_id", companyId)
    .maybeSingle();

  return {
    supabase,
    job: data,
    error,
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const auth =
    await getAuthenticatedUserContext();

  if (!auth) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { id: jobId } =
    await context.params;

  const {
    supabase,
    job,
    error,
  } = await loadJob(
    jobId,
    auth.companyId,
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  if (!job) {
    return NextResponse.json(
      { error: "Job not found." },
      { status: 404 },
    );
  }

  const {
    data: sessions,
    error: sessionsError,
  } = await supabase
    .from("job_travel_sessions")
    .select(`
      id,
      job_id,
      technician_user_id,
      direction,
      status,
      started_at,
      arrived_at,
      start_latitude,
      start_longitude,
      end_latitude,
      end_longitude,
      start_odometer_miles,
      end_odometer_miles,
      calculated_distance_miles,
      confirmed_distance_miles,
      travel_minutes,
      notes,
      created_at,
      updated_at
    `)
    .eq("job_id", jobId)
    .eq("company_id", auth.companyId)
    .eq(
      "technician_user_id",
      auth.userId,
    )
    .order("started_at", {
      ascending: false,
    });

  if (sessionsError) {
    return NextResponse.json(
      { error: sessionsError.message },
      { status: 500 },
    );
  }

  const visibleSessions =
    (sessions ?? []).map(
      (session) =>
        publicTravelSession(
          session as Record<
            string,
            unknown
          >,
        ),
    );

  return NextResponse.json(
    {
      sessions: visibleSessions,
      activeSession:
        visibleSessions.find(
          (session) =>
            session.status ===
            "in_progress",
        ) ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const auth =
    await getAuthenticatedUserContext();

  if (!auth) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { id: jobId } =
    await context.params;

  let body: TravelActionBody;

  try {
    body =
      (await request.json()) as TravelActionBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "A valid JSON request body is required.",
      },
      { status: 400 },
    );
  }

  const action = asAction(body.action);

  if (!action) {
    return NextResponse.json(
      {
        error:
          'Use action "start" or "arrive".',
      },
      { status: 400 },
    );
  }

  const startOdometerMiles =
    cleanNumber(
      body.startOdometerMiles,
    );

  const endOdometerMiles =
    cleanNumber(
      body.endOdometerMiles,
    );

  const confirmedDistanceMiles =
    cleanNumber(
      body.confirmedDistanceMiles,
    );

  const startLatitude =
    cleanNumber(body.startLatitude);

  const startLongitude =
    cleanNumber(body.startLongitude);

  const endLatitude =
    cleanNumber(body.endLatitude);

  const endLongitude =
    cleanNumber(body.endLongitude);

  const numericValues = [
    startOdometerMiles,
    endOdometerMiles,
    confirmedDistanceMiles,
    startLatitude,
    startLongitude,
    endLatitude,
    endLongitude,
  ];

  if (
    numericValues.some(
      (value) =>
        value !== null &&
        Number.isNaN(value),
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Mileage and location values must be valid numbers.",
      },
      { status: 400 },
    );
  }

  if (
    startOdometerMiles !== null &&
    startOdometerMiles < 0
  ) {
    return NextResponse.json(
      {
        error:
          "Starting mileage cannot be negative.",
      },
      { status: 400 },
    );
  }

  if (
    endOdometerMiles !== null &&
    endOdometerMiles < 0
  ) {
    return NextResponse.json(
      {
        error:
          "Ending mileage cannot be negative.",
      },
      { status: 400 },
    );
  }

  if (
    confirmedDistanceMiles !== null &&
    confirmedDistanceMiles < 0
  ) {
    return NextResponse.json(
      {
        error:
          "Confirmed distance cannot be negative.",
      },
      { status: 400 },
    );
  }

  if (
    !validLatitude(startLatitude) ||
    !validLatitude(endLatitude)
  ) {
    return NextResponse.json(
      {
        error:
          "Latitude must be between -90 and 90.",
      },
      { status: 400 },
    );
  }

  if (
    !validLongitude(startLongitude) ||
    !validLongitude(endLongitude)
  ) {
    return NextResponse.json(
      {
        error:
          "Longitude must be between -180 and 180.",
      },
      { status: 400 },
    );
  }

  const {
    supabase,
    job,
    error,
  } = await loadJob(
    jobId,
    auth.companyId,
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  if (!job) {
    return NextResponse.json(
      { error: "Job not found." },
      { status: 404 },
    );
  }

  if (action === "start") {
    const {
      data: activeSession,
      error: activeError,
    } = await supabase
      .from("job_travel_sessions")
      .select("id, job_id")
      .eq("company_id", auth.companyId)
      .eq(
        "technician_user_id",
        auth.userId,
      )
      .eq("status", "in_progress")
      .limit(1)
      .maybeSingle();

    if (activeError) {
      return NextResponse.json(
        { error: activeError.message },
        { status: 500 },
      );
    }

    if (activeSession) {
      return NextResponse.json(
        {
          error:
            activeSession.job_id ===
            jobId
              ? "Travel is already active for this job."
              : "You already have an active travel session for another job.",
        },
        { status: 409 },
      );
    }

    const {
      data: session,
      error: insertError,
    } = await supabase
      .from("job_travel_sessions")
      .insert({
        company_id:
          auth.companyId,
        job_id: jobId,
        technician_user_id:
          auth.userId,

        direction:
          asDirection(
            body.direction,
          ),

        status: "in_progress",
        started_at:
          new Date().toISOString(),

        start_odometer_miles:
          startOdometerMiles,

        start_latitude:
          startLatitude,

        start_longitude:
          startLongitude,

        notes:
          cleanText(body.notes) ||
          null,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      session: publicTravelSession(
        session as Record<
          string,
          unknown
        >,
      ),
      message: "Travel started.",
    });
  }

  const {
    data: activeSession,
    error: activeError,
  } = await supabase
    .from("job_travel_sessions")
    .select("*")
    .eq("job_id", jobId)
    .eq("company_id", auth.companyId)
    .eq(
      "technician_user_id",
      auth.userId,
    )
    .eq("status", "in_progress")
    .limit(1)
    .maybeSingle();

  if (activeError) {
    return NextResponse.json(
      { error: activeError.message },
      { status: 500 },
    );
  }

  if (!activeSession) {
    return NextResponse.json(
      {
        error:
          "No active travel session was found for this job.",
      },
      { status: 404 },
    );
  }

  if (
    endOdometerMiles !== null &&
    activeSession
      .start_odometer_miles !==
      null &&
    endOdometerMiles <
      Number(
        activeSession
          .start_odometer_miles,
      )
  ) {
    return NextResponse.json(
      {
        error:
          "Ending mileage cannot be lower than starting mileage.",
      },
      { status: 400 },
    );
  }

  const {
    data: session,
    error: updateError,
  } = await supabase
    .from("job_travel_sessions")
    .update({
      status: "completed",
      arrived_at:
        new Date().toISOString(),

      end_odometer_miles:
        endOdometerMiles,

      /*
       * When this is null, the database trigger can
       * calculate distance from the odometer readings.
       */
      confirmed_distance_miles:
        confirmedDistanceMiles,

      end_latitude:
        endLatitude,

      end_longitude:
        endLongitude,

      notes:
        cleanText(body.notes) ||
        activeSession.notes ||
        null,
    })
    .eq("id", activeSession.id)
    .eq("company_id", auth.companyId)
    .eq(
      "technician_user_id",
      auth.userId,
    )
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    session: publicTravelSession(
      session as Record<
        string,
        unknown
      >,
    ),
    message: "Arrival recorded.",
  });
}