import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { verifyResendWebhook } from "@/lib/communications/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function statusFor(type: string) {
  if (type === "email.sent") return "sent";
  if (type === "email.delivered") return "delivered";
  if (type === "email.delivery_delayed") return "delayed";
  if (type === "email.bounced") return "bounced";
  if (type === "email.complained") return "complained";
  if (type === "email.suppressed") return "suppressed";
  if (type === "email.failed") return "failed";
  return null;
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  if (!verifyResendWebhook(payload, request.headers)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as any;
  const eventId = request.headers.get("svix-id") || crypto.randomUUID();
  const type = String(event.type || "unknown");
  const emailId = typeof event.data?.email_id === "string" ? event.data.email_id : null;
  const admin = createSupabaseAdmin();

  const { data: existing } = await admin.from("resend_webhook_events").select("event_id,processed_at").eq("event_id", eventId).maybeSingle();
  if (existing?.processed_at) return NextResponse.json({ received: true, duplicate: true });

  await admin.from("resend_webhook_events").upsert({
    event_id: eventId,
    event_type: type,
    provider_message_id: emailId,
    received_at: new Date().toISOString(),
  }, { onConflict: "event_id" });

  try {
    if (emailId) {
      const timestamp = event.created_at || new Date().toISOString();
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const status = statusFor(type);
      if (status) update.status = status;
      if (type === "email.delivered") update.delivered_at = timestamp;
      if (type === "email.opened") update.opened_at = timestamp;
      if (type === "email.clicked") update.clicked_at = timestamp;
      if (type === "email.bounced") update.bounced_at = timestamp;
      if (type === "email.complained") update.complained_at = timestamp;
      if (type === "email.failed") update.failed_at = timestamp;
      const { data: message, error } = await admin.from("email_messages").update(update).eq("provider_message_id", emailId).select("company_id,recipient_email").maybeSingle();
      if (error) throw new Error(error.message);

      if (message && (type === "email.bounced" || type === "email.complained" || type === "email.suppressed")) {
        const recipient = String(message.recipient_email || "").split(",")[0]?.trim().toLowerCase();
        if (recipient) {
          await admin.from("email_suppressions").upsert({
            company_id: message.company_id,
            email: recipient,
            reason: type,
            provider_message_id: emailId,
          }, { onConflict: "company_id,email" });
        }
      }
    }

    await admin.from("resend_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("event_id", eventId);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    await admin.from("resend_webhook_events").update({ processing_error: message }).eq("event_id", eventId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
