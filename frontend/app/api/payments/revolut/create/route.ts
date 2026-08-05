import { NextRequest, NextResponse } from "next/server";
import { getOfficeAuth } from "../../../office/_shared";
import { getAppUrl } from "@/lib/payments/config";
import { createRevolutOrder } from "@/lib/payments/revolut";
import { loadCompanyRevolutCredentials } from "@/lib/payments/company-settings";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import type { CreatePaymentLinkRequest, CreatePaymentLinkResponse, PaymentInvoiceRow } from "@/lib/payments/types";
import { asNumber, buildInvoiceReference, safeErrorMessage, toMinorUnits } from "@/lib/payments/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await getOfficeAuth();
    if (!auth.user) return NextResponse.json<CreatePaymentLinkResponse>({ success: false, error: auth.error ?? "You must be signed in." }, { status: 401 });
    if (!auth.canReview) return NextResponse.json<CreatePaymentLinkResponse>({ success: false, error: "You do not have permission to create payment links." }, { status: 403 });

    const body = await request.json() as CreatePaymentLinkRequest;
    if (!body.invoiceId?.trim()) return NextResponse.json<CreatePaymentLinkResponse>({ success: false, error: "Invoice ID is required." }, { status: 400 });

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from("invoices").select("id,invoice_number,status,total,amount_paid,customer_name,customer_email,payment_url,payment_provider,revolut_order_id,revolut_order_state,paid_at").eq("id", body.invoiceId).eq("company_id", auth.companyId).single();
    if (error || !data) return NextResponse.json<CreatePaymentLinkResponse>({ success: false, error: error?.message ?? "Invoice not found." }, { status: 404 });
    const invoice = data as PaymentInvoiceRow;

    if (invoice.status === "paid" || invoice.status === "void") return NextResponse.json<CreatePaymentLinkResponse>({ success: false, error: `A payment link cannot be created for a ${invoice.status} invoice.` }, { status: 409 });
    if (
  !body.forceNew &&
  invoice.payment_url &&
  invoice.revolut_order_id &&
  !["CANCELLED", "FAILED"].includes(invoice.revolut_order_state ?? "")
) {
  return NextResponse.json<CreatePaymentLinkResponse>(
    {
      success: true,
      paymentUrl: invoice.payment_url,
      revolutOrderId: invoice.revolut_order_id,
      state: invoice.revolut_order_state ?? "PENDING",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

    const outstanding = Math.max(0, asNumber(invoice.total) - asNumber(invoice.amount_paid));
    const revolut = await loadCompanyRevolutCredentials(supabase, auth.companyId);
    const order = await createRevolutOrder(revolut, { amountMinor: toMinorUnits(outstanding), currency: "GBP", merchantOrderReference: buildInvoiceReference(invoice.invoice_number, invoice.id), description: `Invoice ${invoice.invoice_number}`, customerEmail: invoice.customer_email, redirectUrl: `${getAppUrl()}/invoices/${invoice.id}?payment=return` });
    if (!order.checkout_url) throw new Error("Revolut created the order but did not return a checkout URL.");
if (outstanding <= 0) {
  return NextResponse.json<CreatePaymentLinkResponse>(
    {
      success: false,
      error:
        "This invoice has no outstanding balance.",
    },
    {
      status: 409,
    },
  );
}
    const { error: updateError } = await supabase.from("invoices").update({ payment_url: order.checkout_url, payment_provider: "revolut", revolut_order_id: order.id, revolut_order_state: order.state }).eq("id", invoice.id).eq("company_id", auth.companyId);
    if (updateError) throw new Error(`Payment order was created, but the invoice could not be updated: ${updateError.message}`);

    return NextResponse.json<CreatePaymentLinkResponse>(
      {
        success: true,
        paymentUrl: order.checkout_url,
        revolutOrderId: order.id,
        state: order.state,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("POST Revolut create order error:", error);
    return NextResponse.json<CreatePaymentLinkResponse>({ success: false, error: safeErrorMessage(error, "Unable to create the Revolut payment link.") }, { status: 500 });
  }
}
