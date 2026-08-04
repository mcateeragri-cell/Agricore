import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getOfficeAuth } from "../../office/_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type InvoiceStatus =
  | "draft"
  | "approved"
  | "sent"
  | "part_paid"
  | "paid"
  | "overdue"
  | "void";

type InvoiceItemInput = {
  id?: string;
  itemType?: string;
  sourceId?: string | null;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  sortOrder?: number;
};

type UpdateInvoiceBody = {
  status?: InvoiceStatus;

  issueDate?: string | null;
  dueDate?: string | null;

  vatRate?: number;

  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: string;

  notes?: string;
  paymentTerms?: string;

  items?: InvoiceItemInput[];
};

const VALID_STATUSES = new Set<InvoiceStatus>([
  "draft",
  "approved",
  "sent",
  "part_paid",
  "paid",
  "overdue",
  "void",
]);

const VALID_ITEM_TYPES = new Set([
  "labour",
  "part",
  "callout",
  "travel",
  "other",
]);

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const auth = await getOfficeAuth();

    const authResponse = getAuthResponse(auth);

    if (authResponse) {
      return authResponse;
    }

    if (!id) {
      return NextResponse.json(
        {
          error: "Invoice ID is required.",
        },
        { status: 400 },
      );
    }

    const {
      data: invoice,
      error: invoiceError,
    } = await auth.supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("company_id", auth.companyId)
      .maybeSingle();

    if (invoiceError) {
      throw new Error(invoiceError.message);
    }

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Invoice was not found.",
        },
        { status: 404 },
      );
    }

    const {
      data: items,
      error: itemsError,
    } = await auth.supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .eq("company_id", auth.companyId)
      .order("sort_order", {
        ascending: true,
      });

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    let job = null;
    let machine = null;
    let customer = null;

    if (invoice.customer_id) {
      const {
        data: customerData,
        error: customerError,
      } = await auth.supabase
        .from("customers")
        .select("contact_name, business_name")
        .eq("id", invoice.customer_id)
        .eq("company_id", auth.companyId)
        .maybeSingle();

      if (customerError) {
        throw new Error(customerError.message);
      }

      customer = customerData
        ? {
            contactName:
              customerData.contact_name ?? "",
            businessName:
              customerData.business_name ?? "",
          }
        : null;
    }

    if (invoice.job_id) {
      const {
        data: jobData,
        error: jobError,
      } = await auth.supabase
        .from("jobs")
        .select(`
          id,
          job_number,
          fault_reported,
          diagnosis,
          work_carried_out,
          machine_hours,
          machine_id,
          invoice_status,
          status
        `)
        .eq("id", invoice.job_id)
        .eq("company_id", auth.companyId)
        .maybeSingle();

      if (jobError) {
        throw new Error(jobError.message);
      }

      job = jobData;

      if (jobData?.machine_id) {
        const {
          data: machineData,
          error: machineError,
        } = await auth.supabase
          .from("machines")
          .select(`
            id,
            make,
            model,
            registration,
            serial_number
          `)
          .eq("id", jobData.machine_id)
          .eq("company_id", auth.companyId)
          .maybeSingle();

        if (machineError) {
          throw new Error(
            machineError.message,
          );
        }

        machine = machineData;
      }
    }

    return NextResponse.json({
      invoice,
      items: items ?? [],
      job,
      machine,
      customer,
    });
  } catch (error) {
    console.error(
      "GET invoice detail error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load invoice.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const auth = await getOfficeAuth();

    const authResponse = getAuthResponse(auth);

    if (authResponse) {
      return authResponse;
    }

    if (!id) {
      return NextResponse.json(
        {
          error: "Invoice ID is required.",
        },
        { status: 400 },
      );
    }

    let body: UpdateInvoiceBody;

    try {
      body =
        (await request.json()) as UpdateInvoiceBody;
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
      error: existingError,
    } = await auth.supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("company_id", auth.companyId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existingInvoice) {
      return NextResponse.json(
        {
          error: "Invoice was not found.",
        },
        { status: 404 },
      );
    }

    if (
      existingInvoice.status === "paid" &&
      body.items
    ) {
      return NextResponse.json(
        {
          error:
            "Paid invoices cannot have their line items changed.",
        },
        { status: 409 },
      );
    }

    let subtotal = safeMoney(
      existingInvoice.subtotal,
    );

    const vatRate = clampNumber(
  body.vatRate,
  0,
  100,
  safeMoney(existingInvoice.vat_rate),
);

    let vatAmount = safeMoney(
      existingInvoice.vat_amount,
    );

    let total = safeMoney(
      existingInvoice.total,
    );

    let normalisedItems:
      | Array<{
          item_type: string;
          source_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          sort_order: number;
        }>
      | null = null;

    if (Array.isArray(body.items)) {
      normalisedItems = body.items
        .map((item, index) => {
          const description = cleanText(
            item.description,
          );

          const quantity = Math.max(
            0,
            safeNumber(item.quantity ?? 1),
          );

          const unitPrice = safeMoney(
            item.unitPrice,
          );

          const suppliedType = cleanText(
            item.itemType,
          ).toLowerCase();

          const itemType =
            VALID_ITEM_TYPES.has(suppliedType)
              ? suppliedType
              : "other";

          return {
            item_type: itemType,
            source_id:
              cleanText(item.sourceId) || null,
            description,
            quantity,
            unit_price: unitPrice,
            line_total: safeMoney(
              quantity * unitPrice,
            ),
            sort_order:
              typeof item.sortOrder ===
              "number"
                ? item.sortOrder
                : index,
          };
        })
        .filter(
          (item) =>
            item.description.length > 0,
        );

      subtotal = safeMoney(
        normalisedItems.reduce(
          (sum, item) =>
            sum + item.line_total,
          0,
        ),
      );

      vatAmount = safeMoney(
        subtotal * (vatRate / 100),
      );

      total = safeMoney(
        subtotal + vatAmount,
      );
    } else if (
      body.vatRate !== undefined
    ) {
      vatAmount = safeMoney(
        subtotal * (vatRate / 100),
      );

      total = safeMoney(
        subtotal + vatAmount,
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json(
          {
            error:
              "The supplied invoice status is invalid.",
          },
          { status: 400 },
        );
      }

      updateData.status = body.status;

      if (body.status === "paid") {
        updateData.amount_paid = total;
        updateData.paid_at =
          new Date().toISOString();
      }

      if (
        existingInvoice.status ===
          "paid" &&
        body.status !== "paid"
      ) {
        updateData.paid_at = null;
      }
    }

    if (body.issueDate !== undefined) {
      updateData.issue_date =
        cleanText(body.issueDate) || null;
    }

    if (body.dueDate !== undefined) {
      updateData.due_date =
        cleanText(body.dueDate) || null;
    }

    if (body.customerName !== undefined) {
      updateData.customer_name =
        cleanText(body.customerName);
    }

    if (
      body.customerEmail !== undefined
    ) {
      updateData.customer_email =
        cleanText(body.customerEmail);
    }

    if (
      body.customerPhone !== undefined
    ) {
      updateData.customer_phone =
        cleanText(body.customerPhone);
    }

    if (
      body.billingAddress !== undefined
    ) {
      updateData.billing_address =
        cleanText(body.billingAddress);
    }

    if (body.notes !== undefined) {
      updateData.notes = cleanText(
        body.notes,
      );
    }

    if (
      body.paymentTerms !== undefined
    ) {
      updateData.payment_terms =
        cleanText(body.paymentTerms);
    }

    if (normalisedItems) {
      const {
        error: deleteItemsError,
      } = await auth.supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", id)
        .eq("company_id", auth.companyId);

      if (deleteItemsError) {
        throw new Error(
          deleteItemsError.message,
        );
      }

      if (normalisedItems.length > 0) {
        const {
          error: insertItemsError,
        } = await auth.supabase
          .from("invoice_items")
          .insert(
            normalisedItems.map((item) => ({
              ...item,
              company_id: auth.companyId,
              invoice_id: id,
            })),
          );

        if (insertItemsError) {
          throw new Error(
            insertItemsError.message,
          );
        }
      }
    }

    const {
      data: updatedInvoice,
      error: updateError,
    } = await auth.supabase
      .from("invoices")
      .update(updateData)
      .eq("id", id)
      .eq("company_id", auth.companyId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const {
      data: updatedItems,
      error: updatedItemsError,
    } = await auth.supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .eq("company_id", auth.companyId)
      .order("sort_order", {
        ascending: true,
      });

    if (updatedItemsError) {
      throw new Error(
        updatedItemsError.message,
      );
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      items: updatedItems ?? [],
    });
  } catch (error) {
    console.error(
      "PATCH invoice detail error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update invoice.",
      },
      { status: 500 },
    );
  }
}

function getAuthResponse(
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

  if (!auth.canReview) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to manage invoices.",
      },
      { status: 403 },
    );
  }

  return null;
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

function safeMoney(
  value: unknown,
) {
  return (
    Math.round(safeNumber(value) * 100) /
    100
  );
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
    Math.max(minimum, safeNumber(value)),
  );
}