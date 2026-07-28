import { NextRequest, NextResponse } from "next/server";

import { getTechnicianAuth } from "../../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CompletionAction = "save_draft" | "submit";

type CompletionRequest = {
  action?: CompletionAction;

  diagnosis?: string;
  workCarriedOut?: string;

  customerName?: string;
  customerPosition?: string;
  customerConfirmation?: boolean;

  signatureDataUrl?: string | null;
  signatureStoragePath?: string | null;

  machineTested?: boolean;
  guardsFitted?: boolean;
  areaLeftTidy?: boolean;
  customerInstructed?: boolean;
  photosChecked?: boolean;
  partsChecked?: boolean;
  labourChecked?: boolean;

  technicianNotes?: string;
};

type AssignmentRow = {
  id: string;
  job_id: string;
  user_id: string;
  assignment_status: string | null;
};

type CompletionRow = {
  id: string;
  job_id: string;
  assignment_id: string | null;
  submitted_by: string;
  technician_name: string;
  diagnosis: string;
  work_carried_out: string;
  customer_name: string;
  customer_position: string;
  customer_confirmation: boolean;
  signature_data_url: string | null;
  signature_storage_path: string | null;
  machine_tested: boolean;
  guards_fitted: boolean;
  area_left_tidy: boolean;
  customer_instructed: boolean;
  photos_checked: boolean;
  parts_checked: boolean;
  labour_checked: boolean;
  technician_notes: string;
  office_notes: string;
  rejection_reason: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Load the existing completion draft or submitted completion.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: jobId } = await context.params;

    if (!jobId) {
      return NextResponse.json(
        { error: "A job ID is required." },
        { status: 400 },
      );
    }

    const auth = await getTechnicianAuth();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error ?? "You must be signed in." },
        { status: 401 },
      );
    }

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: 500 },
      );
    }

    const assignment = await getAccessibleAssignment(
      auth.supabase,
      jobId,
      auth.user.id,
      auth.isManager,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this job." },
        { status: 403 },
      );
    }

    const { data, error } = await auth.supabase
      .from("job_completions")
      .select(`
        id,
        job_id,
        assignment_id,
        submitted_by,
        technician_name,
        diagnosis,
        work_carried_out,
        customer_name,
        customer_position,
        customer_confirmation,
        signature_data_url,
        signature_storage_path,
        machine_tested,
        guards_fitted,
        area_left_tidy,
        customer_instructed,
        photos_checked,
        parts_checked,
        labour_checked,
        technician_notes,
        office_notes,
        rejection_reason,
        status,
        submitted_at,
        reviewed_at,
        approved_at,
        rejected_at,
        created_at,
        updated_at
      `)
      .eq("job_id", jobId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      completion: data
        ? mapCompletion(data as CompletionRow)
        : null,
    });
  } catch (error) {
    console.error(
      "GET technician job completion error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load job completion.",
      },
      { status: 500 },
    );
  }
}

