import { NextResponse } from "next/server";

import {
  getOfficeAuth,
  normaliseStatus,
} from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CompletionQueueRow = {
  id: string;
  job_id: string;
  technician_name: string;
  status: string;
  submitted_at: string | null;
};

type JobRow = {
  id: string;
  job_number: string;
  status: string;
  priority: string;
  fault_reported: string;
  invoice_status: string;
  customer_id: string | null;
  machine_id: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
};

type MachineRow = {
  id: string;
  make: string;
  model: string;
  registration: string;
  serial_number: string;
  machine_hours: number | null;
};

export async function GET() {
  try {
    const auth = await getOfficeAuth();

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
        { error: auth.error },
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

    const { data: completionRows, error } =
      await auth.supabase
        .from("job_completions")
        .select(`
          id,
          job_id,
          technician_name,
          status,
          submitted_at
        `)
        .in("status", [
          "submitted",
          "approved",
          "rejected",
        ])
        .order("submitted_at", {
          ascending: false,
          nullsFirst: false,
        });

    if (error) {
      throw new Error(error.message);
    }

    const completions =
      (completionRows ??
        []) as CompletionQueueRow[];

    if (completions.length === 0) {
      return NextResponse.json({
        reviewer: {
          id: auth.user.id,
          fullName: auth.fullName,
          email: auth.user.email ?? "",
          role: auth.role,
        },
        counts: {
          submitted: 0,
          approved: 0,
          rejected: 0,
        },
        completions: [],
      });
    }

    const jobIds = Array.from(
      new Set(
        completions.map(
          (completion) => completion.job_id,
        ),
      ),
    );

    const { data: jobRows, error: jobsError } =
      await auth.supabase
        .from("jobs")
        .select(`
          id,
          job_number,
          status,
          priority,
          fault_reported,
          invoice_status,
          customer_id,
          machine_id
        `)
        .in("id", jobIds);

    if (jobsError) {
      throw new Error(jobsError.message);
    }

    const jobs = (jobRows ?? []) as JobRow[];

    const customerIds = Array.from(
      new Set(
        jobs
          .map((job) => job.customer_id)
          .filter(
            (id): id is string =>
              typeof id === "string" &&
              Boolean(id),
          ),
      ),
    );

    const machineIds = Array.from(
      new Set(
        jobs
          .map((job) => job.machine_id)
          .filter(
            (id): id is string =>
              typeof id === "string" &&
              Boolean(id),
          ),
      ),
    );

    const [
      customerResult,
      machineResult,
    ] = await Promise.all([
      customerIds.length
        ? auth.supabase
            .from("customers")
            .select(`
              id,
              name,
              contact_name,
              phone,
              email
            `)
            .in("id", customerIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      machineIds.length
        ? auth.supabase
            .from("machines")
            .select(`
              id,
              make,
              model,
              registration,
              serial_number,
              machine_hours
            `)
            .in("id", machineIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (customerResult.error) {
      throw new Error(
        customerResult.error.message,
      );
    }

    if (machineResult.error) {
      throw new Error(
        machineResult.error.message,
      );
    }

    const customers =
      (customerResult.data ??
        []) as CustomerRow[];

    const machines =
      (machineResult.data ??
        []) as MachineRow[];

    const jobMap = new Map(
      jobs.map((job) => [job.id, job]),
    );

    const customerMap = new Map(
      customers.map((customer) => [
        customer.id,
        customer,
      ]),
    );

    const machineMap = new Map(
      machines.map((machine) => [
        machine.id,
        machine,
      ]),
    );

    const queueItems = completions
      .map((completion) => {
        const job = jobMap.get(
          completion.job_id,
        );

        if (!job) {
          return null;
        }

        const customer = job.customer_id
          ? customerMap.get(job.customer_id) ??
            null
          : null;

        const machine = job.machine_id
          ? machineMap.get(job.machine_id) ??
            null
          : null;

        return {
          completionId: completion.id,
          jobId: job.id,
          jobNumber: job.job_number,

          jobStatus: job.status,
          priority: job.priority,
          faultReported:
            job.fault_reported,
          invoiceStatus:
            job.invoice_status,

          technicianName:
            completion.technician_name,
          submittedAt:
            completion.submitted_at,

          customer: customer
            ? {
                id: customer.id,
                name: customer.name,
                contactName:
                  customer.contact_name,
                phone: customer.phone,
                email: customer.email,
              }
            : null,

          machine: machine
            ? {
                id: machine.id,
                displayName:
                  buildMachineName(machine),
                registration:
                  machine.registration,
                serialNumber:
                  machine.serial_number,
                machineHours:
                  machine.machine_hours,
              }
            : null,
        };
      })
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > => item !== null,
      );

    const counts = completions.reduce(
      (totals, completion) => {
        const status = normaliseStatus(
          completion.status,
        );

        if (status === "submitted") {
          totals.submitted += 1;
        }

        if (status === "approved") {
          totals.approved += 1;
        }

        if (status === "rejected") {
          totals.rejected += 1;
        }

        return totals;
      },
      {
        submitted: 0,
        approved: 0,
        rejected: 0,
      },
    );

    return NextResponse.json({
      reviewer: {
        id: auth.user.id,
        fullName: auth.fullName,
        email: auth.user.email ?? "",
        role: auth.role,
      },
      counts,
      completions: queueItems,
    });
  } catch (error) {
    console.error(
      "GET office completions queue error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load job completions.",
      },
      { status: 500 },
    );
  }
}

function buildMachineName(
  machine: MachineRow,
) {
  const displayName = [
    machine.make,
    machine.model,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return displayName || "Machine";
}