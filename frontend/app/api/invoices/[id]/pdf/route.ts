import { NextRequest, NextResponse } from "next/server";
import { getOfficeAuth } from "../../../office/_shared";
import { InvoiceNotFoundError, loadInvoicePdfData } from "../_pdf/load-data";
import { renderCombinedPdf } from "../_pdf/render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await getOfficeAuth();
    const denied = validateAuth(auth);
    if (denied) return denied;

    const data = await loadInvoicePdfData({
      invoiceId: id,
      auth,
      includePhotos: true,
    });

    const pdfBytes = await renderCombinedPdf(data, auth.supabase);
    return pdfResponse(pdfBytes, `${safe(data.invoice.invoice_number)}-service-report-and-invoice.pdf`);
  } catch (error) {
    return errorResponse(error, "Unable to generate service report and invoice PDF.");
  }
}

function validateAuth(auth: Awaited<ReturnType<typeof getOfficeAuth>>) {
  if (!auth.user) return NextResponse.json({ error: auth.error ?? "You must be signed in." }, { status: 401 });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 500 });
  if (!auth.canReview) return NextResponse.json({ error: "You do not have permission to view invoice PDFs." }, { status: 403 });
  return null;
}

function pdfResponse(bytes: Uint8Array, filename: string) {
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(error: unknown, fallback: string) {
  console.error("GET combined PDF error:", error);
  if (error instanceof InvoiceNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}

function safe(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "_");
}