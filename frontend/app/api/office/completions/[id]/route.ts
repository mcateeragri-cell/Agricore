import { NextRequest, NextResponse } from "next/server";

import {
  getOfficeAuth,
  normaliseStatus,
} from "../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DecisionAction = "approve" | "reject";

type DecisionBody = {
  action?: DecisionAction;
  officeNotes?: string;
  rejectionReason?: string;
};

type CompletionRow = {
  id: string;
  job_id: string;
  assignment_id: string | null;

  submitted_by: string | null;
  technician_name: string | null;

  diagnosis: string | null;
  work_carried_out: string | null;

  customer_name: string | null;
  customer_position: string | null;
  customer_confirmation: boolean | null;

  signature_data_url: string | null;
  signature_storage_path: string | null;

  machine_tested: boolean | null;
  guards_fitted: boolean | null;
  area_left_tidy: boolean | null;
  customer_instructed: boolean | null;

  photos_checked: boolean | null;
  parts_checked: boolean | null;
  labour_checked: boolean | null;

  technician_notes: string | null;
  office_notes: string | null;
  rejection_reason: string | null;

  status: string;

  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;

  reviewed_by: string | null;
  reviewer_name: string | null;

  created_at: string;
  updated_at: string;
};

type JobRow = {
  id: string;
  job_number: string;
  status: string;
  priority: string;
  fault_reported: string | null;
  diagnosis: string | null;
  work_carried_out: string | null;
  internal_notes: string | null;
  machine_hours: number | null;
  invoice_status: string;
  customer_id: string | null;
  machine_id: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
};

type MachineRow = {
  id: string;
  make: string | null;
  model: string | null;
  registration: string | null;
  serial_number: string | null;
  machine_hours: number | null;
};

type LabourRow = {
  id: string;
  job_id: string;
  engineer_name: string | null;
  labour_date: string | null;
  start_time: string | null;
  finish_time: string | null;
  hours: number | null;
  hourly_rate: number | null;
  description: string | null;
  entry_status: string | null;
};

type PartRow = {
  id: string;
  job_id: string;
  part_number: string | null;
  description: string | null;
  quantity: number | null;
  unit_cost: number | null;
  unit_price: number | null;
  supplier: string | null;
  notes: string | null;
};

