import { NextRequest, NextResponse } from "next/server";

import {
  getAuthenticatedUserContext,
} from "@/lib/auth/require-permission";
import {
  createSupabaseServerClient,
} from "@/lib/supabase-server";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "txt",
  "csv",
  "json",
  "xml",
  "zip",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/json",
  "application/xml",
  "text/xml",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

const SOURCE_SYSTEMS = new Set([
  "new_holland_est",
  "john_deere_service_advisor",
  "agco_edt",
  "jcb_servicemaster",
  "other",
]);

type RouteContext = {
  params: Promise<{
    machineId: string;
  }>;
};

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getFileExtension(filename: string) {
  const lastDotIndex = filename.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return filename
    .slice(lastDotIndex + 1)
    .trim()
    .toLowerCase();
}

function sanitiseFilename(filename: string) {
  const extension = getFileExtension(filename);

  const baseName = filename
    .replace(/\.[^/.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 120);

  const safeBaseName = baseName || "diagnostic-report";

  return extension
    ? `${safeBaseName}.${extension}`
    : safeBaseName;
}

function hasPermission(
  permissions: string[],
  permission: string,
) {
  return permissions.includes(permission);
}

function detectSourceSystem(
  requestedSource: string,
  filename: string,
) {
  if (SOURCE_SYSTEMS.has(requestedSource)) {
    return requestedSource;
  }

  const searchableName = filename.toLowerCase();

  if (
    searchableName.includes("new holland") ||
    searchableName.includes("new_holland") ||
    searchableName.includes("cnh") ||
    searchableName.includes("est")
  ) {
    return "new_holland_est";
  }

  if (
    searchableName.includes("john deere") ||
    searchableName.includes("john_deere") ||
    searchableName.includes("service advisor") ||
    searchableName.includes("service_advisor")
  ) {
    return "john_deere_service_advisor";
  }

  if (
    searchableName.includes("agco") ||
    searchableName.includes("edt") ||
    searchableName.includes("massey") ||
    searchableName.includes("fendt") ||
    searchableName.includes("valtra")
  ) {
    return "agco_edt";
  }

  if (
    searchableName.includes("jcb") ||
    searchableName.includes("servicemaster") ||
    searchableName.includes("service-master")
  ) {
    return "jcb_servicemaster";
  }

  return "other";
}

function getMimeType(file: File) {
  const normalisedType = file.type.trim().toLowerCase();

  return normalisedType || "application/octet-stream";
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const authContext =
    await getAuthenticatedUserContext();

  if (!authContext) {
    return NextResponse.json(
      {
        error: "You must be signed in to upload a diagnostic report.",
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
          "You do not have permission to upload diagnostic reports.",
      },
      {
        status: 403,
      },
    );
  }

  const { machineId } = await context.params;

  if (!machineId) {
    return NextResponse.json(
      {
        error: "A machine ID is required.",
      },
      {
        status: 400,
      },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: "The uploaded form data could not be read.",
      },
      {
        status: 400,
      },
    );
  }

  const uploadedFile = formData.get("file");

  if (!(uploadedFile instanceof File)) {
    return NextResponse.json(
      {
        error: "Choose a diagnostic report to upload.",
      },
      {
        status: 400,
      },
    );
  }

  if (uploadedFile.size <= 0) {
    return NextResponse.json(
      {
        error: "The selected file is empty.",
      },
      {
        status: 400,
      },
    );
  }

  if (uploadedFile.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error:
          "The selected file is larger than the 50 MB upload limit.",
      },
      {
        status: 413,
      },
    );
  }

  const extension = getFileExtension(uploadedFile.name);
  const mimeType = getMimeType(uploadedFile);

  if (
    !ALLOWED_EXTENSIONS.has(extension) ||
    !ALLOWED_MIME_TYPES.has(mimeType)
  ) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Upload a PDF, TXT, CSV, JSON, XML or ZIP report.",
      },
      {
        status: 415,
      },
    );
  }

  const requestedSource = cleanText(
    formData.get("sourceSystem"),
  );

  const sourceSystem = detectSourceSystem(
    requestedSource,
    uploadedFile.name,
  );

  const jobId = cleanText(formData.get("jobId")) || null;
  const reportDate =
    cleanText(formData.get("reportDate")) || null;

  const supabase =
    await createSupabaseServerClient();

  const {
    data: machine,
    error: machineError,
  } = await supabase
    .from("machines")
    .select(
      "id, company_id, customer_id, make, model, serial_number, registration",
    )
    .eq("id", machineId)
    .eq("company_id", authContext.companyId)
    .maybeSingle();

  if (machineError) {
    console.error(
      "Unable to verify diagnostic report machine:",
      machineError,
    );

    return NextResponse.json(
      {
        error: "The selected machine could not be verified.",
      },
      {
        status: 500,
      },
    );
  }

  if (!machine) {
    return NextResponse.json(
      {
        error:
          "The selected machine was not found in the active company.",
      },
      {
        status: 404,
      },
    );
  }

  if (jobId) {
    const {
      data: job,
      error: jobError,
    } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .eq("company_id", authContext.companyId)
      .maybeSingle();

    if (jobError) {
      console.error(
        "Unable to verify diagnostic report job:",
        jobError,
      );

      return NextResponse.json(
        {
          error: "The selected job could not be verified.",
        },
        {
          status: 500,
        },
      );
    }

    if (!job) {
      return NextResponse.json(
        {
          error:
            "The selected job was not found in the active company.",
        },
        {
          status: 404,
        },
      );
    }
  }

  const reportId = crypto.randomUUID();
  const safeFilename = sanitiseFilename(
    uploadedFile.name,
  );

  const storagePath = [
    authContext.companyId,
    machineId,
    reportId,
    safeFilename,
  ].join("/");

  const fileBuffer = await uploadedFile.arrayBuffer();

  const {
    error: uploadError,
  } = await supabase.storage
    .from("machine-diagnostics")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error(
      "Unable to upload diagnostic report:",
      uploadError,
    );

    return NextResponse.json(
      {
        error:
          `Unable to upload diagnostic report: ${uploadError.message}`,
      },
      {
        status: 500,
      },
    );
  }

  const {
    data: report,
    error: insertError,
  } = await supabase
    .from("machine_diagnostic_reports")
    .insert({
      id: reportId,
      company_id: authContext.companyId,
      machine_id: machineId,
      job_id: jobId,
      uploaded_by: authContext.userId,
      source_system: sourceSystem,
      original_filename: uploadedFile.name,
      storage_path: storagePath,
      mime_type: mimeType,
      file_size_bytes: uploadedFile.size,
      import_status: "uploaded",
      machine_serial_number:
        machine.serial_number || null,
      machine_registration:
        machine.registration || null,
      report_date: reportDate,
      parser_name: null,
      parser_version: null,
      parse_message:
        "Uploaded successfully and awaiting review.",
      extracted_data: {
        upload: {
          sourceSelection:
            requestedSource || "automatic",
          detectedSource: sourceSystem,
        },
      },
    })
    .select(
      `
        id,
        machine_id,
        job_id,
        source_system,
        original_filename,
        storage_path,
        mime_type,
        file_size_bytes,
        import_status,
        report_date,
        parse_message,
        created_at
      `,
    )
    .single();

  if (insertError) {
    console.error(
      "Unable to create diagnostic report record:",
      insertError,
    );

    const {
      error: rollbackError,
    } = await supabase.storage
      .from("machine-diagnostics")
      .remove([storagePath]);

    if (rollbackError) {
      console.error(
        "Unable to remove orphaned diagnostic upload:",
        rollbackError,
      );
    }

    return NextResponse.json(
      {
        error:
          `Unable to save diagnostic report: ${insertError.message}`,
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json(
    {
      report,
      machine: {
        id: machine.id,
        customerId: machine.customer_id,
        make: machine.make ?? "",
        model: machine.model ?? "",
        serialNumber:
          machine.serial_number ?? "",
        registration:
          machine.registration ?? "",
      },
      message:
        "Diagnostic report uploaded successfully.",
    },
    {
      status: 201,
    },
  );
}