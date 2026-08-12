import { NextRequest, NextResponse } from "next/server";

import {
  getOfficeAuth,
  normaliseStatus,
} from "../../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

type CreateInvoiceBody = {
  vatRate?: number;
  paymentTerms?: string;
  dueInDays?: number;
  includeZeroValueWorkDescription?: boolean;
};

type JobRow = {
  id: string;
  job_number: string;
  status: string;
  invoice_status: string | null;
  customer_id: string | null;
  machine_id: string | null;
  fault_reported: string | null;
  diagnosis: string | null;
  work_carried_out: string | null;
  machine_hours: number | null;
};

type CustomerRow = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postcode: string | null;
};

type MachineRow = {
  id: string;
  make: string | null;
  model: string | null;
  registration: string | null;
  serial_number: string | null;
};

type CompletionRow = {
  id: string;
  job_id: string;
  status: string;
  diagnosis: string | null;
  work_carried_out: string | null;
  technician_name: string | null;
  customer_name: string | null;
  approved_at: string | null;
};

type LabourRow = {
  id: string;
  engineer_name: string | null;
  labour_date: string | null;
  start_time: string | null;
  finish_time: string | null;
  hours: number | string | null;
  hourly_rate: number | string | null;
  description: string | null;
  entry_status: string | null;
};

type PartRow = {
  id: string;
  part_number: string | null;
  description: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  notes: string | null;
};

