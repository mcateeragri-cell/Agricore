import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany } from "@/lib/platform/core";

export const dynamic = "force-dynamic";

function allowed(auth: Awaited<ReturnType<typeof getAuthenticatedUserContext>>) {
  return Boolean(auth && (canManageCompany(auth) || auth.permissions.includes("settings.manage") || auth.permissions.includes("finance.manage")));
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!allowed(auth)) return NextResponse.json({ error: "Finance management permission is required." }, { status: 403 });
  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const [invoiceResult, linesResult, paymentsResult] = await Promise.all([
    admin.from("finance_purchase_invoices").select("*,stock_suppliers(name,account_reference)").eq("company_id", auth.companyId).eq("id", id).maybeSingle(),
    admin.from("finance_purchase_invoice_lines").select("*,finance_accounts(code,name),finance_tax_codes(code,name,rate)").eq("company_id", auth.companyId).eq("purchase_invoice_id", id).order("sort_order"),
    admin.from("finance_supplier_payment_allocations").select("amount,finance_supplier_payments(id,payment_date,reference,status,amount)").eq("company_id", auth.companyId).eq("purchase_invoice_id", id),
  ]);
  const error = invoiceResult.error || linesResult.error || paymentsResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!invoiceResult.data) return NextResponse.json({ error: "Purchase invoice not found." }, { status: 404 });
  return NextResponse.json({ invoice: invoiceResult.data, lines: linesResult.data ?? [], payments: paymentsResult.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!allowed(auth)) return NextResponse.json({ error: "Finance management permission is required." }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (body.action !== "post") return NextResponse.json({ error: "Unsupported purchase invoice action." }, { status: 400 });

  const admin = createSupabaseAdmin();
  const [{ data: invoice, error: invoiceError }, { count, error: linesError }] = await Promise.all([
    admin.from("finance_purchase_invoices").select("id,status,total").eq("company_id", auth.companyId).eq("id", id).maybeSingle(),
    admin.from("finance_purchase_invoice_lines").select("id", { count: "exact", head: true }).eq("company_id", auth.companyId).eq("purchase_invoice_id", id),
  ]);
  const error = invoiceError || linesError;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ error: "Purchase invoice not found." }, { status: 404 });
  if (invoice.status !== "draft" && invoice.status !== "approved") return NextResponse.json({ error: "Only draft or approved purchase invoices can be posted." }, { status: 409 });
  if (!count || Number(invoice.total) <= 0) return NextResponse.json({ error: "Purchase invoice requires at least one line and a positive total before posting." }, { status: 400 });

  const { data, error: postError } = await admin
    .from("finance_purchase_invoices")
    .update({ status: "posted", posted_at: new Date().toISOString(), posted_by: auth.userId, updated_at: new Date().toISOString() })
    .eq("company_id", auth.companyId)
    .eq("id", id)
    .in("status", ["draft", "approved"])
    .select("id,status")
    .single();
  if (postError) return NextResponse.json({ error: postError.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}
