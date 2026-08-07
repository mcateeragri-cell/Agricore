import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { loadBillingStatus, trialDaysRemaining } from "@/lib/platform/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requirePermission(["settings.manage"]);
  const billing = await loadBillingStatus(user.companyId);
  return NextResponse.json({
    billing,
    trialDaysRemaining: trialDaysRemaining(billing.subscription.trialEndsAt),
  });
}
