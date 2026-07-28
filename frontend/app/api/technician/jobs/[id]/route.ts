import { NextRequest, NextResponse } from "next/server";

import type {
  TechnicianJobActionRequest,
  TechnicianJobDetailResponse,
  TechnicianLabourEntry,
} from "@/types/technician";

import { getTechnicianAuth, normaliseStatus } from "../../_shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AssignmentRow = {
  id: string;
  job_id: string;
  user_id: string;
  assignment_status: string | null;
  notes: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
};

type JobRow = {
  id: string;
  job_number: string | null;
  customer_id: string | null;
  machine_id: string | null;
  status: string | null;
  priority: string | null;
  fault_reported: string | null;
  diagnosis: string | null;
  work_carried_out: string | null;
  internal_notes: string | null;
  machine_hours: number | null;
};

type LabourRow = {
  id: string;
  engineer_name: string | null;
  labour_date: string | null;
  start_time: string | null;
  finish_time: string | null;
  hours: number | null;
  hourly_rate: number | null;
  description: string | null;
  entry_status: string | null;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await getTechnicianAuth();

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: 500 });
    }

    const assignment = await getAccessibleAssignment(
      auth.supabase,
      id,
      auth.user.id,
      auth.isManager,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this job." },
        { status: 403 },
      );
    }

    const { data: jobData, error: jobError } = await auth.supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        customer_id,
        machine_id,
        status,
        priority,
        fault_reported,
        diagnosis,
        work_carried_out,
        internal_notes,
        machine_hours
      `)
      .eq("id", id)
      .maybeSingle();

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }
    if (!jobData) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const job = jobData as JobRow;
    const [customerResult, machineResult, labourResult] = await Promise.all([
      job.customer_id
        ? auth.supabase
            .from("customers")
            .select("id,business_name,contact_name,phone,email")
            .eq("id", job.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      job.machine_id
        ? auth.supabase
            .from("machines")
            .select("id,make,model,registration,serial_number")
            .eq("id", job.machine_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      auth.supabase
        .from("job_labour_entries")
        .select(`
          id,
          engineer_name,
          labour_date,
          start_time,
          finish_time,
          hours,
          hourly_rate,
          description,
          entry_status
        `)
        .eq("job_id", id)
        .order("start_time", { ascending: false }),
    ]);

    const relatedError =
      customerResult.error ?? machineResult.error ?? labourResult.error;
    if (relatedError) {
      return NextResponse.json({ error: relatedError.message }, { status: 500 });
    }

    const customer = customerResult.data as {
      id: string;
      business_name: string | null;
      contact_name: string | null;
      phone: string | null;
      email: string | null;
    } | null;

    const machine = machineResult.data as {
      id: string;
      make: string | null;
      model: string | null;
      registration: string | null;
      serial_number: string | null;
    } | null;

    const labourEntries = ((labourResult.data ?? []) as LabourRow[]).map(
      mapLabourEntry,
    );

    const response: TechnicianJobDetailResponse = {
      technician: {
        id: auth.user.id,
        fullName: auth.fullName,
        email: auth.user.email ?? "",
      },
      assignment: {
        id: assignment.id,
        status: assignment.assignment_status ?? "scheduled",
        notes: assignment.notes ?? "",
        scheduledStart: assignment.scheduled_start ?? new Date().toISOString(),
        scheduledEnd:
          assignment.scheduled_end ??
          new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      job: {
        id: job.id,
        jobNumber: job.job_number ?? "Job number pending",
        status: job.status ?? "open",
        priority: job.priority ?? "normal",
        faultReported: job.fault_reported ?? "",
        diagnosis: job.diagnosis ?? "",
        workCarriedOut: job.work_carried_out ?? "",
        internalNotes: job.internal_notes ?? "",
        machineHours: job.machine_hours,
      },
      customer: customer
        ? {
            id: customer.id,
            name:
              customer.business_name ??
              customer.contact_name ??
              "Customer not recorded",
            contactName: customer.contact_name ?? "",
            phone: customer.phone ?? "",
            email: customer.email ?? "",
          }
        : null,
      machine: machine
        ? {
            id: machine.id,
            displayName:
              [machine.make, machine.model].filter(Boolean).join(" ").trim() ||
              "Machine not recorded",
            registration: machine.registration ?? "",
            serialNumber: machine.serial_number ?? "",
          }
        : null,
      runningLabour:
        labourEntries.find(
          (entry) =>
            normaliseStatus(entry.entryStatus) === "running" &&
            entry.engineerName === auth.fullName,
        ) ?? null,
      labourEntries,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET technician job error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load job." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await getTechnicianAuth();

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: 500 });
    }

    const assignment = await getAccessibleAssignment(
      auth.supabase,
      id,
      auth.user.id,
      auth.isManager,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this job." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as TechnicianJobActionRequest;
    const now = new Date();

    switch (body.action) {
      case "start_travel":
        await updateAssignment(auth.supabase, assignment.id, {
          assignment_status: "travelling",
          updated_at: now.toISOString(),
        });
        return NextResponse.json({ message: "Travel started." });

      case "arrive_on_site":
        await updateAssignment(auth.supabase, assignment.id, {
          assignment_status: "confirmed",
          updated_at: now.toISOString(),
        });
        return NextResponse.json({ message: "Arrival recorded." });

      case "start_labour": {
        const { data: running, error: runningError } = await auth.supabase
          .from("job_labour_entries")
          .select("id")
          .eq("job_id", id)
          .eq("engineer_name", auth.fullName)
          .eq("entry_status", "running")
          .limit(1)
          .maybeSingle();

        if (runningError) throw new Error(runningError.message);
        if (running) {
          return NextResponse.json(
            { error: "A labour timer is already running for this job." },
            { status: 409 },
          );
        }

        const { error } = await auth.supabase
          .from("job_labour_entries")
          .insert({
            job_id: id,
            engineer_name: auth.fullName,
            labour_date: now.toISOString().slice(0, 10),
            start_time: now.toISOString(),
            finish_time: null,
            hours: null,
            description: body.description?.trim() || "Workshop labour",
            entry_status: "running",
          });

        if (error) throw new Error(error.message);

        await updateAssignment(auth.supabase, assignment.id, {
          assignment_status: "in_progress",
          updated_at: now.toISOString(),
        });
        await updateJob(auth.supabase, id, {
          status: "in_progress",
          engineer_name: auth.fullName,
          updated_at: now.toISOString(),
        });

        return NextResponse.json({ message: "Labour timer started." });
      }

      case "stop_labour": {
        const stopped = await stopRunningLabour(
          auth.supabase,
          id,
          auth.fullName,
          now,
        );

        if (!stopped) {
          return NextResponse.json(
            { error: "No active labour timer was found." },
            { status: 404 },
          );
        }

        return NextResponse.json({ message: "Labour timer stopped." });
      }

      case "complete_job": {
        const diagnosis = body.diagnosis?.trim() ?? "";
        const workCarriedOut = body.workCarriedOut?.trim() ?? "";

        if (!diagnosis || !workCarriedOut) {
          return NextResponse.json(
            { error: "Diagnosis and work carried out are required." },
            { status: 400 },
          );
        }

        await stopRunningLabour(auth.supabase, id, auth.fullName, now);
        await updateAssignment(auth.supabase, assignment.id, {
          assignment_status: "completed",
          updated_at: now.toISOString(),
        });
        await updateJob(auth.supabase, id, {
          status: "completed",
          engineer_name: auth.fullName,
          diagnosis,
          work_carried_out: workCarriedOut,
          completed_date: now.toISOString().slice(0, 10),
          invoice_status: "ready",
          updated_at: now.toISOString(),
        });

        return NextResponse.json({
          message: "Job completed and marked ready for invoicing.",
        });
      }

      default:
        return NextResponse.json(
          { error: "Unsupported technician action." },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("PATCH technician job error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update job." },
      { status: 500 },
    );
  }
}

async function getAccessibleAssignment(
  supabase: Awaited<ReturnType<typeof getTechnicianAuth>>["supabase"],
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
      assignment_status,
      notes,
      scheduled_start,
      scheduled_end
    `)
    .eq("job_id", jobId)
    .neq("assignment_status", "cancelled");

  if (!isManager) query = query.eq("user_id", userId);

  const { data, error } = await query
    .order("scheduled_start", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as AssignmentRow | null;
}

