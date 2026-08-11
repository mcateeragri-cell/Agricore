import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { loadBillingStatus, trialDaysRemaining } from "@/lib/platform/billing";
import { syncStripeSubscriptionById } from "@/lib/platform/billing-sync";
import { stripeRequest } from "@/lib/platform/stripe";

export const dynamic = "force-dynamic";

function paymentMethodSummary(customer: any) {
  const method = customer?.invoice_settings?.default_payment_method;
  if (!method || typeof method !== "object") return null;
  const card = method.card;
  if (!card) return null;
  return {
    brand: String(card.brand ?? "card"),
    last4: String(card.last4 ?? ""),
    expMonth: Number(card.exp_month ?? 0),
    expYear: Number(card.exp_year ?? 0),
  };
}

export async function GET() {
  try {
    const user = await requirePermission(["settings.manage"]);
    let billing = await loadBillingStatus(user.companyId);

    if (billing.subscription.stripeSubscriptionId) {
      try {
        await syncStripeSubscriptionById(
          billing.subscription.stripeSubscriptionId,
          billing.companyId,
        );
        billing = await loadBillingStatus(user.companyId);
      } catch (error) {
        console.error("Unable to live-sync Stripe subscription:", error);
      }
    }

    let paymentMethod = null;
    if (billing.subscription.stripeCustomerId) {
      try {
        const customer = await stripeRequest(
          `/customers/${encodeURIComponent(billing.subscription.stripeCustomerId)}?expand[]=invoice_settings.default_payment_method`,
        );
        paymentMethod = paymentMethodSummary(customer);
      } catch (error) {
        console.error("Unable to load Stripe payment method summary:", error);
      }
    }

    return NextResponse.json({
      billing,
      trialDaysRemaining: trialDaysRemaining(billing.subscription.trialEndsAt),
      paymentMethod,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load billing." },
      { status: 500 },
    );
  }
}
