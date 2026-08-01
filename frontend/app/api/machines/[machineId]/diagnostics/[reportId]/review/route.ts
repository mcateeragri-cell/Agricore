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
    machineId: string;
    reportId: string;
  }>;
};

type ReviewBody = {
  make?: unknown;
  model?: unknown;
  serialNumber?: unknown;
  registration?: unknown;
  hours?: unknown;
  reportDate?: unknown;
  updateMachineIdentity?: unknown;
  saveHourReading?: unknown;
};

function cleanText(
  value: unknown,
  maximumLength = 200,
) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function cleanBoolean(value: unknown) {
  return value === true;
}

function parseHours(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 100) / 100
    : Number.NaN;
}

function parseDate(value: unknown) {
  const text = cleanText(value, 20);

  if (!text) {
    return null;
  }

  const date = new Date(`${text}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? undefined
    : text;
}

function hasPermission(
  permissions: string[],
  permission: string,
) {
  return permissions.includes(permission);
}

async function loadReport(
  machineId: string,
  reportId: string,
  companyId: string,
) {
  const supabase =
    await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("machine_diagnostic_reports")
    .select("*")
    .eq("id", reportId)
    .eq("machine_id", machineId)
    .eq("company_id", companyId)
    .maybeSingle();

  return {
    supabase,
    report: data,
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

  const { machineId, reportId } =
    await context.params;

  const {
    supabase,
    report,
    error,
  } = await loadReport(
    machineId,
    reportId,
    auth.companyId,
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  if (!report) {
    return NextResponse.json(
      { error: "Diagnostic report not found." },
      { status: 404 },
    );
  }

  const { data: faults, error: faultsError } =
    await supabase
      .from("machine_diagnostic_faults")
      .select("*")
      .eq("report_id", reportId)
      .eq("company_id", auth.companyId)
      .order("created_at", {
        ascending: true,
      });

  if (faultsError) {
    return NextResponse.json(
      { error: faultsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      report,
      faults: faults ?? [],
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

  if (
    !hasPermission(
      auth.permissions,
      "machines.edit",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to approve diagnostic results.",
      },
      { status: 403 },
    );
  }

  const { machineId, reportId } =
    await context.params;

  let body: ReviewBody;

  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "A valid JSON request body is required.",
      },
      { status: 400 },
    );
  }

  const make = cleanText(body.make);
  const model = cleanText(body.model);
  const serialNumber = cleanText(
    body.serialNumber,
    100,
  );
  const registration = cleanText(
    body.registration,
    40,
  ).toUpperCase();

  const hours = parseHours(body.hours);
  const reportDate = parseDate(body.reportDate);

  if (Number.isNaN(hours)) {
    return NextResponse.json(
      {
        error:
          "Enter a valid non-negative hour reading.",
      },
      { status: 400 },
    );
  }

  if (reportDate === undefined) {
    return NextResponse.json(
      { error: "Enter a valid report date." },
      { status: 400 },
    );
  }

  const {
    supabase,
    report,
    error,
  } = await loadReport(
    machineId,
    reportId,
    auth.companyId,
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  if (!report) {
    return NextResponse.json(
      { error: "Diagnostic report not found." },
      { status: 404 },
    );
  }

  const existingExtractedData =
    report.extracted_data &&
    typeof report.extracted_data === "object"
      ? report.extracted_data
      : {};

  const reviewedData = {
    make: make || null,
    model: model || null,
    serialNumber: serialNumber || null,
    registration: registration || null,
    hours,
    reportDate,
    reviewedBy: auth.userId,
    reviewedAt: new Date().toISOString(),
  };

  if (cleanBoolean(body.updateMachineIdentity)) {
    const machineUpdate: Record<
      string,
      string | number | null
    > = {};

    if (make) {
      machineUpdate.make = make;
    }

    if (model) {
      machineUpdate.model = model;
    }

    machineUpdate.serial_number =
      serialNumber || null;
    machineUpdate.registration =
      registration || null;

    const { error: machineError } =
      await supabase
        .from("machines")
        .update(machineUpdate)
        .eq("id", machineId)
        .eq("company_id", auth.companyId);

    if (machineError) {
      return NextResponse.json(
        {
          error:
            `Unable to update machine identity: ${machineError.message}`,
        },
        { status: 500 },
      );
    }
  }

  if (
    cleanBoolean(body.saveHourReading) &&
    hours !== null
  ) {
    const readingDate =
      reportDate ||
      new Date().toISOString().slice(0, 10);

    const { error: hourError } =
  await supabase
    .from("machine_hour_readings")
    .insert({
      company_id: auth.companyId,
      machine_id: machineId,
      hours,
      reading_date: readingDate,
      source: "diagnostic_report",
      notes:
        `Imported from ${report.original_filename}`,
      diagnostic_report_id: reportId,
    });

    if (hourError) {
      return NextResponse.json(
        {
          error:
            `Unable to save hour reading: ${hourError.message}`,
        },
        { status: 500 },
      );
    }

    const { error: hoursUpdateError } =
      await supabase
        .from("machines")
        .update({ hours })
        .eq("id", machineId)
        .eq("company_id", auth.companyId);

    if (hoursUpdateError) {
      return NextResponse.json(
        {
          error:
            `The hour history was saved, but the machine's current hours could not be updated: ${hoursUpdateError.message}`,
        },
        { status: 500 },
      );
    }
  }

  const { data: updatedReport, error: updateError } =
    await supabase
      .from("machine_diagnostic_reports")
      .update({
        import_status: "parsed",
        machine_serial_number:
          serialNumber || null,
        machine_registration:
          registration || null,
        reported_hours: hours,
        report_date: reportDate,
        parse_message:
          "Diagnostic result reviewed and approved.",
        extracted_data: {
          ...existingExtractedData,
          review: reviewedData,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .eq("company_id", auth.companyId)
      .select("*")
      .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  if (!updatedReport) {
    return NextResponse.json(
      {
        error:
          "The diagnostic report could not be updated.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    report: updatedReport,
    message:
      "Diagnostic result reviewed and approved.",
  });
}