async function updateAssignment(
  supabase: Awaited<ReturnType<typeof getTechnicianAuth>>["supabase"],
  assignmentId: string,
  updates: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("job_assignments")
    .update(updates)
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);
}

async function updateJob(
  supabase: Awaited<ReturnType<typeof getTechnicianAuth>>["supabase"],
  jobId: string,
  updates: Record<string, unknown>,
) {
  const { error } = await supabase.from("jobs").update(updates).eq("id", jobId);
  if (error) throw new Error(error.message);
}

async function stopRunningLabour(
  supabase: Awaited<ReturnType<typeof getTechnicianAuth>>["supabase"],
  jobId: string,
  engineerName: string,
  finishedAt: Date,
) {
  const { data: running, error } = await supabase
    .from("job_labour_entries")
    .select("id,start_time,break_minutes")
    .eq("job_id", jobId)
    .eq("engineer_name", engineerName)
    .eq("entry_status", "running")
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!running?.start_time) return false;

  const start = new Date(running.start_time);
  const breakMinutes = Number(running.break_minutes ?? 0);
  const elapsedHours =
    (finishedAt.getTime() - start.getTime()) / 3_600_000 - breakMinutes / 60;
  const hours = Math.max(0, elapsedHours);

  const { error: updateError } = await supabase
    .from("job_labour_entries")
    .update({
      finish_time: finishedAt.toISOString(),
      hours: Number(hours.toFixed(2)),
      entry_status: "completed",
      updated_at: finishedAt.toISOString(),
    })
    .eq("id", running.id);

  if (updateError) throw new Error(updateError.message);
  return true;
}

function mapLabourEntry(row: LabourRow): TechnicianLabourEntry {
  return {
    id: row.id,
    engineerName: row.engineer_name ?? "",
    labourDate: row.labour_date ?? "",
    startTime: row.start_time ?? "",
    finishTime: row.finish_time ?? "",
    hours: row.hours,
    hourlyRate: row.hourly_rate ?? 0,
    description: row.description ?? "",
    entryStatus: row.entry_status ?? "completed",
  };
}