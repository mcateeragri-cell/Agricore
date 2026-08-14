import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { sendCompanyEmail } from "@/lib/communications/email";
import { builtInTemplate, type EmailTemplateKey } from "@/lib/communications/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const moduleGate = await requireApiModule("communications");
  if (moduleGate) return moduleGate;

  try {
    const user = await requirePermission(["settings.manage"]);
    const body = await request.json() as { recipient?: unknown; template_key?: unknown };
    const recipient = typeof body.recipient === "string" ? body.recipient.trim() : "";
    const key = typeof body.template_key === "string" ? body.template_key : "welcome";
    if (!recipient.includes("@")) return NextResponse.json({ error: "Enter a valid test email address." }, { status: 400 });
    if (!builtInTemplate(key)) return NextResponse.json({ error: "Unknown email template." }, { status: 400 });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    const result = await sendCompanyEmail({
      companyId: user.companyId,
      to: recipient,
      recipientName: user.fullName,
      templateKey: key as EmailTemplateKey,
      variables: {
        first_name: user.fullName.split(/\s+/)[0] || "there",
        company_name: user.companyName,
        trial_days: 14,
        trial_end: "in 14 days",
        role_name: "Service Manager",
        action_url: `${appUrl}/dashboard`,
        customer_name: "Demo Customer",
        invoice_number: "INV-TEST",
        quote_number: "QUO-TEST",
        total: "£1,250.00",
        due_date: "7 days",
        message: "This is a test email from the AgriCore Communications Centre.",
        payment_text: "Secure payment link would appear here.",
      },
      createdBy: user.userId,
      idempotencyKey: `test:${user.companyId}:${key}:${recipient}:${Date.now()}`,
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send test email." }, { status: 500 });
  }
}
