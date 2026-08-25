import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";
import { getOfficeAuth } from "../../../office/_shared";
import { loadInvoicePdfData } from "../_pdf/load-data";
import { renderCombinedPdf, renderInvoiceOnlyPdf } from "../_pdf/render";
import { sendCompanyEmail } from "@/lib/communications/email";
import { loadCompanySettings } from "@/app/api/_company/load-company-settings";
import { formatCurrency, formatDate } from "@/lib/regional-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

type Body = {
  documentType?: unknown;
  recipient?: unknown;
  subject?: unknown;
  message?: unknown;
  sendCopy?: unknown;
  includePaymentLink?: unknown;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const moduleGate = await requireApiModule("invoices");
  if (moduleGate) return moduleGate;

  try {
    const { id } = await context.params;
    const auth = await getOfficeAuth();
    if (!auth.user) return NextResponse.json({ error: auth.error || "You must be signed in." }, { status: 401 });
    if (!auth.permissions.includes("invoices.manage") && !["company_admin","administrator","service_manager","office"].includes(auth.role)) {
      return NextResponse.json({ error: "You do not have permission to send invoices." }, { status: 403 });
    }

    const body = await request.json() as Body;
    const recipient = typeof body.recipient === "string" ? body.recipient.trim().toLowerCase() : "";
    if (!recipient.includes("@")) return NextResponse.json({ error: "Enter a valid recipient email address." }, { status: 400 });
    let documentType = body.documentType === "invoice_only" ? "invoice_only" : "combined";
    const previewData = await loadInvoicePdfData({ invoiceId: id, auth, includePhotos: false });
    const isServiceInvoice = (previewData.invoice.commercial_type || (previewData.invoice.job_id ? "service" : "general")) === "service";
    if (!isServiceInvoice) documentType = "invoice_only";
    const data = isServiceInvoice && documentType === "combined"
      ? await loadInvoicePdfData({ invoiceId: id, auth, includePhotos: true })
      : previewData;
    const settings = await loadCompanySettings(auth.supabase, auth.companyId);
    const bytes = documentType === "invoice_only"
      ? await renderInvoiceOnlyPdf(data, auth.supabase, auth.companyId)
      : await renderCombinedPdf(data, auth.supabase, auth.companyId);
    const invoice = data.invoice;
    const paymentText = body.includePaymentLink === true && invoice.payment_url
      ? `Pay securely online: ${invoice.payment_url}`
      : "";
    const subjectOverride = typeof body.subject === "string" && body.subject.trim() ? body.subject.trim().slice(0, 300) : null;
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 5000) : "";
    const filename = documentType === "invoice_only"
      ? `${safe(invoice.invoice_number)}-invoice.pdf`
      : `${safe(invoice.invoice_number)}-service-report-and-invoice.pdf`;

    const recipients = [recipient];
    if (body.sendCopy === true && auth.email && auth.email.toLowerCase() !== recipient) recipients.push(auth.email.toLowerCase());

    await sendCompanyEmail({
      companyId: auth.companyId,
      to: recipients,
      recipientName: invoice.customer_name,
      templateKey: "invoice_sent",
      variables: {
        company_name: settings.company_name,
        customer_name: invoice.customer_name || "Customer",
        invoice_number: invoice.invoice_number,
        total: formatCurrency(Number(invoice.total || 0), settings),
        due_date: invoice.due_date ? formatDate(invoice.due_date, settings) : "as agreed",
        message,
        payment_text: paymentText,
      },
      subjectOverride,
      attachments: [{ filename, content: Buffer.from(bytes).toString("base64"), content_type: "application/pdf" }],
      relatedEntityType: "invoice",
      relatedEntityId: id,
      createdBy: auth.userId,
      idempotencyKey: `invoice:${id}:send:${recipient}:${Date.now()}`,
    });

    const now = new Date().toISOString();
    const { error: updateError } = await auth.supabase.from("invoices").update({
      sent_at: now,
      status: invoice.status === "draft" || invoice.status === "approved" ? "sent" : invoice.status,
      updated_at: now,
    }).eq("id", id).eq("company_id", auth.companyId);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send invoice email failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send invoice email." }, { status: 500 });
  }
}

function safe(value: string) { return value.replace(/[^a-zA-Z0-9-_]/g, "_"); }
