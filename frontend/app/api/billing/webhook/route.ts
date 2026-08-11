import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import {
  isoFromStripeUnix,
  mapStripeSubscriptionStatus,
  stripeSubscriptionPeriodEnd,
  syncStripeSubscriptionById,
} from "@/lib/platform/billing-sync";
import { verifyStripeWebhook } from "@/lib/platform/stripe";
import { sendCompanyEmail } from "@/lib/communications/email";
import { loadCompanySettings } from "@/app/api/_company/load-company-settings";
import { formatCurrency } from "@/lib/regional-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


async function billingRecipient(admin: ReturnType<typeof createSupabaseAdmin>, companyId: string) {
  const [{ data: company }, { data: settings }, { data: member }] = await Promise.all([
    admin.from("companies").select("company_name,billing_mode").eq("id", companyId).maybeSingle(),
    admin.from("company_settings").select("email").eq("company_id", companyId).maybeSingle(),
    admin.from("company_member_roles").select("user_id").eq("company_id", companyId).eq("role", "company_admin").limit(1).maybeSingle(),
  ]);
  if (!company || company.billing_mode !== "subscription") return null;
  let email = settings?.email || null;
  if (!email && member?.user_id) {
    const { data } = await admin.auth.admin.getUserById(member.user_id);
    email = data.user?.email || null;
  }
  return email ? { email, companyName: company.company_name } : null;
}

async function sendBillingNotification(input: { admin: ReturnType<typeof createSupabaseAdmin>; companyId: string; templateKey: "payment_successful" | "payment_failed" | "subscription_cancelled"; eventId: string; variables: Record<string, unknown> }) {
  try {
    const recipient = await billingRecipient(input.admin, input.companyId);
    if (!recipient) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://app.getagricore.com";
    await sendCompanyEmail({
      companyId: input.companyId,
      to: recipient.email,
      templateKey: input.templateKey,
      variables: { company_name: recipient.companyName, action_url: `${appUrl}/settings/billing`, ...input.variables },
      idempotencyKey: `stripe:${input.eventId}:${input.templateKey}`,
      metadata: { stripe_event_id: input.eventId },
    });
  } catch (error) {
    console.error("Unable to send billing notification email:", error);
  }
}