type InvoiceItemInsert = {
  invoice_id?: string;
  item_type:
    | "labour"
    | "part"
    | "callout"
    | "travel"
    | "other";
  source_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { jobId } = await context.params;
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

    if (!auth.canReview) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to create invoices.",
        },
        { status: 403 },
      );
    }

    if (!jobId) {
      return NextResponse.json(
        {
          error: "Job ID is required.",
        },
        { status: 400 },
      );
    }

    let body: CreateInvoiceBody = {};

    try {
      const rawBody = await request.text();

      if (rawBody.trim()) {
        body = JSON.parse(
          rawBody,
        ) as CreateInvoiceBody;
      }
    } catch {
      return NextResponse.json(
        {
          error:
            "The request body is not valid JSON.",
        },
        { status: 400 },
      );
    }

    const {
      data: existingInvoice,
      error: existingInvoiceError,
    } = await auth.supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        status,
        total
      `)
      .eq("job_id", jobId)
      .eq("company_id", auth.companyId)
      .neq("status", "void")
      .maybeSingle();

    if (existingInvoiceError) {
      throw new Error(
        existingInvoiceError.message,
      );
    }

    if (existingInvoice) {
      return NextResponse.json(
        {
          error:
            "An invoice already exists for this job.",
          invoice: existingInvoice,
        },
        { status: 409 },
      );
    }

    const {
      data: jobData,
      error: jobError,
    } = await auth.supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        status,
        invoice_status,
        customer_id,
        machine_id,
        fault_reported,
        diagnosis,
        work_carried_out,
        machine_hours
      `)
      .eq("id", jobId)
      .eq("company_id", auth.companyId)
      .maybeSingle();

    if (jobError) {
      throw new Error(jobError.message);
    }

    if (!jobData) {
      return NextResponse.json(
        {
          error: "Job was not found.",
        },
        { status: 404 },
      );
    }

    const job = jobData as JobRow;

    if (
      normaliseStatus(job.status) !==
      "completed"
    ) {
      return NextResponse.json(
        {
          error:
            "Only completed jobs can be invoiced.",
        },
        { status: 409 },
      );
    }

    if (
      normaliseStatus(job.invoice_status) !==
      "ready"
    ) {
      return NextResponse.json(
        {
          error:
            "This job is not marked as ready for invoicing.",
        },
        { status: 409 },
      );
    }

    const [
      customerResult,
      machineResult,
      completionResult,
      labourResult,
      partsResult,
    ] = await Promise.all([
      job.customer_id
        ? auth.supabase
            .from("customers")
            .select(`
              id,
              business_name,
              contact_name,
              phone,
              email,
              address,
              postcode
            `)
            .eq("id", job.customer_id)
            .eq("company_id", auth.companyId)
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          }),

      job.machine_id
        ? auth.supabase
            .from("machines")
            .select(
              "id, make, model, registration, serial_number",
            )
            .eq("id", job.machine_id)
            .eq("company_id", auth.companyId)
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          }),

      auth.supabase
        .from("job_completions")
        .select(`
          id,
          job_id,
          status,
          diagnosis,
          work_carried_out,
          technician_name,
          customer_name,
          approved_at
        `)
        .eq("job_id", jobId)
        .eq("company_id", auth.companyId)
        .eq("status", "approved")
        .order("approved_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),

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
        .eq("job_id", jobId)
        .eq("company_id", auth.companyId)
        .order("labour_date", {
          ascending: true,
        })
        .order("start_time", {
          ascending: true,
        }),

      auth.supabase
        .from("job_parts_used")
        .select(`
          id,
          part_number,
          description,
          quantity,
          unit_price,
          notes
        `)
        .eq("job_id", jobId)
        .eq("company_id", auth.companyId)
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
      throw new Error(
        machineResult.error.message,
      );
    }

    if (completionResult.error) {
      throw new Error(
        completionResult.error.message,
      );
    }

    if (labourResult.error) {
      throw new Error(
        labourResult.error.message,
      );
    }

    if (partsResult.error) {
      throw new Error(
        partsResult.error.message,
      );
    }

    const customer = customerResult.data
      ? (customerResult.data as CustomerRow)
      : null;

    const machine =
      machineResult.data as MachineRow | null;

    // Rapid job creation deliberately allows a minimal customer record so the
    // service desk can get urgent work assigned immediately. Before invoicing,
    // require the billing identity/address to be completed.
    if (!customer) {
      return NextResponse.json(
        { error: "Complete the customer record before creating an invoice." },
        { status: 409 },
      );
    }

    const missingBillingFields: string[] = [];
    if (!cleanText(customer.business_name) && !cleanText(customer.contact_name)) {
      missingBillingFields.push("customer name");
    }
    if (!cleanText(customer.address)) {
      missingBillingFields.push("billing address");
    }
    if (!cleanText(customer.postcode)) {
      missingBillingFields.push("postcode");
    }

    if (missingBillingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Customer details are incomplete. Add ${missingBillingFields.join(", ")} before creating the invoice.`,
          code: "customer_billing_details_incomplete",
          customerId: customer.id,
          missingFields: missingBillingFields,
        },
        { status: 409 },
      );
    }

    const completion = completionResult.data
      ? (completionResult.data as CompletionRow)
      : null;

    const labourEntries =
      (labourResult.data ??
        []) as LabourRow[];

    const parts =
      (partsResult.data ?? []) as PartRow[];

    const invoiceItems: InvoiceItemInsert[] =
      [];

    let sortOrder = 0;

    const workDescription =
      cleanText(
        completion?.work_carried_out,
      ) || cleanText(job.work_carried_out);

    const diagnosis =
      cleanText(completion?.diagnosis) ||
      cleanText(job.diagnosis);

    if (
      body.includeZeroValueWorkDescription !==
        false &&
      workDescription
    ) {
      invoiceItems.push({
        item_type: "other",
        source_id: completion?.id ?? null,
        description:
          `Work carried out: ${workDescription}`,
        quantity: 1,
        unit_price: 0,
        line_total: 0,
        sort_order: sortOrder++,
      });
    }

    for (const labour of labourEntries) {
      const hours = Math.max(
        0,
        safeNumber(labour.hours),
      );

      const hourlyRate = Math.max(
        0,
        safeNumber(labour.hourly_rate),
      );

      if (
        normaliseStatus(labour.entry_status) ===
          "running" ||
        hours === 0
      ) {
        continue;
      }

      const descriptionParts = [
        cleanText(labour.description) ||
          "Engineering labour",
        cleanText(labour.engineer_name)
          ? `Engineer: ${cleanText(
              labour.engineer_name,
            )}`
          : "",
        labour.labour_date
          ? `Date: ${formatDate(
              labour.labour_date,
            )}`
          : "",
      ].filter(Boolean);

      invoiceItems.push({
        item_type: "labour",
        source_id: labour.id,
        description:
          descriptionParts.join(" — "),
        quantity: hours,
        unit_price: roundMoney(hourlyRate),
        line_total: roundMoney(
          hours * hourlyRate,
        ),
        sort_order: sortOrder++,
      });
    }

    for (const part of parts) {
      const quantity = Math.max(
        0,
        safeNumber(part.quantity),
      );

      const unitPrice = Math.max(
        0,
        safeNumber(part.unit_price),
      );

      if (quantity === 0) {
        continue;
      }

      const partNumber = cleanText(
        part.part_number,
      );

      const partDescription =
        cleanText(part.description) ||
        "Part supplied";

      const description = partNumber
        ? `${partNumber} — ${partDescription}`
        : partDescription;

      invoiceItems.push({
        item_type: "part",
        source_id: part.id,
        description,
        quantity,
        unit_price: roundMoney(unitPrice),
        line_total: roundMoney(
          quantity * unitPrice,
        ),
        sort_order: sortOrder++,
      });
    }

    const hasBillableItem =
      invoiceItems.some(
        (item) => item.line_total > 0,
      );

    if (!hasBillableItem) {
      invoiceItems.push({
        item_type: "other",
        source_id: null,
        description:
          workDescription ||
          "Engineering work completed",
        quantity: 1,
        unit_price: 0,
        line_total: 0,
        sort_order: sortOrder++,
      });
    }

    const subtotal = roundMoney(
      invoiceItems.reduce(
        (total, item) =>
          total + item.line_total,
        0,
      ),
    );

    const vatRate = clampNumber(
      body.vatRate,
      0,
      100,
      20,
    );

    const vatAmount = roundMoney(
      subtotal * (vatRate / 100),
    );

    const total = roundMoney(
      subtotal + vatAmount,
    );

    const issueDate = new Date();

    const dueInDays = Math.round(
      clampNumber(
        body.dueInDays,
        0,
        365,
        7,
      ),
    );

    const dueDate = new Date(issueDate);

    dueDate.setUTCDate(
      dueDate.getUTCDate() + dueInDays,
    );

    const machineName =
      buildMachineName(machine);

    const notes = buildInvoiceNotes({
      job,
      machine,
      diagnosis,
      workDescription,
      technicianName:
        completion?.technician_name ?? "",
    });

    const {
      data: invoiceNumber,
      error: invoiceNumberError,
    } = await auth.supabase.rpc(
      "next_invoice_number",
    );

    if (
      invoiceNumberError ||
      typeof invoiceNumber !== "string" ||
      !invoiceNumber.trim()
    ) {
      throw new Error(
        invoiceNumberError?.message ??
          "Unable to generate an invoice number.",
      );
    }

    const customerDisplayName =
      cleanText(customer?.business_name) ||
      cleanText(customer?.contact_name) ||
      cleanText(completion?.customer_name);

    const {
      data: invoice,
      error: invoiceError,
    } = await auth.supabase
      .from("invoices")
      .insert({
        company_id: auth.companyId,
        invoice_number:
          invoiceNumber.trim(),
        job_id: job.id,
        customer_id: customer?.id ?? null,

        status: "draft",

        issue_date: dateOnly(issueDate),
        due_date: dateOnly(dueDate),

        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total,
        amount_paid: 0,

        customer_name:
          customerDisplayName,

        customer_email:
          customer?.email ?? "",

        customer_phone:
          customer?.phone ?? "",

        billing_address: "",

        notes,

        payment_terms:
          cleanText(body.paymentTerms) ||
          `Payment due within ${dueInDays} days`,

        created_by: auth.user.id,
      })
      .select("*")
      .single();

    if (invoiceError || !invoice) {
      throw new Error(
        invoiceError?.message ??
          "Unable to create the invoice.",
      );
    }

    const itemRows = invoiceItems.map(
      (item) => ({
        ...item,
        company_id: auth.companyId,
        invoice_id: invoice.id,
      }),
    );

    const {
      data: insertedItems,
      error: itemError,
    } = await auth.supabase
      .from("invoice_items")
      .insert(itemRows)
      .select("*");

    if (itemError) {
      await auth.supabase
        .from("invoices")
        .delete()
        .eq("id", invoice.id)
        .eq("company_id", auth.companyId);

      throw new Error(itemError.message);
    }

    const {
      error: jobUpdateError,
    } = await auth.supabase
      .from("jobs")
      .update({
        invoice_status: "draft",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("company_id", auth.companyId);

    if (jobUpdateError) {
      console.error(
        "Invoice created, but job invoice status was not updated:",
        jobUpdateError,
      );
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "Draft invoice created from the completed job.",

        invoice: {
          ...invoice,
          machineName,
          items: insertedItems ?? [],
        },
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "POST create invoice from job error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the invoice.",
      },
      { status: 500 },
    );
  }
}

function buildInvoiceNotes({
  job,
  machine,
  diagnosis,
  workDescription,
  technicianName,
}: {
  job: JobRow;
  machine: MachineRow | null;
  diagnosis: string;
  workDescription: string;
  technicianName: string;
}) {
  const sections = [
    `Job number: ${job.job_number}`,

    machine
      ? `Machine: ${buildMachineName(
          machine,
        )}`
      : "",

    machine?.registration
      ? `Registration: ${machine.registration}`
      : "",

    machine?.serial_number
      ? `Serial number: ${machine.serial_number}`
      : "",

    job.machine_hours !== null
      ? `Machine hours: ${job.machine_hours}`
      : "",

    technicianName
      ? `Engineer: ${technicianName}`
      : "",

    job.fault_reported
      ? `Fault reported: ${cleanText(
          job.fault_reported,
        )}`
      : "",

    diagnosis
      ? `Diagnosis: ${diagnosis}`
      : "",

    workDescription
      ? `Work carried out: ${workDescription}`
      : "",
  ].filter(Boolean);

  return sections.join("\n");
}

function buildMachineName(
  machine: MachineRow | null,
) {
  if (!machine) {
    return "";
  }

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

function clampNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      safeNumber(value),
    ),
  );
}

function roundMoney(
  value: number,
) {
  return Math.round(value * 100) / 100;
}

function dateOnly(
  value: Date,
) {
  return value
    .toISOString()
    .slice(0, 10);
}

function formatDate(
  value: string,
) {
  const date = new Date(
    `${value}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}