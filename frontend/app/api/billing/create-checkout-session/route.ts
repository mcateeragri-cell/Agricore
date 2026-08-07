import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import {
  loadBillingStatus,
  trialDaysRemaining,
} from "@/lib/platform/billing";
import {
  applicationUrl,
  professionalStripePriceId,
  stripeRequest,
} from "@/lib/platform/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission([
      "settings.manage",
    ]);

    const billing = await loadBillingStatus(
      user.companyId,
    );

    const admin = createSupabaseAdmin();

    if (
      billing.subscription.stripeSubscriptionId
    ) {
      return NextResponse.json(
        {
          error:
            "This company already has an AgriCore subscription. Use Manage subscription instead.",
        },
        { status: 409 },
      );
    }

    const appUrl = applicationUrl(request.url);
    const priceId = professionalStripePriceId();

    let customerId =
      billing.subscription.stripeCustomerId;

    if (!customerId) {
      const customer = await stripeRequest(
        "/customers",
        {
          method: "POST",
          body: {
            email: billing.email || user.email,
            name: billing.companyName,
            metadata: {
              company_id: billing.companyId,
              company_slug: user.companySlug,
            },
          },
        },
      );

      customerId = customer.id;

      const { error } = await admin
        .from("company_subscriptions")
        .update({
          payment_provider: "stripe",
          payment_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", billing.companyId);

      if (error) {
        throw new Error(error.message);
      }
    }

    const remainingTrialDays = Math.max(
      1,
      trialDaysRemaining(
        billing.subscription.trialEndsAt,
      ) || billing.plan.trialDays,
    );

    const session = await stripeRequest(
      "/checkout/sessions",
      {
        method: "POST",
        body: {
          mode: "subscription",
          customer: customerId,
          client_reference_id: billing.companyId,
          payment_method_collection: "always",
          billing_address_collection: "auto",
          allow_promotion_codes: false,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          subscription_data: {
            trial_period_days: remainingTrialDays,
            metadata: {
              company_id: billing.companyId,
              plan_slug: "professional",
            },
          },
          metadata: {
            company_id: billing.companyId,
            plan_slug: "professional",
          },
          success_url: `${appUrl}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/settings/billing?checkout=cancelled&setup=1`,
        },
      },
    );

    const { error: updateError } = await admin
      .from("company_subscriptions")
      .update({
        payment_provider: "stripe",
        stripe_price_id: priceId,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", billing.companyId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Unable to create Stripe checkout session:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open secure checkout.",
      },
      { status: 500 },
    );
  }
}
