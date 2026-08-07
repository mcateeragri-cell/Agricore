import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { verifyStripeWebhook } from "@/lib/platform/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isoFromUnix(value: unknown) {
  return typeof value === "number" && value > 0
    ? new Date(value * 1000).toISOString()
    : null;
}

function mappedStatus(value: string) {
  switch (value) {
    case "trialing":
      return "trial";
    case "active":
      return "active";
    case "canceled":
      return "cancelled";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
      return "suspended";
    case "paused":
      return "suspended";
    default:
      return "expired";
  }
}

function subscriptionPeriodEnd(subscription: any) {
  const item = subscription?.items?.data?.[0];

  return isoFromUnix(
    item?.current_period_end ??
      subscription?.current_period_end,
  );
}

function invoiceSubscriptionId(invoice: any) {
  const modern =
    invoice?.parent?.subscription_details
      ?.subscription;

  if (typeof modern === "string") {
    return modern;
  }

  const legacy = invoice?.subscription;
  return typeof legacy === "string" ? legacy : null;
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature =
    request.headers.get("stripe-signature") ?? "";

  try {
    if (!verifyStripeWebhook(payload, signature)) {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error(
      "Stripe webhook verification failed:",
      error,
    );

    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
  }

  const event = JSON.parse(payload) as any;
  const object = event.data?.object ?? {};
  const admin = createSupabaseAdmin();

  try {
    if (event.type === "checkout.session.completed") {
      const companyId =
        object.metadata?.company_id ||
        object.client_reference_id;

      if (companyId) {
        const { error } = await admin
          .from("company_subscriptions")
          .update({
            payment_provider: "stripe",
            payment_customer_id:
              typeof object.customer === "string"
                ? object.customer
                : null,
            payment_subscription_id:
              typeof object.subscription === "string"
                ? object.subscription
                : null,
            checkout_completed_at:
              new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId);

        if (error) {
          throw new Error(error.message);
        }
      }
    }

    if (
      event.type.startsWith(
        "customer.subscription.",
      )
    ) {
      const companyId = object.metadata?.company_id;
      const subscriptionId = object.id;

      if (companyId || subscriptionId) {
        const update = {
          status: mappedStatus(
            String(object.status ?? ""),
          ),
          payment_provider: "stripe",
          payment_customer_id:
            typeof object.customer === "string"
              ? object.customer
              : null,
          payment_subscription_id:
            typeof subscriptionId === "string"
              ? subscriptionId
              : null,
          stripe_price_id:
            object.items?.data?.[0]?.price?.id ??
            null,
          trial_started_at: isoFromUnix(
            object.trial_start,
          ),
          trial_ends_at: isoFromUnix(
            object.trial_end,
          ),
          subscription_started_at: isoFromUnix(
            object.start_date,
          ),
          current_period_ends_at:
            subscriptionPeriodEnd(object),
          cancel_at_period_end: Boolean(
            object.cancel_at_period_end,
          ),
          cancelled_at: isoFromUnix(
            object.canceled_at,
          ),
          updated_at: new Date().toISOString(),
        };

        const result = companyId
          ? await admin
              .from("company_subscriptions")
              .update(update)
              .eq("company_id", companyId)
          : await admin
              .from("company_subscriptions")
              .update(update)
              .eq(
                "payment_subscription_id",
                subscriptionId,
              );

        if (result.error) {
          throw new Error(result.error.message);
        }
      }
    }

    if (
      event.type === "invoice.payment_failed" ||
      event.type ===
        "invoice.payment_action_required"
    ) {
      const subscriptionId =
        invoiceSubscriptionId(object);

      if (subscriptionId) {
        const { error } = await admin
          .from("company_subscriptions")
          .update({
            status: "suspended",
            updated_at: new Date().toISOString(),
          })
          .eq(
            "payment_subscription_id",
            subscriptionId,
          );

        if (error) {
          throw new Error(error.message);
        }
      }
    }

    if (
      event.type === "invoice.paid" &&
      Number(object.amount_paid ?? 0) > 0
    ) {
      const subscriptionId =
        invoiceSubscriptionId(object);

      if (subscriptionId) {
        const { error } = await admin
          .from("company_subscriptions")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq(
            "payment_subscription_id",
            subscriptionId,
          );

        if (error) {
          throw new Error(error.message);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error,
    );

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
