export type InvoiceStatus = "draft" | "approved" | "sent" | "part_paid" | "paid" | "overdue" | "void";
export type RevolutOrderState = "PENDING" | "PROCESSING" | "AUTHORISED" | "COMPLETED" | "CANCELLED" | "FAILED";
export type RevolutWebhookEvent = "ORDER_COMPLETED" | "ORDER_AUTHORISED" | "ORDER_PAYMENT_FAILED" | "ORDER_CANCELLED" | "ORDER_FAILED" | string;

export type PaymentInvoiceRow = {
  id: string; invoice_number: string; status: InvoiceStatus; total: number | string | null; amount_paid: number | string | null;
  customer_name: string | null; customer_email: string | null; payment_url: string | null; payment_provider: string | null;
  revolut_order_id: string | null; revolut_order_state: RevolutOrderState | null; paid_at: string | null;
};

export type RevolutOrder = {
  id: string; token?: string; state: RevolutOrderState; checkout_url?: string; merchant_order_ext_ref?: string;
  order_amount?: { value: number; currency: string };
};

export type CreateRevolutOrderInput = {
  amountMinor: number; currency: string; merchantOrderReference: string; description: string; customerEmail?: string | null; redirectUrl: string;
};
export type CreatePaymentLinkRequest = {
  invoiceId: string;
  forceNew?: boolean;
};
export type CreatePaymentLinkResponse = { success: boolean; paymentUrl?: string; revolutOrderId?: string; state?: RevolutOrderState; error?: string };
export type RevolutWebhookPayload = { event: RevolutWebhookEvent; order_id: string; merchant_order_ext_ref?: string };
