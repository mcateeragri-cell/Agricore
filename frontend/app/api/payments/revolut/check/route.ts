import { NextRequest, NextResponse } from "next/server";

import { getOfficeAuth } from "../../../office/_shared";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { retrieveRevolutOrder } from "@/lib/payments/revolut";
import { loadCompanyRevolutCredentials } from "@/lib/payments/company-settings";

type CheckPaymentBody = {
  invoiceId?: string;
};

type CheckPaymentResponse =
  | {
      success: true;
      state: string;
      isPaid: boolean;
      invoiceStatus: string;
      amountPaid: number;
      paidAt: string | null;
    }
  | {
      success: false;
      error: string;
    };

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getOfficeAuth();

    if (!auth?.user) {
      return NextResponse.json<CheckPaymentResponse>(
        {
          success: false,
          error: "Unauthorised.",
        },
        {
          status: 401,
        },
      );
    }

    const body = (await request.json()) as CheckPaymentBody;
    const invoiceId = body.invoiceId?.trim();

    if (!invoiceId) {
      return NextResponse.json<CheckPaymentResponse>(
        {
          success: false,
          error: "Invoice ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase = createSupabaseAdmin();

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        `
          id,
          status,
          total,
          amount_paid,
          paid_at,
          revolut_order_id,
          revolut_order_state
        `,
      )
      .eq("id", invoiceId)
      .eq("company_id", auth.companyId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json<CheckPaymentResponse>(
        {
          success: false,
          error: "Invoice not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (!invoice.revolut_order_id) {
      return NextResponse.json<CheckPaymentResponse>(
        {
          success: false,
          error: "This invoice does not have a Revolut payment order.",
        },
        {
          status: 409,
        },
      );
    }

    const revolut = await loadCompanyRevolutCredentials(
  supabase,
  auth.companyId,
);

const order = await retrieveRevolutOrder(
  revolut,
  invoice.revolut_order_id,
);

    const state = String(order.state ?? "").toUpperCase();
    const isPaid = state === "COMPLETED";

    const currentAmountPaid = asNumber(invoice.amount_paid);
    const invoiceTotal = asNumber(invoice.total);

    const paidAt =
      isPaid && !invoice.paid_at
        ? new Date().toISOString()
        : invoice.paid_at;

    const amountPaid = isPaid
      ? Math.max(currentAmountPaid, invoiceTotal)
      : currentAmountPaid;

    const invoiceStatus = isPaid ? "paid" : invoice.status;

    const updateValues: Record<string, unknown> = {
      revolut_order_state: state,
    };

    if (isPaid) {
      updateValues.status = "paid";
      updateValues.amount_paid = amountPaid;
      updateValues.paid_at = paidAt;
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update(updateValues)
      .eq("id", invoiceId)
      .eq("company_id", auth.companyId)
      .select("status, amount_paid, paid_at")
      .single();

    if (updateError || !updatedInvoice) {
      console.error("Failed to update invoice payment state:", updateError);

      return NextResponse.json<CheckPaymentResponse>(
        {
          success: false,
          error: "The Revolut order was checked, but the invoice could not be updated.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json<CheckPaymentResponse>(
      {
      success: true,
      state,
      isPaid,
      invoiceStatus: updatedInvoice.status,
      amountPaid: asNumber(updatedInvoice.amount_paid),
      paidAt: updatedInvoice.paid_at,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Revolut payment status check failed:", error);

    return NextResponse.json<CheckPaymentResponse>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to check the Revolut payment status.",
      },
      {
        status: 500,
      },
    );
  }
}