type PhotoRow = {
  id: string;
  job_id: string;
  file_path: string;
  caption: string | null;
  created_at: string;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const auth = await getOfficeAuth();

    const authError = getAuthErrorResponse(auth);

    if (authError) {
      return authError;
    }

    if (!id) {
      return NextResponse.json(
        {
          error: "Completion ID is required.",
        },
        { status: 400 },
      );
    }

    const result = await loadCompletionDetail(
      auth.supabase,
      id,
    );

    if (!result) {
      return NextResponse.json(
        {
          error: "Job completion was not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      reviewer: {
        id: auth.user!.id,
        fullName: auth.fullName,
        email: auth.user!.email ?? "",
        role: auth.role,
      },
      ...result,
    });
  } catch (error) {
    console.error(
      "GET office completion detail error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load the job completion.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const auth = await getOfficeAuth();

    const authError = getAuthErrorResponse(auth);

    if (authError) {
      return authError;
    }

    if (!id) {
      return NextResponse.json(
        {
          error: "Completion ID is required.",
        },
        { status: 400 },
      );
    }

    let body: DecisionBody;

    try {
      body = (await request.json()) as DecisionBody;
    } catch {
      return NextResponse.json(
        {
          error: "The request body is not valid JSON.",
        },
        { status: 400 },
      );
    }

    const action = body.action;
    const officeNotes = cleanText(body.officeNotes);
    const rejectionReason = cleanText(
      body.rejectionReason,
    );

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        {
          error:
            'Action must be either "approve" or "reject".',
        },
        { status: 400 },
      );
    }

    if (
      action === "reject" &&
      rejectionReason.length < 3
    ) {
      return NextResponse.json(
        {
          error:
            "A rejection reason is required when returning a job to the technician.",
        },
        { status: 400 },
      );
    }

    const {
      data: completionData,
      error: completionError,
    } = await auth.supabase
      .from("job_completions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (completionError) {
      throw new Error(completionError.message);
    }

    if (!completionData) {
      return NextResponse.json(
        {
          error: "Job completion was not found.",
        },
        { status: 404 },
      );
    }

    const existingCompletion =
      completionData as CompletionRow;

    const currentStatus = normaliseStatus(
      existingCompletion.status,
    );

    if (currentStatus !== "submitted") {
      return NextResponse.json(
        {
          error:
            currentStatus === "approved"
              ? "This job completion has already been approved."
              : currentStatus === "rejected"
                ? "This job completion has already been rejected."
                : "Only submitted completions can be reviewed.",
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      const approvedCompletion =
        await approveCompletion({
          supabase: auth.supabase,
          completion: existingCompletion,
          reviewerId: auth.user!.id,
          reviewerName: auth.fullName,
          officeNotes,
          reviewedAt: now,
        });

      return NextResponse.json({
        success: true,
        message:
          "Job completion approved and marked as ready for invoicing.",
        completion: mapCompletion(
          approvedCompletion,
        ),
      });
    }

    const rejectedCompletion =
      await rejectCompletion({
        supabase: auth.supabase,
        completion: existingCompletion,
        reviewerId: auth.user!.id,
        reviewerName: auth.fullName,
        officeNotes,
        rejectionReason,
        reviewedAt: now,
      });

    return NextResponse.json({
      success: true,
      message:
        "Job completion returned to the technician.",
      completion: mapCompletion(
        rejectedCompletion,
      ),
    });
  } catch (error) {
    console.error(
      "POST office completion decision error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save the review decision.",
      },
      { status: 500 },
    );
  }
}

