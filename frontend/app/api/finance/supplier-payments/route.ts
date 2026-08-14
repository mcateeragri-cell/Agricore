import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany } from "@/lib/platform/core";

export const dynamic = "force-dynamic";

const money = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : 0;
};

function allowed(auth: Awaited<ReturnType<typeof getAuthenticatedUserContext>>) {
  return Boolean(auth && (canManageCompany(auth) || auth.permissions.includes("settings.manage") || auth.permissions.includes("finance.manage")));
}

export async function GET() {
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!allowed(auth)) return NextResponse.json({ error: "Finance management permission is required." }, { status: 403 });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("finance_supplier_payments")
    .select("id,supplier_id,bank_account_id,payment_date,amount,currency_code,payment_method,reference,status,created_at,stock_suppliers(name),finance_bank_accounts(name)")
    .eq("company_id", auth.companyId)
    .order("payment_date", { ascending: false })
    .limit(250);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payments: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!allowed(auth)) return NextResponse.json({ error: "Finance management permission is required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const purchaseInvoiceId = String(body.purchase_invoice_id ?? "").trim();
  const amount = money(body.amount);
  const paymentDate = String(body.payment_date ?? "").trim() || new Date().toISOString().slice(0, 10);
  const bankAccountId = String(body.bank_account_id ?? "").trim() || null;

  if (!purchaseInvoiceId) return NextResponse.json({ error: "Purchase invoice is required." }, { status: 400 });
  if (amount <= 0) return NextResponse.json({ error: "Payment amount must be greater than zero." }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: invoice, error: invoiceError } = await admin
    .from("finance_purchase_invoices")
    .select("id,supplier_id,status,total,amount_paid,currency_code,invoice_number")
    .eq("company_id", auth.companyId)
    .eq("id", purchaseInvoiceId)
    .maybeSingle();
  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ error: "Purchase invoice not found." }, { status: 404 });
  if (!["posted", "part_paid"].includes(String(invoice.status))) return NextResponse.json({ error: "Only posted purchase invoices can be paid." }, { status: 409 });

  const outstanding = money(Number(invoice.total) - Number(invoice.amount_paid));
  if (amount > outstanding + 0.01) return NextResponse.json({ error: `Payment exceeds the outstanding balance of ${outstanding.toFixed(2)}.` }, { status: 400 });

  if (bankAccountId) {
    const { data: bank, error: bankError } = await admin.from("finance_bank_accounts").select("id").eq("company_id", auth.companyId).eq("id", bankAccountId).eq("active", true).maybeSingle();
    if (bankError) return NextResponse.json({ error: bankError.message }, { status: 500 });
    if (!bank) return NextResponse.json({ error: "Selected bank account is invalid or inactive." }, { status: 400 });
  }

  const { data: payment, error: paymentError } = await admin
    .from("finance_supplier_payments")
    .insert({
      company_id: auth.companyId,
      supplier_id: invoice.supplier_id,
      bank_account_id: bankAccountId,
      payment_date: paymentDate,
      amount,
      currency_code: invoice.currency_code,
      payment_method: String(body.payment_method ?? "bank_transfer").trim() || null,
      reference: String(body.reference ?? "").trim() || invoice.invoice_number,
      notes: String(body.notes ?? "").trim() || null,
      status: "draft",
      created_by: auth.userId,
    })
    .select("id")
    .single();
  if (paymentError || !payment) return NextResponse.json({ error: paymentError?.message || "Unable to create supplier payment." }, { status: 500 });

  const { error: allocationError } = await admin.from("finance_supplier_payment_allocations").insert({
    company_id: auth.companyId,
    payment_id: payment.id,
    purchase_invoice_id: invoice.id,
    amount,
  });
  if (allocationError) {
    await admin.from("finance_supplier_payments").delete().eq("company_id", auth.companyId).eq("id", payment.id).eq("status", "draft");
    return NextResponse.json({ error: allocationError.message }, { status: 500 });
  }

  const { error: postError } = await admin
    .from("finance_supplier_payments")
    .update({ status: "posted", updated_at: new Date().toISOString() })
    .eq("company_id", auth.companyId)
    .eq("id", payment.id)
    .eq("status", "draft");
  if (postError) return NextResponse.json({ error: postError.message, id: payment.id }, { status: 500 });

  return NextResponse.json({ id: payment.id, amount, outstandingAfter: money(outstanding - amount) }, { status: 201 });
}
