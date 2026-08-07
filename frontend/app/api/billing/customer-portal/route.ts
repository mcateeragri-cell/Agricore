import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { loadBillingStatus } from "@/lib/platform/billing";
import { applicationUrl, stripeRequest } from "@/lib/platform/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(["settings.manage"]);
    const billing = await loadBillingStatus(user.companyId);
    if (!billing.subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: "Add a payment method before opening the billing portal." },
        { status: 409 },
      );
    }

    const session = await stripeRequest("/billing_portal/sessions", {
      method: "POST",
      body: {
        customer: billing.subscription.stripeCustomerId,
        return_url: `${applicationUrl(request.url)}/settings/billing`,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Unable to create Stripe portal session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to open billing management." },
      { status: 500 },
    );
  }
}
