import { NextRequest, NextResponse } from "next/server";
import { loadCompanyRevolutCredentials } from "@/lib/payments/company-settings";
import { retrieveRevolutOrder } from "@/lib/payments/revolut";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import type { RevolutWebhookPayload } from "@/lib/payments/types";
import { verifyRevolutWebhookSignature } from "@/lib/payments/webhook-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId")?.trim();
  if (!companyId) return NextResponse.json({ error: "Company ID is required." }, { status: 400 });

  const supabase = createSupabaseAdmin();
  let revolut;
  try { revolut = await loadCompanyRevolutCredentials(supabase, companyId); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Payment provider is not configured." }, { status: 404 }); }
  if (!revolut.webhookSecret) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 409 });

  const rawBody = await request.text();
  const valid = verifyRevolutWebhookSignature({ rawBody, timestamp: request.headers.get("Revolut-Request-Timestamp"), signatureHeader: request.headers.get("Revolut-Signature"), secret: revolut.webhookSecret });
  if (!valid) return NextResponse.json({ error: "Invalid Revolut webhook signature." }, { status: 401 });

  let payload: RevolutWebhookPayload;
  try { payload = JSON.parse(rawBody) as RevolutWebhookPayload; }
  catch { return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 }); }

  try {
    const order = await retrieveRevolutOrder(revolut, payload.order_id);
    const { data: invoice, error } = await supabase.from("invoices").select("id,total,amount_paid,status,revolut_order_state").eq("company_id", companyId).eq("revolut_order_id", order.id).maybeSingle();
    if (error) throw error;
    if (!invoice) return NextResponse.json({ received: true });
    const update: Record<string, unknown> = { revolut_order_state: order.state };
    if (order.state === "COMPLETED") { update.status = "paid"; update.amount_paid = Number(invoice.total ?? 0); update.paid_at = new Date().toISOString(); }
    const { error: updateError } = await supabase.from("invoices").update(update).eq("company_id", companyId).eq("id", invoice.id);
    if (updateError) throw updateError;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Revolut webhook processing error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process webhook." }, { status: 500 });
  }
}