/**
 * Save a draft or submit a completed job for office review.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: jobId } = await context.params;

    if (!jobId) {
      return NextResponse.json(
        { error: "A job ID is required." },
        { status: 400 },
      );
    }

    const auth = await getTechnicianAuth();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error ?? "You must be signed in." },
        { status: 401 },
      );
    }

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: 500 },
      );
    }

    const assignment = await getAccessibleAssignment(
      auth.supabase,
      jobId,
      auth.user.id,
      auth.isManager,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this job." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CompletionRequest;
    const action = body.action ?? "save_draft";
    const now = new Date();

    if (
      action !== "save_draft" &&
      action !== "submit"
    ) {
      return NextResponse.json(
        { error: "Unsupported completion action." },
        { status: 400 },
      );
    }

    const existingCompletion =
      await loadExistingCompletion(
        auth.supabase,
        jobId,
      );

    if (
      existingCompletion &&
      ["submitted", "approved"].includes(
        existingCompletion.status,
      )
    ) {
      return NextResponse.json(
        {
          error:
            existingCompletion.status === "approved"
              ? "This job completion has already been approved."
              : "This job completion has already been submitted for office review.",
        },
        { status: 409 },
      );
    }

    const diagnosis = cleanText(
      body.diagnosis ??
        existingCompletion?.diagnosis,
    );

    const workCarriedOut = cleanText(
      body.workCarriedOut ??
        existingCompletion?.work_carried_out,
    );

    const customerName = cleanText(
      body.customerName ??
        existingCompletion?.customer_name,
    );

    const customerPosition = cleanText(
      body.customerPosition ??
        existingCompletion?.customer_position,
    );

    const signatureDataUrl =
      cleanNullableText(
        body.signatureDataUrl ??
          existingCompletion?.signature_data_url,
      );

    const signatureStoragePath =
      cleanNullableText(
        body.signatureStoragePath ??
          existingCompletion?.signature_storage_path,
      );

    const customerConfirmation =
      body.customerConfirmation ??
      existingCompletion?.customer_confirmation ??
      false;

    const machineTested =
      body.machineTested ??
      existingCompletion?.machine_tested ??
      false;

    const guardsFitted =
      body.guardsFitted ??
      existingCompletion?.guards_fitted ??
      false;

    const areaLeftTidy =
      body.areaLeftTidy ??
      existingCompletion?.area_left_tidy ??
      false;

    const customerInstructed =
      body.customerInstructed ??
      existingCompletion?.customer_instructed ??
      false;

    const photosChecked =
      body.photosChecked ??
      existingCompletion?.photos_checked ??
      false;

    const partsChecked =
      body.partsChecked ??
      existingCompletion?.parts_checked ??
      false;

    const labourChecked =
      body.labourChecked ??
      existingCompletion?.labour_checked ??
      false;

    const technicianNotes = cleanText(
      body.technicianNotes ??
        existingCompletion?.technician_notes,
    );

    if (action === "submit") {
      const validationError =
        validateSubmission({
          diagnosis,
          workCarriedOut,
          customerName,
          customerConfirmation,
          signatureDataUrl,
          signatureStoragePath,
          machineTested,
          guardsFitted,
          areaLeftTidy,
          photosChecked,
          partsChecked,
          labourChecked,
        });

      if (validationError) {
        return NextResponse.json(
          { error: validationError },
          { status: 400 },
        );
      }
    }

    const completionStatus =
      action === "submit"
        ? "submitted"
        : existingCompletion?.status === "rejected"
          ? "rejected"
          : "draft";

    const completionPayload = {
      job_id: jobId,
      assignment_id: assignment.id,
      submitted_by: auth.user.id,
      technician_name: auth.fullName,

      diagnosis,
      work_carried_out: workCarriedOut,

      customer_name: customerName,
      customer_position: customerPosition,
      customer_confirmation: customerConfirmation,

      signature_data_url: signatureDataUrl,
      signature_storage_path: signatureStoragePath,

      machine_tested: machineTested,
      guards_fitted: guardsFitted,
      area_left_tidy: areaLeftTidy,
      customer_instructed: customerInstructed,
      photos_checked: photosChecked,
      parts_checked: partsChecked,
      labour_checked: labourChecked,

      technician_notes: technicianNotes,

      status: completionStatus,
      submitted_at:
        action === "submit"
          ? now.toISOString()
          : existingCompletion?.submitted_at ?? null,

      reviewed_by: null,
      reviewed_at: null,
      approved_at: null,
      rejected_at: null,

      office_notes:
        action === "submit"
          ? ""
          : existingCompletion?.office_notes ?? "",

      rejection_reason:
        action === "submit"
          ? ""
          : existingCompletion?.rejection_reason ?? "",
    };

    const { data: savedCompletion, error: saveError } =
      await auth.supabase
        .from("job_completions")
        .upsert(completionPayload, {
          onConflict: "job_id",
        })
        .select(`
          id,
          job_id,
          assignment_id,
          submitted_by,
          technician_name,
          diagnosis,
          work_carried_out,
          customer_name,
          customer_position,
          customer_confirmation,
          signature_data_url,
          signature_storage_path,
          machine_tested,
          guards_fitted,
          area_left_tidy,
          customer_instructed,
          photos_checked,
          parts_checked,
          labour_checked,
          technician_notes,
          office_notes,
          rejection_reason,
          status,
          submitted_at,
          reviewed_at,
          approved_at,
          rejected_at,
          created_at,
          updated_at
        `)
        .single();

    if (saveError) {
      throw new Error(saveError.message);
    }

    if (action === "submit") {
      await stopRunningLabour(
        auth.supabase,
        jobId,
        auth.fullName,
        now,
      );

      await updateAssignment(
        auth.supabase,
        assignment.id,
        {
          assignment_status: "completed",
          updated_at: now.toISOString(),
        },
      );

      /*
       * The technician's work is complete, but invoice_status
       * is deliberately not changed here. Office approval will
       * later mark the job ready for invoicing.
       */
      await updateJob(auth.supabase, jobId, {
        status: "completed",
        engineer_name: auth.fullName,
        diagnosis,
        work_carried_out: workCarriedOut,
        completed_date: now
          .toISOString()
          .slice(0, 10),
        updated_at: now.toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        action === "submit"
          ? "Job submitted for office review."
          : "Completion draft saved.",
      completion: mapCompletion(
        savedCompletion as CompletionRow,
      ),
    });
  } catch (error) {
    console.error(
      "POST technician job completion error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save job completion.",
      },
      { status: 500 },
    );
  }
}