async function loadCompletionDetail(
  supabase: Awaited<
    ReturnType<typeof getOfficeAuth>
  >["supabase"],
  completionId: string,
) {
  const {
    data: completionData,
    error: completionError,
  } = await supabase
    .from("job_completions")
    .select("*")
    .eq("id", completionId)
    .maybeSingle();

  if (completionError) {
    throw new Error(completionError.message);
  }

  if (!completionData) {
    return null;
  }

  const completion =
    completionData as CompletionRow;

  const {
    data: jobData,
    error: jobError,
  } = await supabase
    .from("jobs")
    .select(`
      id,
      job_number,
      status,
      priority,
      fault_reported,
      diagnosis,
      work_carried_out,
      internal_notes,
      machine_hours,
      invoice_status,
      customer_id,
      machine_id
    `)
    .eq("id", completion.job_id)
    .maybeSingle();

  if (jobError) {
    throw new Error(jobError.message);
  }

  if (!jobData) {
    throw new Error(
      "The job associated with this completion could not be found.",
    );
  }

  const job = jobData as JobRow;

  const [
    customerResult,
    machineResult,
    labourResult,
    partsResult,
    photosResult,
  ] = await Promise.all([
    job.customer_id
      ? supabase
          .from("customers")
          .select(`
            id,
            name,
            contact_name,
            phone,
            email
          `)
          .eq("id", job.customer_id)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    job.machine_id
      ? supabase
          .from("machines")
          .select(`
            id,
            make,
            model,
            registration,
            serial_number,
            machine_hours
          `)
          .eq("id", job.machine_id)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    supabase
      .from("job_labour_entries")
      .select(`
        id,
        job_id,
        engineer_name,
        labour_date,
        start_time,
        finish_time,
        hours,
        hourly_rate,
        description,
        entry_status
      `)
      .eq("job_id", job.id)
      .order("labour_date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      }),

    supabase
      .from("job_parts")
      .select(`
        id,
        job_id,
        part_number,
        description,
        quantity,
        unit_cost,
        unit_price,
        supplier,
        notes
      `)
      .eq("job_id", job.id)
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("job_photos")
      .select(`
        id,
        job_id,
        file_path,
        caption,
        created_at
      `)
      .eq("job_id", job.id)
      .order("created_at", {
        ascending: true,
      }),
  ]);

  if (customerResult.error) {
    throw new Error(
      customerResult.error.message,
    );
  }

  if (machineResult.error) {
    throw new Error(machineResult.error.message);
  }

  if (labourResult.error) {
    throw new Error(labourResult.error.message);
  }

  if (partsResult.error) {
    throw new Error(partsResult.error.message);
  }

  if (photosResult.error) {
    throw new Error(photosResult.error.message);
  }

  const customer = customerResult.data
    ? (customerResult.data as CustomerRow)
    : null;

  const machine = machineResult.data
    ? (machineResult.data as MachineRow)
    : null;

  const labourRows =
    (labourResult.data ?? []) as LabourRow[];

  const partRows =
    (partsResult.data ?? []) as PartRow[];

  const photoRows =
    (photosResult.data ?? []) as PhotoRow[];

  const labourEntries = labourRows.map(
    (entry) => {
      const hours = safeNumber(entry.hours);
      const hourlyRate = safeNumber(
        entry.hourly_rate,
      );

      return {
        id: entry.id,
        engineerName:
          entry.engineer_name ?? "",
        labourDate: entry.labour_date ?? "",
        startTime: entry.start_time ?? "",
        finishTime: entry.finish_time ?? "",
        hours:
          entry.hours === null
            ? null
            : hours,
        hourlyRate,
        description:
          entry.description ?? "",
        entryStatus:
          entry.entry_status ?? "",
      };
    },
  );

  const parts = partRows.map((part) => {
    const quantity = safeNumber(
      part.quantity,
    );
    const unitCost = safeNumber(
      part.unit_cost,
    );
    const unitPrice = safeNumber(
      part.unit_price,
    );

    return {
      id: part.id,
      partNumber: part.part_number ?? "",
      description: part.description ?? "",
      quantity,
      unitCost,
      unitPrice,
      supplier: part.supplier ?? "",
      notes: part.notes ?? "",
      lineCost: roundMoney(
        quantity * unitCost,
      ),
      lineTotal: roundMoney(
        quantity * unitPrice,
      ),
    };
  });

  const photos = photoRows.map((photo) => ({
    id: photo.id,
    filePath: photo.file_path,
    caption: photo.caption ?? "",
    createdAt: photo.created_at,
    url: getPhotoUrl(
      supabase,
      photo.file_path,
    ),
  }));

  const totals = {
    labourHours: roundNumber(
      labourEntries.reduce(
        (total, entry) =>
          total + safeNumber(entry.hours),
        0,
      ),
    ),

    labourValue: roundMoney(
      labourEntries.reduce(
        (total, entry) =>
          total +
          safeNumber(entry.hours) *
            safeNumber(entry.hourlyRate),
        0,
      ),
    ),

    partsCost: roundMoney(
      parts.reduce(
        (total, part) =>
          total + part.lineCost,
        0,
      ),
    ),

    partsValue: roundMoney(
      parts.reduce(
        (total, part) =>
          total + part.lineTotal,
        0,
      ),
    ),
  };

  return {
    job: {
      id: job.id,
      jobNumber: job.job_number,
      status: job.status,
      priority: job.priority,
      faultReported:
        job.fault_reported ?? "",
      diagnosis: job.diagnosis ?? "",
      workCarriedOut:
        job.work_carried_out ?? "",
      internalNotes:
        job.internal_notes ?? "",
      machineHours:
        job.machine_hours ?? null,
      invoiceStatus:
        job.invoice_status ?? "",
    },

    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          contactName:
            customer.contact_name ?? "",
          phone: customer.phone ?? "",
          email: customer.email ?? "",
        }
      : null,

    machine: machine
      ? {
          id: machine.id,
          displayName:
            buildMachineName(machine),
          registration:
            machine.registration ?? "",
          serialNumber:
            machine.serial_number ?? "",
          machineHours:
            machine.machine_hours ?? null,
        }
      : null,

    completion: mapCompletion(completion),

    labourEntries,
    parts,
    photos,
    totals,
  };
}

