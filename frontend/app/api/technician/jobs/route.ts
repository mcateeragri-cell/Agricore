import { NextRequest, NextResponse } from "next/server";

import type {
  TechnicianDashboardJob,
  TechnicianDashboardResponse,
} from "@/types/technician";

import {
  dateRange,
  formatDateInput,
  getTechnicianAuth,
} from "../_shared";

type RawAssignment = {
  id: string;
  job_id: string;
  user_id: string;
  assignment_status: string | null;
  notes: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  jobs: RawJob | RawJob[] | null;
};

type RawJob = {
  id: string;
  job_number: string | null;
  customer_id: string | null;
  machine_id: string | null;
  engineer_name: string | null;
  status: string | null;
  priority: string | null;
  fault_reported: string | null;
};

type RawCustomer = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
};

type RawMachine = {
  id: string;
  make: string | null;
  model: string | null;
  registration: string | null;
  serial_number: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await getTechnicianAuth();

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const selectedDate =
      request.nextUrl.searchParams.get("date") ?? formatDateInput(new Date());

    const { start, end } = dateRange(selectedDate);

    let query = auth.supabase
      .from("job_assignments")
      .select(`
        id,
        job_id,
        user_id,
        assignment_status,
        notes,
        scheduled_start,
        scheduled_end,
        jobs (
          id,
          job_number,
          customer_id,
          machine_id,
          engineer_name,
          status,
          priority,
          fault_reported
        )
      `)
      .eq("company_id", auth.companyId)
      .gte("scheduled_start", start)
      .lt("scheduled_start", end)
      .neq("assignment_status", "cancelled")
      .order("scheduled_start", { ascending: true });

    if (!auth.isManager) {
      query = query.eq("user_id", auth.user.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const assignments = (data ?? []) as unknown as RawAssignment[];
    const jobs = await Promise.all(
      assignments.map((assignment) =>
        mapAssignment(
          auth.supabase,
          assignment,
          auth.companyId,
        ),
      ),
    );

    const response: TechnicianDashboardResponse = {
      date: selectedDate,
      technician: {
        id: auth.user.id,
        fullName: auth.fullName,
        email: auth.user.email ?? "",
      },
      jobs: jobs.filter((job): job is TechnicianDashboardJob => job !== null),
    };

    return NextResponse.json(
      response,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Technician dashboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load technician jobs." },
      { status: 500 },
    );
  }
}

async function mapAssignment(
  supabase: Awaited<ReturnType<typeof getTechnicianAuth>>["supabase"],
  assignment: RawAssignment,
  companyId: string,
): Promise<TechnicianDashboardJob | null> {
  const job = Array.isArray(assignment.jobs)
    ? assignment.jobs[0] ?? null
    : assignment.jobs;

  if (!job) return null;

  const [customerResult, machineResult] = await Promise.all([
    job.customer_id
      ? supabase
          .from("customers")
          .select("id,business_name,contact_name,phone,email")
          .eq("id", job.customer_id)
          .eq("company_id", companyId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    job.machine_id
      ? supabase
          .from("machines")
          .select("id,make,model,registration,serial_number")
          .eq("id", job.machine_id)
          .eq("company_id", companyId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const customer = customerResult.data as RawCustomer | null;
  const machine = machineResult.data as RawMachine | null;

  return {
    assignmentId: assignment.id,
    assignmentStatus: assignment.assignment_status ?? "scheduled",
    assignmentNotes: assignment.notes ?? "",
    scheduledStart: assignment.scheduled_start ?? new Date().toISOString(),
    scheduledEnd:
      assignment.scheduled_end ??
      new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    jobId: job.id,
    jobNumber: job.job_number ?? "Job number pending",
    status: job.status ?? "open",
    priority: job.priority ?? "normal",
    faultReported: job.fault_reported ?? "",
    engineerName: job.engineer_name ?? "",
    customer: customer
      ? {
          id: customer.id,
          name: customer.business_name ?? customer.contact_name ?? "Customer not recorded",
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
  };
}