function invoiceSubscriptionId(invoice: any) {
  const modern = invoice?.parent?.subscription_details?.subscription;
  if (typeof modern === "string") return modern;
  const legacy = invoice?.subscription;
  return typeof legacy === "string" ? legacy : null;
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  try {
    if (!verifyStripeWebhook(payload, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const event = JSON.parse(payload) as any;
  const object = event.data?.object ?? {};
  const admin = createSupabaseAdmin();
  const eventId = String(event.id ?? "");

  if (!eventId) return NextResponse.json({ error: "Stripe event id is missing." }, { status: 400 });

  const { data: existing } = await admin
    .from("stripe_webhook_events")
    .select("event_id, processed_at")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing?.processed_at) return NextResponse.json({ received: true, duplicate: true });

  const { error: eventInsertError } = await admin.from("stripe_webhook_events").upsert({
    event_id: eventId,
    event_type: String(event.type ?? "unknown"),
    livemode: Boolean(event.livemode),
    received_at: new Date().toISOString(),
    processing_error: null,
  }, { onConflict: "event_id" });
  if (eventInsertError) console.error("Unable to record Stripe webhook event:", eventInsertError);

  try {
    if (event.type === "checkout.session.completed") {
      const companyId = object.metadata?.company_id || object.client_reference_id;
      if (companyId) {
        const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
        const { error } = await admin
          .from("company_subscriptions")
          .update({
            payment_provider: "stripe",
            payment_customer_id: typeof object.customer === "string" ? object.customer : null,
            payment_subscription_id: subscriptionId,
            checkout_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId);
        if (error) throw new Error(error.message);
        if (subscriptionId) await syncStripeSubscriptionById(subscriptionId, companyId);
      }
    }

    if (event.type.startsWith("customer.subscription.")) {
      const companyId = object.metadata?.company_id;
      const subscriptionId = object.id;
      if (typeof subscriptionId === "string") {
        try {
          await syncStripeSubscriptionById(subscriptionId, companyId || null);
        } catch {
          const update = {
            status: mapStripeSubscriptionStatus(String(object.status ?? "")),
            payment_provider: "stripe",
            payment_customer_id: typeof object.customer === "string" ? object.customer : null,
            payment_subscription_id: subscriptionId,
            stripe_price_id: object.items?.data?.[0]?.price?.id ?? null,
            trial_started_at: isoFromStripeUnix(object.trial_start),
            trial_ends_at: isoFromStripeUnix(object.trial_end),
            subscription_started_at: isoFromStripeUnix(object.start_date),
            current_period_ends_at: stripeSubscriptionPeriodEnd(object),
            cancel_at_period_end: Boolean(object.cancel_at_period_end),
            cancelled_at: isoFromStripeUnix(object.canceled_at),
            last_stripe_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const result = companyId
            ? await admin.from("company_subscriptions").update(update).eq("company_id", companyId)
            : await admin.from("company_subscriptions").update(update).eq("payment_subscription_id", subscriptionId);
          if (result.error) throw new Error(result.error.message);
        }
      }
    }

    if (event.type === "customer.subscription.deleted" || (event.type === "customer.subscription.updated" && object.cancel_at_period_end === true)) {
      let companyId = object.metadata?.company_id || null;
      if (!companyId && typeof object.id === "string") {
        const { data: subscriptionRow } = await admin.from("company_subscriptions").select("company_id").eq("payment_subscription_id", object.id).maybeSingle();
        companyId = subscriptionRow?.company_id || null;
      }
      if (companyId) {
        await sendBillingNotification({
          admin, companyId, templateKey: "subscription_cancelled", eventId,
          variables: { period_end_text: object.cancel_at_period_end && object.current_period_end ? ` at the end of the current billing period (${new Date(Number(object.current_period_end) * 1000).toLocaleDateString("en-GB")})` : "" },
        });
      }
    }

    if (event.type.startsWith("invoice.")) {
      const subscriptionId = invoiceSubscriptionId(object);
      if (subscriptionId) {
        const now = new Date().toISOString();
        const update: Record<string, unknown> = {
          last_invoice_id: object.id ?? null,
          last_invoice_status: object.status ?? event.type.replace("invoice.", ""),
          updated_at: now,
        };

        if (event.type === "invoice.paid" && Number(object.amount_paid ?? 0) > 0) {
          update.status = "active";
          update.last_payment_at = now;
          update.payment_failed_at = null;
          update.grace_ends_at = null;
        }
        if (event.type === "invoice.payment_failed" || event.type === "invoice.payment_action_required") {
          update.status = "suspended";
          update.payment_failed_at = now;
          update.grace_ends_at = new Date(Date.now() + 7 * 86_400_000).toISOString();
        }

        const { data: subscriptionRow, error } = await admin
          .from("company_subscriptions")
          .update(update)
          .eq("payment_subscription_id", subscriptionId)
          .select("company_id")
          .maybeSingle();
        if (error) throw new Error(error.message);

        if (subscriptionRow?.company_id && (event.type === "invoice.paid" || event.type === "invoice.payment_failed" || event.type === "invoice.payment_action_required")) {
          const companySettings = await loadCompanySettings(admin, subscriptionRow.company_id);
          const amount = Number(event.type === "invoice.paid" ? object.amount_paid : object.amount_due) / 100;
          await sendBillingNotification({
            admin,
            companyId: subscriptionRow.company_id,
            templateKey: event.type === "invoice.paid" ? "payment_successful" : "payment_failed",
            eventId,
            variables: {
              amount: formatCurrency(Number.isFinite(amount) ? amount : 0, companySettings),
              invoice_number: object.number || object.id || "Stripe invoice",
            },
          });
        }
      }
    }

    await admin
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_error: null })
      .eq("event_id", eventId);

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    console.error("Stripe webhook processing failed:", error);
    await admin
      .from("stripe_webhook_events")
      .update({ processing_error: message })
      .eq("event_id", eventId);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
