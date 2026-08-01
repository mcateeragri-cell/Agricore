import { NextRequest, NextResponse } from "next/server";

import {
  getAuthenticatedUserContext,
} from "@/lib/auth/require-permission";
import {
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { genericParser } from "@/lib/intelligence/parser-engine/generic";
import type {
  FaultCode,
  ParsedDiagnosticReport,
} from "@/lib/intelligence/parser-engine/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    machineId: string;
    reportId: string;
  }>;
};

type DiagnosticReportRecord = {
  id: string;
  company_id: string;
  machine_id: string;
  job_id: string | null;
  original_filename: string;
  storage_path: string;
  mime_type: string | null;
  import_status: string;
};

const TEXT_EXTENSIONS = new Set([
  "txt",
  "csv",
  "json",
  "xml",
]);

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/csv",
  "application/csv",
  "application/json",
  "application/xml",
  "text/xml",
  "application/octet-stream",
]);

function hasPermission(
  permissions: string[],
  permission: string,
) {
  return permissions.includes(permission);
}

function getExtension(filename: string) {
  const dotIndex = filename.lastIndexOf(".");

  return dotIndex === -1
    ? ""
    : filename
        .slice(dotIndex + 1)
        .trim()
        .toLowerCase();
}

function canReadAsText(
  filename: string,
  mimeType: string | null,
) {
  const extension = getExtension(filename);
  const normalisedMimeType =
    mimeType?.trim().toLowerCase() || "";

  return (
    TEXT_EXTENSIONS.has(extension) &&
    (
      !normalisedMimeType ||
      TEXT_MIME_TYPES.has(normalisedMimeType)
    )
  );
}

function mapFaultStatus(
  status: FaultCode["status"],
) {
  switch (status) {
    case "active":
      return "active";
    case "historic":
    case "inactive":
      return "historic";
    default:
      return "recorded";
  }
}

function mapFaultSeverity(
  severity: FaultCode["severity"],
) {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
    case "medium":
      return "warning";
    case "low":
      return "information";
    default:
      return "unknown";
  }
}

function createExtractedSummary(
  result: ParsedDiagnosticReport,
) {
  const identity = [
    result.machine.make,
    result.machine.model,
  ]
    .filter(Boolean)
    .join(" ");

  const sections = [
    identity || result.manufacturer,
    result.machine.serialNumber
      ? `Serial ${result.machine.serialNumber}`
      : "",
    result.hours !== undefined
      ? `${result.hours.toLocaleString()} hours`
      : "",
    `${result.faultCodes.length} fault code${
      result.faultCodes.length === 1 ? "" : "s"
    }`,
    `${result.controllers.length} controller${
      result.controllers.length === 1 ? "" : "s"
    }`,
  ].filter(Boolean);

  return sections.join(" · ");
}

function serialiseResult(
  result: ParsedDiagnosticReport,
) {
  return {
    manufacturer: result.manufacturer,
    confidence: result.confidence,
    machine: result.machine,
    hours: result.hours ?? null,
    reportDate:
      result.reportDate instanceof Date
        ? result.reportDate.toISOString()
        : result.reportDate ?? null,
    faultCodes: result.faultCodes,
    controllers: result.controllers,
    softwareVersions: result.softwareVersions,
    warnings: result.warnings,
  };
}