async function approveCompletion({
  supabase,
  completion,
  reviewerId,
  reviewerName,
  officeNotes,
  reviewedAt,
}: {
  supabase: Awaited<
    ReturnType<typeof getOfficeAuth>
  >["supabase"];
  completion: CompletionRow;
  reviewerId: string;
  reviewerName: string;
  officeNotes: string;
  reviewedAt: string;
}) {
  const completionUpdate = {
    status: "approved",
    office_notes: officeNotes,
    rejection_reason: "",
    reviewed_by: reviewerId,
    reviewer_name: reviewerName,
    reviewed_at: reviewedAt,
    approved_at: reviewedAt,
    rejected_at: null,
    updated_at: reviewedAt,
  };

  const {
    data: updatedCompletion,
    error: completionError,
  } = await supabase
    .from("job_completions")
    .update(completionUpdate)
    .eq("id", completion.id)
    .eq("status", "submitted")
    .select("*")
    .maybeSingle();

  if (completionError) {
    throw new Error(completionError.message);
  }

  if (!updatedCompletion) {
    throw new Error(
      "The completion changed before it could be approved. Refresh the page and try again.",
    );
  }

  const {
    error: jobUpdateError,
  } = await supabase
    .from("jobs")
    .update({
      invoice_status: "ready",
      status: "completed",
      diagnosis: completion.diagnosis ?? "",
      work_carried_out:
        completion.work_carried_out ?? "",
      updated_at: reviewedAt,
    })
    .eq("id", completion.job_id);

  if (jobUpdateError) {
    await rollbackCompletionDecision(
      supabase,
      completion,
    );

    throw new Error(
      `The completion was reviewed, but the job could not be marked invoice-ready: ${jobUpdateError.message}`,
    );
  }

  return updatedCompletion as CompletionRow;
}

async function rejectCompletion({
  supabase,
  completion,
  reviewerId,
  reviewerName,
  officeNotes,
  rejectionReason,
  reviewedAt,
}: {
  supabase: Awaited<
    ReturnType<typeof getOfficeAuth>
  >["supabase"];
  completion: CompletionRow;
  reviewerId: string;
  reviewerName: string;
  officeNotes: string;
  rejectionReason: string;
  reviewedAt: string;
}) {
  const {
    data: updatedCompletion,
    error: completionError,
  } = await supabase
    .from("job_completions")
    .update({
      status: "rejected",
      office_notes: officeNotes,
      rejection_reason: rejectionReason,
      reviewed_by: reviewerId,
      reviewer_name: reviewerName,
      reviewed_at: reviewedAt,
      approved_at: null,
      rejected_at: reviewedAt,
      updated_at: reviewedAt,
    })
    .eq("id", completion.id)
    .eq("status", "submitted")
    .select("*")
    .maybeSingle();

  if (completionError) {
    throw new Error(completionError.message);
  }

  if (!updatedCompletion) {
    throw new Error(
      "The completion changed before it could be rejected. Refresh the page and try again.",
    );
  }

  const {
    error: jobUpdateError,
  } = await supabase
    .from("jobs")
    .update({
      invoice_status: "not_ready",
      status: "in_progress",
      updated_at: reviewedAt,
    })
    .eq("id", completion.job_id);

  if (jobUpdateError) {
    await rollbackCompletionDecision(
      supabase,
      completion,
    );

    throw new Error(
      `The completion was rejected, but the job could not be reopened: ${jobUpdateError.message}`,
    );
  }

  return updatedCompletion as CompletionRow;
}

