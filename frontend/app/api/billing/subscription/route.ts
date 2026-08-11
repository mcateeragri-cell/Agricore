import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { loadBillingStatus } from "@/lib/platform/billing";
import { syncStripeSubscriptionById } from "@/lib/platform/billing-sync";
import { stripeRequest } from "@/lib/platform/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { action?: unknown };

export async function PATCH(request: NextRequest) {
  try {
    const user = await requirePermission(["settings.manage"]);
    const billing = await loadBillingStatus(user.companyId);
    const subscriptionId = billing.subscription.stripeSubscriptionId;
    if (!subscriptionId) {
      return NextResponse.json({ error: "This company does not have a Stripe subscription yet." }, { status: 409 });
    }

    const body = (await request.json()) as Body;
    const action = typeof body.action === "string" ? body.action : "";
    if (action !== "cancel_at_period_end" && action !== "reactivate") {
      return NextResponse.json({ error: "Unsupported subscription action." }, { status: 400 });
    }

    await stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "POST",
      body: { cancel_at_period_end: action === "cancel_at_period_end" },
    });
    await syncStripeSubscriptionById(subscriptionId, billing.companyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to update Stripe subscription:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update subscription." },
      { status: 500 },
    );
  }
}