export async function POST(
  _request: NextRequest,
  context: RouteContext,
) {
  const authContext =
    await getAuthenticatedUserContext();

  if (!authContext) {
    return NextResponse.json(
      {
        error:
          "You must be signed in to parse a diagnostic report.",
      },
      {
        status: 401,
      },
    );
  }

  if (
    !hasPermission(
      authContext.permissions,
      "machines.edit",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to parse diagnostic reports.",
      },
      {
        status: 403,
      },
    );
  }

  const { machineId, reportId } =
    await context.params;

  if (!machineId || !reportId) {
    return NextResponse.json(
      {
        error:
          "A machine ID and diagnostic report ID are required.",
      },
      {
        status: 400,
      },
    );
  }

  const supabase =
    await createSupabaseServerClient();

  const {
    data: reportData,
    error: reportError,
  } = await supabase
    .from("machine_diagnostic_reports")
    .select("*")
    .eq("id", reportId)
    .eq("machine_id", machineId)
    .eq("company_id", authContext.companyId)
    .maybeSingle();

  if (reportError) {
    console.error(
      "Unable to load diagnostic report for parsing:",
      reportError,
    );

    return NextResponse.json(
      {
        error:
          `Unable to load diagnostic report: ${reportError.message}`,
      },
      {
        status: 500,
      },
    );
  }

  if (!reportData) {
    return NextResponse.json(
      {
        error:
          "The diagnostic report was not found for this machine and company.",
      },
      {
        status: 404,
      },
    );
  }

  const report =
    reportData as DiagnosticReportRecord;

  if (
    !canReadAsText(
      report.original_filename,
      report.mime_type,
    )
  ) {
    const message =
      "Automatic parsing currently supports TXT, CSV, JSON and XML reports. PDF and ZIP parsing will be added in the document-extraction stage.";

    await supabase
      .from("machine_diagnostic_reports")
      .update({
        import_status: "needs_review",
        parser_name: "unsupported-file",
        parser_version: "1.0.0",
        parse_message: message,
        parsed_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .eq("company_id", authContext.companyId);

    return NextResponse.json(
      {
        error: message,
        status: "needs_review",
      },
      {
        status: 415,
      },
    );
  }

  const {
    error: processingError,
  } = await supabase
    .from("machine_diagnostic_reports")
    .update({
      import_status: "processing",
      parse_message: "Parsing diagnostic report.",
    })
    .eq("id", reportId)
    .eq("company_id", authContext.companyId);

  if (processingError) {
    console.error(
      "Unable to mark diagnostic report as processing:",
      processingError,
    );
  }

  try {
    const {
      data: fileBlob,
      error: downloadError,
    } = await supabase.storage
      .from("machine-diagnostics")
      .download(report.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(
        downloadError?.message ||
          "The stored diagnostic file could not be downloaded.",
      );
    }

    const fileBuffer =
      await fileBlob.arrayBuffer();

    const rawText = new TextDecoder(
      "utf-8",
      {
        fatal: false,
      },
    ).decode(fileBuffer);

    if (!rawText.trim()) {
      throw new Error(
        "The diagnostic report does not contain readable text.",
      );
    }

    const canParse =
      await genericParser.canParse(
        report.original_filename,
        rawText,
        report.mime_type ?? undefined,
      );

    if (!canParse) {
      throw new Error(
        "No registered parser accepted this diagnostic report.",
      );
    }

    const result =
      await genericParser.parse(
        report.original_filename,
        rawText,
      );

    const parsedAt =
      new Date().toISOString();

    const extractedData = {
      parser: {
        name: genericParser.name,
        version: "1.0.0",
      },
      result: serialiseResult(result),
    };

    const {
      data: updatedReport,
      error: updateError,
    } = await supabase
      .from("machine_diagnostic_reports")
      .update({
        import_status: "needs_review",
        machine_serial_number:
          result.machine.serialNumber ?? null,
        machine_registration:
          result.machine.registration ?? null,
        reported_hours:
          result.hours ?? null,
        report_date:
          result.reportDate instanceof Date
            ? result.reportDate
                .toISOString()
                .slice(0, 10)
            : null,
        parser_name: genericParser.name,
        parser_version: "1.0.0",
        parse_message:
          "Parsing completed. Review the detected values before importing them into the machine record.",
        extracted_summary:
          createExtractedSummary(result),
        extracted_data: extractedData,
        parsed_at: parsedAt,
      })
      .eq("id", reportId)
      .eq("company_id", authContext.companyId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      throw new Error(
        `Unable to save parsed report: ${updateError.message}`,
      );
    }

    if (!updatedReport) {
      throw new Error(
        "The parsed report could not be saved.",
      );
    }

    const {
      error: deleteFaultsError,
    } = await supabase
      .from("machine_diagnostic_faults")
      .delete()
      .eq("report_id", reportId)
      .eq("company_id", authContext.companyId);

    if (deleteFaultsError) {
      throw new Error(
        `Unable to replace existing fault data: ${deleteFaultsError.message}`,
      );
    }

    if (result.faultCodes.length > 0) {
      const faultRows =
        result.faultCodes.map(
          (fault) => ({
            company_id:
              authContext.companyId,
            report_id: reportId,
            machine_id: machineId,
            job_id: report.job_id,
            fault_code: fault.code,
            control_unit:
              fault.ecu ?? null,
            description:
              fault.description ?? null,
            status:
              mapFaultStatus(
                fault.status,
              ),
            severity:
              mapFaultSeverity(
                fault.severity,
              ),
            raw_data: {
              parserStatus:
                fault.status ?? null,
              parserSeverity:
                fault.severity ?? null,
            },
          }),
        );

      const {
        error: insertFaultsError,
      } = await supabase
        .from("machine_diagnostic_faults")
        .insert(faultRows);

      if (insertFaultsError) {
        throw new Error(
          `The report was parsed, but the fault codes could not be saved: ${insertFaultsError.message}`,
        );
      }
    }

    return NextResponse.json({
      report: updatedReport,
      parsed: serialiseResult(result),
      message:
        "Diagnostic report parsed and saved for review.",
    });
  } catch (error) {
    console.error(
      "Unable to parse diagnostic report:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "The diagnostic report could not be parsed.";

    const {
      error: failedUpdateError,
    } = await supabase
      .from("machine_diagnostic_reports")
      .update({
        import_status: "failed",
        parser_name: genericParser.name,
        parser_version: "1.0.0",
        parse_message: message,
        parsed_at:
          new Date().toISOString(),
      })
      .eq("id", reportId)
      .eq("company_id", authContext.companyId);

    if (failedUpdateError) {
      console.error(
        "Unable to save diagnostic parser failure:",
        failedUpdateError,
      );
    }

    return NextResponse.json(
      {
        error: message,
        status: "failed",
      },
      {
        status: 500,
      },
    );
  }
}