import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";

import { getOfficeAuth } from "../office/_shared";

type NewInvoiceItem = {
  itemType?: string;
  sourceId?: string | null;
  description?: string;
  quantity?: number;
  unitPrice?: number;
};

type CreateInvoiceBody = {
  jobId?: string | null;
  customerId?: string | null;

  issueDate?: string | null;
  dueDate?: string | null;

  vatRate?: number;

  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: string;

  notes?: string;
  paymentTerms?: string;

  items?: NewInvoiceItem[];
};

const VALID_ITEM_TYPES = new Set([
  "labour",
  "part",
  "callout",
  "travel",
  "other",
]);

function asMoney(value: unknown): number {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.round(numberValue * 100) / 100;
}

function asText(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(
  date: Date,
  numberOfDays: number,
): Date {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + numberOfDays,
  );

  return result;
}

function generateInvoiceNumber(): string {
  const now = new Date();

  const year = now.getUTCFullYear();

  const month = String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    now.getUTCDate(),
  ).padStart(2, "0");

  const time = String(
    now.getTime(),
  ).slice(-6);

  const random = Math.floor(
    Math.random() * 90 + 10,
  );

  return `INV-${year}${month}${day}-${time}${random}`;
}

export async function GET(
  request: NextRequest,
) {
  const moduleGate = await requireApiModule("invoices");
  if (moduleGate) return moduleGate;

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
          "You do not have permission to view invoices.",
      },
      { status: 403 },
    );
  }

  const searchParams =
    request.nextUrl.searchParams;

  const status =
    searchParams.get("status")?.trim() ?? "";

  const customerId =
    searchParams.get("customerId")?.trim() ??
    "";

  const jobId =
    searchParams.get("jobId")?.trim() ?? "";

  let query = auth.supabase
    .from("invoices")
    .select(
      `
        id,
        invoice_number,
        job_id,
        customer_id,
        status,
        issue_date,
        due_date,
        subtotal,
        vat_rate,
        vat_amount,
        total,
        amount_paid,
        customer_name,
        customer_email,
        customer_phone,
        billing_address,
        notes,
        payment_terms,
        stripe_payment_url,
        sent_at,
        paid_at,
        created_at,
        updated_at
      `,
    )
    .eq("company_id", auth.companyId)
    .order("created_at", {
      ascending: false,
    });

  if (status) {
    query = query.eq("status", status);
  }

  if (customerId) {
    query = query.eq(
      "customer_id",
      customerId,
    );
  }

  if (jobId) {
    query = query.eq("job_id", jobId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      invoices: data ?? [],
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
) {
  const moduleGate = await requireApiModule("invoices");
  if (moduleGate) return moduleGate;

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

  let body: CreateInvoiceBody;

  try {
    body =
      (await request.json()) as CreateInvoiceBody;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const suppliedItems = Array.isArray(
    body.items,
  )
    ? body.items
    : [];

  const items = suppliedItems
    .map((item, index) => {
      const description = asText(
        item.description,
      );

      const quantity = Math.max(
        0,
        asMoney(item.quantity ?? 1),
      );

      const unitPrice = Math.max(
        0,
        asMoney(item.unitPrice ?? 0),
      );

      const lineTotal = asMoney(
        quantity * unitPrice,
      );

      const suppliedType = asText(
        item.itemType,
        "other",
      ).toLowerCase();

      const itemType =
        VALID_ITEM_TYPES.has(suppliedType)
          ? suppliedType
          : "other";

      return {
        item_type: itemType,
        source_id:
          typeof item.sourceId === "string" &&
          item.sourceId.trim()
            ? item.sourceId.trim()
            : null,
        description,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        sort_order: index,
      };
    })
    .filter((item) => item.description);

  const subtotal = asMoney(
    items.reduce(
      (sum, item) =>
        sum + item.line_total,
      0,
    ),
  );

  const vatRate = Math.max(
    0,
    asMoney(body.vatRate ?? 20),
  );

  const vatAmount = asMoney(
    subtotal * (vatRate / 100),
  );

  const total = asMoney(
    subtotal + vatAmount,
  );

  const today = new Date();

  const issueDate =
    asText(body.issueDate) ||
    dateOnly(today);

  const dueDate =
    asText(body.dueDate) ||
    dateOnly(addDays(today, 7));

  const invoiceNumber =
    generateInvoiceNumber();

  const jobId = asText(body.jobId) || null;
  const customerId =
    asText(body.customerId) || null;

  if (jobId) {
    const { data: job, error: jobError } =
      await auth.supabase
        .from("jobs")
        .select("id, customer_id")
        .eq("id", jobId)
        .eq("company_id", auth.companyId)
        .maybeSingle();

    if (jobError) {
      return NextResponse.json(
        { error: jobError.message },
        { status: 500 },
      );
    }

    if (!job) {
      return NextResponse.json(
        {
          error:
            "The selected job does not belong to the active company.",
        },
        { status: 404 },
      );
    }

    if (
      customerId &&
      job.customer_id &&
      job.customer_id !== customerId
    ) {
      return NextResponse.json(
        {
          error:
            "The selected customer does not match the selected job.",
        },
        { status: 400 },
      );
    }
  }

  if (customerId) {
    const {
      data: customer,
      error: customerError,
    } = await auth.supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("company_id", auth.companyId)
      .maybeSingle();

    if (customerError) {
      return NextResponse.json(
        { error: customerError.message },
        { status: 500 },
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "The selected customer does not belong to the active company.",
        },
        { status: 404 },
      );
    }
  }

  const invoiceInsert = {
    company_id: auth.companyId,
    invoice_number: invoiceNumber,

    job_id: jobId,

    customer_id: customerId,

    status: "draft",

    issue_date: issueDate,
    due_date: dueDate,

    subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total,
    amount_paid: 0,

    customer_name: asText(
      body.customerName,
    ),

    customer_email: asText(
      body.customerEmail,
    ),

    customer_phone: asText(
      body.customerPhone,
    ),

    billing_address: asText(
      body.billingAddress,
    ),

    notes: asText(body.notes),

    payment_terms:
      asText(body.paymentTerms) ||
      "Payment due within 7 days",

    created_by: auth.user.id,
  };

  const {
    data: invoice,
    error: invoiceError,
  } = await auth.supabase
    .from("invoices")
    .insert(invoiceInsert)
    .select()
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json(
      {
        error:
          invoiceError?.message ??
          "Unable to create invoice.",
      },
      { status: 500 },
    );
  }

  if (items.length > 0) {
    const itemRows = items.map((item) => ({
      ...item,
      company_id: auth.companyId,
      invoice_id: invoice.id,
    }));

    const {
      data: insertedItems,
      error: itemError,
    } = await auth.supabase
      .from("invoice_items")
      .insert(itemRows)
      .select();

    if (itemError) {
      // Prevent an incomplete invoice being left
      // behind if its line items fail.
      await auth.supabase
        .from("invoices")
        .delete()
        .eq("id", invoice.id)
        .eq("company_id", auth.companyId);

      return NextResponse.json(
        {
          error: itemError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        invoice: {
          ...invoice,
          items: insertedItems ?? [],
        },
      },
      { status: 201 },
    );
  }

  return NextResponse.json(
    {
      invoice: {
        ...invoice,
        items: [],
      },
    },
    { status: 201 },
  );
}