async function getAccessibleAssignment(
  supabase: Awaited<
    ReturnType<typeof getTechnicianAuth>
  >["supabase"],
  jobId: string,
  userId: string,
  isManager: boolean,
): Promise<AssignmentRow | null> {
  let query = supabase
    .from("job_assignments")
    .select(`
      id,
      job_id,
      user_id,
      assignment_status
    `)
    .eq("job_id", jobId)
    .neq("assignment_status", "cancelled");

  if (!isManager) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query
    .order("scheduled_start", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AssignmentRow | null;
}

async function loadExistingCompletion(
  supabase: Awaited<
    ReturnType<typeof getTechnicianAuth>
  >["supabase"],
  jobId: string,
): Promise<CompletionRow | null> {
  const { data, error } = await supabase
    .from("job_completions")
    .select(`
      id,
      job_id,
      assignment_id,
      submitted_by,
      technician_name,
      diagnosis,
      work_carried_out,
      customer_name,
      customer_position,
      customer_confirmation,
      signature_data_url,
      signature_storage_path,
      machine_tested,
      guards_fitted,
      area_left_tidy,
      customer_instructed,
      photos_checked,
      parts_checked,
      labour_checked,
      technician_notes,
      office_notes,
      rejection_reason,
      status,
      submitted_at,
      reviewed_at,
      approved_at,
      rejected_at,
      created_at,
      updated_at
    `)
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as CompletionRow | null;
}

async function updateAssignment(
  supabase: Awaited<
    ReturnType<typeof getTechnicianAuth>
  >["supabase"],
  assignmentId: string,
  updates: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("job_assignments")
    .update(updates)
    .eq("id", assignmentId);

  if (error) {
    throw new Error(error.message);
  }
}

async function updateJob(
  supabase: Awaited<
    ReturnType<typeof getTechnicianAuth>
  >["supabase"],
  jobId: string,
  updates: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }
}

async function stopRunningLabour(
  supabase: Awaited<
    ReturnType<typeof getTechnicianAuth>
  >["supabase"],
  jobId: string,
  engineerName: string,
  finishedAt: Date,
) {
  const { data: running, error } =
    await supabase
      .from("job_labour_entries")
      .select(
        "id,start_time,break_minutes",
      )
      .eq("job_id", jobId)
      .eq("engineer_name", engineerName)
      .eq("entry_status", "running")
      .order("start_time", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!running?.start_time) {
    return false;
  }

  const start = new Date(running.start_time);
  const breakMinutes = Number(
    running.break_minutes ?? 0,
  );

  const elapsedHours =
    (finishedAt.getTime() - start.getTime()) /
      3_600_000 -
    breakMinutes / 60;

  const hours = Math.max(0, elapsedHours);

  const { error: updateError } =
    await supabase
      .from("job_labour_entries")
      .update({
        finish_time: finishedAt.toISOString(),
        hours: Number(hours.toFixed(2)),
        entry_status: "completed",
        updated_at: finishedAt.toISOString(),
      })
      .eq("id", running.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return true;
}

function validateSubmission(values: {
  diagnosis: string;
  workCarriedOut: string;
  customerName: string;
  customerConfirmation: boolean;
  signatureDataUrl: string | null;
  signatureStoragePath: string | null;
  machineTested: boolean;
  guardsFitted: boolean;
  areaLeftTidy: boolean;
  photosChecked: boolean;
  partsChecked: boolean;
  labourChecked: boolean;
}) {
  if (!values.diagnosis) {
    return "Enter the job diagnosis before submitting.";
  }

  if (!values.workCarriedOut) {
    return "Enter the work carried out before submitting.";
  }

  if (!values.customerName) {
    return "Enter the name of the customer signing the job.";
  }

  if (!values.customerConfirmation) {
    return "The customer must confirm the work completion statement.";
  }

  if (
    !values.signatureDataUrl &&
    !values.signatureStoragePath
  ) {
    return "A customer signature is required.";
  }

  if (!values.machineTested) {
    return "Confirm that the machine was tested.";
  }

  if (!values.guardsFitted) {
    return "Confirm that all guards were refitted.";
  }

  if (!values.areaLeftTidy) {
    return "Confirm that the work area was left tidy.";
  }

  if (!values.photosChecked) {
    return "Confirm that the job photos were reviewed.";
  }

  if (!values.partsChecked) {
    return "Confirm that the parts used were reviewed.";
  }

  if (!values.labourChecked) {
    return "Confirm that the labour entries were reviewed.";
  }

  return "";
}

function cleanText(
  value: string | null | undefined,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanNullableText(
  value: string | null | undefined,
) {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function mapCompletion(row: CompletionRow) {
  return {
    id: row.id,
    jobId: row.job_id,
    assignmentId: row.assignment_id,
    submittedBy: row.submitted_by,
    technicianName: row.technician_name,

    diagnosis: row.diagnosis,
    workCarriedOut: row.work_carried_out,

    customerName: row.customer_name,
    customerPosition: row.customer_position,
    customerConfirmation:
      row.customer_confirmation,

    signatureDataUrl: row.signature_data_url,
    signatureStoragePath:
      row.signature_storage_path,

    machineTested: row.machine_tested,
    guardsFitted: row.guards_fitted,
    areaLeftTidy: row.area_left_tidy,
    customerInstructed:
      row.customer_instructed,
    photosChecked: row.photos_checked,
    partsChecked: row.parts_checked,
    labourChecked: row.labour_checked,

    technicianNotes: row.technician_notes,
    officeNotes: row.office_notes,
    rejectionReason: row.rejection_reason,

    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}