import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { loadBillingStatus } from "@/lib/platform/billing";
import { stripeRequest } from "@/lib/platform/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission(["settings.manage"]);
    const billing = await loadBillingStatus(user.companyId);
    if (!billing.subscription.stripeCustomerId) {
      return NextResponse.json({ invoices: [] });
    }

    const result = await stripeRequest<any>("/invoices", {
      body: {
        customer: billing.subscription.stripeCustomerId,
        limit: 24,
      },
    });

    const invoices = (result.data ?? []).map((invoice: any) => ({
      id: String(invoice.id ?? ""),
      number: invoice.number ? String(invoice.number) : null,
      createdAt:
        typeof invoice.created === "number"
          ? new Date(invoice.created * 1000).toISOString()
          : null,
      status: String(invoice.status ?? "unknown"),
      amountDue: Number(invoice.amount_due ?? 0) / 100,
      amountPaid: Number(invoice.amount_paid ?? 0) / 100,
      currency: String(invoice.currency ?? "gbp").toUpperCase(),
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load billing history." },
      { status: 500 },
    );
  }
}
