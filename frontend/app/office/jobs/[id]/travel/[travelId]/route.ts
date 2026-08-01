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
    travelId: string;
  }>;
};

type UpdateTravelBody = {
  direction?: unknown;
  status?: unknown;
  startedAt?: unknown;
  arrivedAt?: unknown;
  startOdometerMiles?: unknown;
  endOdometerMiles?: unknown;
  confirmedDistanceMiles?: unknown;
  notes?: unknown;
  billable?: unknown;
  chargeMethod?: unknown;
  travelHourlyRate?: unknown;
  mileageRate?: unknown;
  freeTravelMiles?: unknown;
  adjustmentReason?: unknown;
  markReviewed?: unknown;
};

const MANAGER_ROLES = new Set([
  "company_admin",
  "administrator",
  "service_manager",
  "office",
]);

function cleanText(value: unknown, maximumLength = 2000) {
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

function cleanDateTime(value: unknown) {
  const text = cleanText(value, 50);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString();
}

function canManageTravel(
  role: string,
  permissions: string[],
) {
  return (
    MANAGER_ROLES.has(role) ||
    permissions.includes("jobs.edit")
  );
}

export async function PATCH(
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

  if (
    !canManageTravel(
      auth.role,
      auth.permissions,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to edit travel records.",
      },
      { status: 403 },
    );
  }

  const { id: jobId, travelId } =
    await context.params;

  let body: UpdateTravelBody;

  try {
    body =
      (await request.json()) as UpdateTravelBody;
  } catch {
    return NextResponse.json(
      { error: "Valid JSON is required." },
      { status: 400 },
    );
  }

  const adjustmentReason = cleanText(
    body.adjustmentReason,
    1000,
  );

  if (!adjustmentReason) {
    return NextResponse.json(
      {
        error:
          "Enter a reason for the travel adjustment.",
      },
      { status: 400 },
    );
  }

  const startedAt =
    cleanDateTime(body.startedAt);
  const arrivedAt =
    cleanDateTime(body.arrivedAt);

  if (
    startedAt === undefined ||
    arrivedAt === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "Enter valid start and arrival times.",
      },
      { status: 400 },
    );
  }

  const numericFields = {
    start_odometer_miles:
      cleanNumber(body.startOdometerMiles),
    end_odometer_miles:
      cleanNumber(body.endOdometerMiles),
    confirmed_distance_miles:
      cleanNumber(body.confirmedDistanceMiles),
    travel_hourly_rate:
      cleanNumber(body.travelHourlyRate),
    mileage_rate:
      cleanNumber(body.mileageRate),
    free_travel_miles:
      cleanNumber(body.freeTravelMiles),
  };

  if (
    Object.values(numericFields).some(
      (value) => Number.isNaN(value),
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Travel and mileage values must be valid numbers.",
      },
      { status: 400 },
    );
  }

  const supabase =
    await createSupabaseServerClient();

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("job_travel_sessions")
    .select("*")
    .eq("id", travelId)
    .eq("job_id", jobId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Travel record not found." },
      { status: 404 },
    );
  }

  const direction =
    body.direction === "return" ||
    body.direction === "additional"
      ? body.direction
      : "outbound";

  const status =
    body.status === "cancelled" ||
    body.status === "in_progress"
      ? body.status
      : "completed";

  const chargeMethod =
    body.chargeMethod === "mileage_only" ||
    body.chargeMethod === "time_only" ||
    body.chargeMethod === "fixed_callout" ||
    body.chargeMethod === "none"
      ? body.chargeMethod
      : "combined";

  const markReviewed =
    body.markReviewed === true;

  const update = {
    direction,
    status,
    started_at:
      startedAt ?? existing.started_at,
    arrived_at:
      arrivedAt ?? existing.arrived_at,
    ...numericFields,
    notes:
      cleanText(body.notes) || null,
    billable:
      body.billable !== false,
    charge_method: chargeMethod,
    adjustment_reason: adjustmentReason,
    last_edited_by: auth.userId,
    last_edited_at:
      new Date().toISOString(),
    reviewed_by:
      markReviewed
        ? auth.userId
        : existing.reviewed_by,
    reviewed_at:
      markReviewed
        ? new Date().toISOString()
        : existing.reviewed_at,
  };

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("job_travel_sessions")
    .update(update)
    .eq("id", travelId)
    .eq("company_id", auth.companyId)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    travel: updated,
    message:
      markReviewed
        ? "Travel record updated and reviewed."
        : "Travel record updated.",
  });
}