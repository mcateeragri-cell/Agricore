import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany } from "@/lib/platform/core";

export const dynamic = "force-dynamic";

const money = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? Math.round((number + Number.EPSILON) * 100) / 100
    : 0;
};

function canManageFinance(auth: Awaited<ReturnType<typeof getAuthenticatedUserContext>>) {
  return Boolean(
    auth &&
      (canManageCompany(auth) ||
        auth.permissions.includes("settings.manage") ||
        auth.permissions.includes("finance.manage")),
  );
}

export async function GET() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageFinance(auth)) return NextResponse.json({ error: "Finance management permission is required." }, { status: 403 });

  const admin = createSupabaseAdmin();
  const [invoices, suppliers, accounts, taxCodes, bankAccounts, purchaseOrders] = await Promise.all([
    admin
      .from("finance_purchase_invoices")
      .select("id,supplier_id,purchase_order_id,invoice_number,supplier_reference,invoice_date,due_date,status,currency_code,subtotal,tax_amount,total,amount_paid,notes,created_at,stock_suppliers(name)")
      .eq("company_id", auth.companyId)
      .order("invoice_date", { ascending: false })
      .limit(250),
    admin
      .from("stock_suppliers")
      .select("id,name,account_reference")
      .eq("company_id", auth.companyId)
      .eq("active", true)
      .order("name"),
    admin
      .from("finance_accounts")
      .select("id,code,name,account_type,system_key,active")
      .eq("company_id", auth.companyId)
      .eq("active", true)
      .order("code"),
    admin
      .from("finance_tax_codes")
      .select("id,code,name,rate,recoverable,active")
      .eq("company_id", auth.companyId)
      .eq("active", true)
      .order("code"),
    admin
      .from("finance_bank_accounts")
      .select("id,name,bank_name,currency_code,is_default,active")
      .eq("company_id", auth.companyId)
      .eq("active", true)
      .order("is_default", { ascending: false })
      .order("name"),
    admin
      .from("purchase_orders")
      .select("id,order_number,supplier_id,supplier_name,status,total")
      .eq("company_id", auth.companyId)
      .order("order_date", { ascending: false })
      .limit(100),
  ]);

  const error = invoices.error || suppliers.error || accounts.error || taxCodes.error || bankAccounts.error || purchaseOrders.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    {
      invoices: invoices.data ?? [],
      suppliers: suppliers.data ?? [],
      accounts: accounts.data ?? [],
      taxCodes: taxCodes.data ?? [],
      bankAccounts: bankAccounts.data ?? [],
      purchaseOrders: purchaseOrders.data ?? [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

type PurchaseLineInput = {
  account_id?: string;
  tax_code_id?: string | null;
  stock_item_id?: string | null;
  purchase_order_line_id?: string | null;
  description?: string;
  quantity?: number;
  unit_cost?: number;
};

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageFinance(auth)) return NextResponse.json({ error: "Finance management permission is required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const supplierId = String(body.supplier_id ?? "").trim();
  const invoiceNumber = String(body.invoice_number ?? "").trim();
  const invoiceDate = String(body.invoice_date ?? "").trim() || new Date().toISOString().slice(0, 10);
  const dueDate = String(body.due_date ?? "").trim() || null;
  const purchaseOrderId = String(body.purchase_order_id ?? "").trim() || null;
  const status = body.status === "posted" ? "posted" : "draft";
  const lines = Array.isArray(body.lines) ? (body.lines as PurchaseLineInput[]) : [];

  if (!supplierId) return NextResponse.json({ error: "Supplier is required." }, { status: 400 });
  if (!invoiceNumber) return NextResponse.json({ error: "Supplier invoice number is required." }, { status: 400 });
  if (!lines.length) return NextResponse.json({ error: "At least one purchase line is required." }, { status: 400 });

  const admin = createSupabaseAdmin();
  const [{ data: supplier, error: supplierError }, { data: profile, error: profileError }, { data: taxRows, error: taxError }] = await Promise.all([
    admin.from("stock_suppliers").select("id").eq("company_id", auth.companyId).eq("id", supplierId).eq("active", true).maybeSingle(),
    admin.from("finance_profiles").select("base_currency_code").eq("company_id", auth.companyId).maybeSingle(),
    admin.from("finance_tax_codes").select("id,rate").eq("company_id", auth.companyId).eq("active", true),
  ]);

  const lookupError = supplierError || profileError || taxError;
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!supplier) return NextResponse.json({ error: "Supplier was not found for this company." }, { status: 400 });

  const taxRates = new Map((taxRows ?? []).map((row) => [String(row.id), money(row.rate)]));
  const normalisedLines = [] as Array<{
    company_id: string;
    purchase_invoice_id: string;
    purchase_order_line_id: string | null;
    stock_item_id: string | null;
    account_id: string;
    tax_code_id: string | null;
    description: string;
    quantity: number;
    unit_cost: number;
    net_amount: number;
    tax_amount: number;
    gross_amount: number;
    sort_order: number;
  }>;

  let subtotal = 0;
  let taxAmount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const accountId = String(line.account_id ?? "").trim();
    const description = String(line.description ?? "").trim();
    const quantity = Number(line.quantity ?? 0);
    const unitCost = Number(line.unit_cost ?? 0);
    const taxCodeId = String(line.tax_code_id ?? "").trim() || null;

    if (!accountId || !description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      return NextResponse.json({ error: `Purchase line ${index + 1} is incomplete or invalid.` }, { status: 400 });
    }

    if (taxCodeId && !taxRates.has(taxCodeId)) {
      return NextResponse.json({ error: `Purchase line ${index + 1} uses an invalid tax code.` }, { status: 400 });
    }

    const net = money(quantity * unitCost);
    const tax = money(net * ((taxCodeId ? taxRates.get(taxCodeId) ?? 0 : 0) / 100));
    const gross = money(net + tax);
    subtotal = money(subtotal + net);
    taxAmount = money(taxAmount + tax);

    normalisedLines.push({
      company_id: auth.companyId,
      purchase_invoice_id: "",
      purchase_order_line_id: String(line.purchase_order_line_id ?? "").trim() || null,
      stock_item_id: String(line.stock_item_id ?? "").trim() || null,
      account_id: accountId,
      tax_code_id: taxCodeId,
      description,
      quantity,
      unit_cost: money(unitCost),
      net_amount: net,
      tax_amount: tax,
      gross_amount: gross,
      sort_order: index,
    });
  }

  const total = money(subtotal + taxAmount);
  const { data: invoice, error: invoiceError } = await admin
    .from("finance_purchase_invoices")
    .insert({
      company_id: auth.companyId,
      supplier_id: supplierId,
      purchase_order_id: purchaseOrderId,
      invoice_number: invoiceNumber,
      supplier_reference: String(body.supplier_reference ?? "").trim() || null,
      invoice_date: invoiceDate,
      due_date: dueDate,
      status: "draft",
      currency_code: String(profile?.base_currency_code ?? "GBP").toUpperCase(),
      subtotal,
      tax_amount: taxAmount,
      total,
      amount_paid: 0,
      notes: String(body.notes ?? "").trim() || null,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) return NextResponse.json({ error: invoiceError?.message || "Unable to create purchase invoice." }, { status: 500 });

  const linePayload = normalisedLines.map((line) => ({ ...line, purchase_invoice_id: invoice.id }));
  const { error: lineError } = await admin.from("finance_purchase_invoice_lines").insert(linePayload);
  if (lineError) {
    await admin.from("finance_purchase_invoices").delete().eq("company_id", auth.companyId).eq("id", invoice.id).eq("status", "draft");
    return NextResponse.json({ error: lineError.message }, { status: 500 });
  }

  if (status === "posted") {
    const { error: postError } = await admin
      .from("finance_purchase_invoices")
      .update({ status: "posted", posted_at: new Date().toISOString(), posted_by: auth.userId, updated_at: new Date().toISOString() })
      .eq("company_id", auth.companyId)
      .eq("id", invoice.id)
      .eq("status", "draft");
    if (postError) return NextResponse.json({ error: postError.message, id: invoice.id }, { status: 500 });
  }

  return NextResponse.json({ id: invoice.id, status, subtotal, taxAmount, total }, { status: 201 });
}
