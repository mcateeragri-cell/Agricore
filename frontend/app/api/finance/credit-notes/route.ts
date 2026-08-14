import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany, writePlatformAudit } from "@/lib/platform/core";
import { calculateTax } from "@/lib/platform/finance";

export const dynamic = "force-dynamic";
const money = (v: unknown) => Math.round((Number(v ?? 0) + Number.EPSILON) * 100) / 100;
function allowed(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) { return canManageCompany(auth) || auth.permissions.includes("finance.post") || auth.permissions.includes("finance.manage"); }
function noteNumber() { const d = new Date(); return `CN-${d.toISOString().slice(0,10).replaceAll("-","")}-${String(d.getTime()).slice(-6)}`; }

export async function GET(request: NextRequest) {
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth) && !auth.permissions.includes("finance.view")) return NextResponse.json({ error: "Finance permission is required." }, { status: 403 });
  const invoiceId = request.nextUrl.searchParams.get("invoiceId");
  const admin = createSupabaseAdmin();
  let query = admin.from("finance_credit_notes").select("id,invoice_id,credit_note_number,status,issue_date,reason,subtotal,tax_amount,total,currency_code,issued_at,created_at").eq("company_id", auth.companyId).order("created_at", { ascending: false });
  if (invoiceId) query = query.eq("invoice_id", invoiceId);
  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creditNotes: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!allowed(auth)) return NextResponse.json({ error: "Finance posting permission is required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const invoiceId = String(body.invoice_id ?? "").trim();
  const reason = String(body.reason ?? "").trim().slice(0,500);
  const issueDate = String(body.issue_date ?? new Date().toISOString().slice(0,10));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!invoiceId || !reason || !items.length || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) return NextResponse.json({ error: "Invoice, reason, issue date and at least one line are required." }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { data: invoice, error: invoiceError } = await admin.from("invoices").select("id,invoice_number,status,total,vat_rate,subtotal,vat_amount").eq("company_id", auth.companyId).eq("id", invoiceId).maybeSingle();
  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  if (!invoice || !["sent","part_paid","paid","overdue"].includes(String(invoice.status))) return NextResponse.json({ error: "Only issued invoices can be credited." }, { status: 409 });
  const { data: previous } = await admin.from("finance_credit_notes").select("total").eq("company_id", auth.companyId).eq("invoice_id", invoiceId).eq("status", "issued");
  const alreadyCredited = money((previous ?? []).reduce((sum, n) => sum + Number(n.total ?? 0), 0));
  const normalised = items.map((item: Record<string, unknown>, index: number) => { const quantity = Math.max(0, Number(item.quantity ?? 1)); const unitPrice = Math.max(0, money(item.unit_price)); return { item_type: String(item.item_type ?? "other").slice(0,32), description: String(item.description ?? "").trim().slice(0,500), quantity, unit_price: unitPrice, line_total: money(quantity * unitPrice), sort_order: index }; }).filter((x: {description:string}) => x.description);
  const subtotal = money(normalised.reduce((sum: number, x: {line_total:number}) => sum + x.line_total, 0));
  const tax = calculateTax(subtotal, Number(body.tax_rate ?? invoice.vat_rate ?? 0), false);
  const total = tax.gross;
  if (total <= 0) return NextResponse.json({ error: "Credit note total must be greater than zero." }, { status: 400 });
  if (money(alreadyCredited + total) > money(invoice.total) + 0.01) return NextResponse.json({ error: `Credit exceeds the remaining invoice value. Remaining creditable amount is ${(money(invoice.total) - alreadyCredited).toFixed(2)}.` }, { status: 409 });
  const { data: profile } = await admin.from("finance_profiles").select("base_currency_code").eq("company_id", auth.companyId).maybeSingle();
  const { data: note, error: noteError } = await admin.from("finance_credit_notes").insert({ company_id: auth.companyId, invoice_id: invoiceId, credit_note_number: noteNumber(), status: "draft", issue_date: issueDate, reason, subtotal, tax_amount: tax.tax, total, currency_code: profile?.base_currency_code ?? "GBP" }).select("*").single();
  if (noteError) return NextResponse.json({ error: noteError.message }, { status: 500 });
  const { error: linesError } = await admin.from("finance_credit_note_lines").insert(normalised.map((line: Record<string, unknown>) => ({ ...line, company_id: auth.companyId, credit_note_id: note.id })));
  if (linesError) { await admin.from("finance_credit_notes").delete().eq("id", note.id); return NextResponse.json({ error: linesError.message }, { status: 500 }); }
  if (body.issue === true) {
    const now = new Date().toISOString();
    const { data: issued, error: issueError } = await admin.from("finance_credit_notes").update({ status: "issued", issued_at: now, issued_by: auth.userId, updated_at: now }).eq("company_id", auth.companyId).eq("id", note.id).select("*").single();
    if (issueError) return NextResponse.json({ error: issueError.message }, { status: 500 });
    await writePlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "finance_credit_note", entityId: note.id, entityReference: note.credit_note_number, action: "finance_credit_note_issued", metadata: { invoice_id: invoiceId, total } });
    return NextResponse.json({ creditNote: issued });
  }
  await writePlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "finance_credit_note", entityId: note.id, entityReference: note.credit_note_number, action: "finance_credit_note_created", metadata: { invoice_id: invoiceId, total } });
  return NextResponse.json({ creditNote: note });
}

export async function PATCH(request: NextRequest) {
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!allowed(auth)) return NextResponse.json({ error: "Finance posting permission is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})); const id = String(body.id ?? "").trim(); const status = String(body.status ?? "").trim();
  if (!id || !["issued","void"].includes(status)) return NextResponse.json({ error: "Valid credit note and status are required." }, { status: 400 });
  const admin = createSupabaseAdmin(); const now = new Date().toISOString(); const update: Record<string, unknown> = { status, updated_at: now };
  if (status === "issued") { update.issued_at = now; update.issued_by = auth.userId; }
  const { data, error } = await admin.from("finance_credit_notes").update(update).eq("company_id", auth.companyId).eq("id", id).eq("status", status === "issued" ? "draft" : "draft").select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); if (!data) return NextResponse.json({ error: "Only draft credit notes can change status here." }, { status: 409 });
  await writePlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "finance_credit_note", entityId: id, entityReference: data.credit_note_number, action: `finance_credit_note_${status}` });
  return NextResponse.json({ creditNote: data });
}