async function rollbackCompletionDecision(
  supabase: Awaited<
    ReturnType<typeof getOfficeAuth>
  >["supabase"],
  completion: CompletionRow,
) {
  const {
    error: rollbackError,
  } = await supabase
    .from("job_completions")
    .update({
      status: completion.status,
      office_notes: completion.office_notes,
      rejection_reason:
        completion.rejection_reason,
      reviewed_by: completion.reviewed_by,
      reviewer_name:
        completion.reviewer_name,
      reviewed_at: completion.reviewed_at,
      approved_at: completion.approved_at,
      rejected_at: completion.rejected_at,
      updated_at: completion.updated_at,
    })
    .eq("id", completion.id);

  if (rollbackError) {
    console.error(
      "Unable to roll back completion decision:",
      rollbackError,
    );
  }
}

function getAuthErrorResponse(
  auth: Awaited<
    ReturnType<typeof getOfficeAuth>
  >,
) {
  if (!auth.user) {
    return NextResponse.json(
      {
        error:
          auth.error ??
          "You must be signed in.",
      },
      { status: 401 },
    );
  }

  if (auth.error) {
    return NextResponse.json(
      {
        error: auth.error,
      },
      { status: 500 },
    );
  }

  if (!auth.canReview) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to review job completions.",
      },
      { status: 403 },
    );
  }

  return null;
}

function mapCompletion(
  completion: CompletionRow,
) {
  return {
    id: completion.id,
    jobId: completion.job_id,
    assignmentId:
      completion.assignment_id,

    submittedBy:
      completion.submitted_by ?? "",
    technicianName:
      completion.technician_name ?? "",

    diagnosis:
      completion.diagnosis ?? "",
    workCarriedOut:
      completion.work_carried_out ?? "",

    customerName:
      completion.customer_name ?? "",
    customerPosition:
      completion.customer_position ?? "",
    customerConfirmation: Boolean(
      completion.customer_confirmation,
    ),

    signatureDataUrl:
      completion.signature_data_url,
    signatureStoragePath:
      completion.signature_storage_path,

    machineTested: Boolean(
      completion.machine_tested,
    ),
    guardsFitted: Boolean(
      completion.guards_fitted,
    ),
    areaLeftTidy: Boolean(
      completion.area_left_tidy,
    ),
    customerInstructed: Boolean(
      completion.customer_instructed,
    ),

    photosChecked: Boolean(
      completion.photos_checked,
    ),
    partsChecked: Boolean(
      completion.parts_checked,
    ),
    labourChecked: Boolean(
      completion.labour_checked,
    ),

    technicianNotes:
      completion.technician_notes ?? "",
    officeNotes:
      completion.office_notes ?? "",
    rejectionReason:
      completion.rejection_reason ?? "",

    status: normaliseStatus(
      completion.status,
    ),

    submittedAt:
      completion.submitted_at,
    reviewedAt:
      completion.reviewed_at,
    approvedAt:
      completion.approved_at,
    rejectedAt:
      completion.rejected_at,

    createdAt: completion.created_at,
    updatedAt: completion.updated_at,
  };
}

function getPhotoUrl(
  supabase: Awaited<
    ReturnType<typeof getOfficeAuth>
  >["supabase"],
  filePath: string,
) {
  if (!filePath) {
    return "";
  }

  if (
    filePath.startsWith("http://") ||
    filePath.startsWith("https://") ||
    filePath.startsWith("data:")
  ) {
    return filePath;
  }

  const { data } = supabase.storage
    .from("job-photos")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

function buildMachineName(
  machine: MachineRow,
) {
  const name = [
    machine.make,
    machine.model,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Machine";
}

function cleanText(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function safeNumber(
  value: unknown,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

function roundNumber(
  value: number,
) {
  return Math.round(value * 100) / 100;
}

function roundMoney(
  value: number,
) {
  return Math.round(value * 100) / 100;
}