import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { sendCompanyEmail } from "@/lib/communications/email";
import { loadCompanySettings } from "@/app/api/_company/load-company-settings";
import { formatCurrency } from "@/lib/regional-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const moduleGate = await requireApiModule("quotes");
  if (moduleGate) return moduleGate;

  try {
    const user = await requirePermission(["invoices.manage"]);
    const { id } = await context.params;
    const body = await request.json() as { recipient?: unknown; message?: unknown };
    const admin = createSupabaseAdmin();
    const { data: quote, error } = await admin.from("quotes").select("id,quote_number,customer_id,total,title,status").eq("id", id).eq("company_id", user.companyId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    const { data: customer } = await admin.from("customers").select("business_name,contact_name,email").eq("id", quote.customer_id).eq("company_id", user.companyId).maybeSingle();
    const recipient = typeof body.recipient === "string" && body.recipient.trim() ? body.recipient.trim().toLowerCase() : String(customer?.email || "").trim().toLowerCase();
    if (!recipient.includes("@")) return NextResponse.json({ error: "This customer does not have a valid email address." }, { status: 400 });
    const settings = await loadCompanySettings(admin, user.companyId);
    await sendCompanyEmail({
      companyId: user.companyId,
      to: recipient,
      recipientName: customer?.contact_name,
      templateKey: "quote_sent",
      variables: {
        company_name: settings.company_name,
        customer_name: customer?.contact_name || customer?.business_name || "Customer",
        quote_number: quote.quote_number || "Quotation",
        total: formatCurrency(Number(quote.total || 0), settings),
        message: typeof body.message === "string" ? body.message.trim().slice(0, 5000) : (quote.title || "Please contact us if you have any questions about this quotation."),
      },
      relatedEntityType: "quote",
      relatedEntityId: id,
      createdBy: user.userId,
      idempotencyKey: `quote:${id}:send:${recipient}:${Date.now()}`,
    });
    await admin.from("quotes").update({ status: quote.status === "draft" ? "sent" : quote.status, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("company_id", user.companyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send quote email failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send quotation." }, { status: 500 });
  }
}
