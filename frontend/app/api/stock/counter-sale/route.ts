import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function canUseParts(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.role === "office" ||
    auth.role === "parts_manager" ||
    auth.role === "parts_advisor" ||
    auth.permissions.includes("parts.sales") ||
    auth.permissions.includes("stock.manage")
  );
}

async function authorise() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  if (!canUseParts(auth)) return { error: NextResponse.json({ error: "Parts sales permission is required." }, { status: 403 }) } as const;
  const admin = createSupabaseAdmin();
  const stockEnabled = await isCompanyFeatureEnabled(admin, auth.companyId, "stock");
  if (!stockEnabled) return { error: NextResponse.json({ error: "Stock is not enabled for this company." }, { status: 403 }) } as const;
  return { auth, admin, error: null } as const;
}

export async function GET() {
  const access = await authorise();
  if (access.error) return access.error;
  const { auth, admin } = access;

  const branchIds = auth.activeBranchId ? [auth.activeBranchId] : auth.accessibleOperationalBranchIds;
  const [itemsResult, balancesResult, customersResult, branchesResult] = await Promise.all([
    admin.from("stock_items")
      .select("id,part_number,description,category,manufacturer,unit,unit_price,vat_rate,barcode,active")
      .eq("company_id", auth.companyId).eq("active", true).order("description"),
    branchIds.length
      ? admin.from("stock_branch_balances")
          .select("stock_item_id,branch_id,quantity_in_stock,quantity_reserved,location")
          .eq("company_id", auth.companyId).in("branch_id", branchIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from("customers")
      .select("id,business_name,contact_name,email,phone,address,postcode")
      .eq("company_id", auth.companyId).order("business_name").limit(1500),
    branchIds.length
      ? admin.from("company_branches").select("id,code,name").eq("company_id", auth.companyId).in("id", branchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const firstError = itemsResult.error || balancesResult.error || customersResult.error || branchesResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const balances = new Map<string, { quantity: number; reserved: number }>();
  for (const row of balancesResult.data ?? []) {
    const key = String(row.stock_item_id);
    const current = balances.get(key) ?? { quantity: 0, reserved: 0 };
    current.quantity += Number(row.quantity_in_stock ?? 0);
    current.reserved += Number(row.quantity_reserved ?? 0);
    balances.set(key, current);
  }

  const items = (itemsResult.data ?? []).map((item) => {
    const balance = balances.get(String(item.id)) ?? { quantity: 0, reserved: 0 };
    return {
      ...item,
      quantity_in_stock: balance.quantity,
      quantity_reserved: balance.reserved,
      quantity_available: Math.max(0, balance.quantity - balance.reserved),
    };
  });

  return NextResponse.json({
    items,
    customers: customersResult.data ?? [],
    branches: branchesResult.data ?? [],
    activeBranchId: auth.activeBranchId,
    canChooseBranch: !auth.activeBranchId && branchIds.length > 1,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const access = await authorise();
  if (access.error) return access.error;
  const { auth, admin } = access;

  const body = await request.json().catch(() => ({}));
  const customerId = clean(body.customerId, 100) || null;
  const walkInName = clean(body.walkInName, 160);
  const walkInEmail = clean(body.walkInEmail, 240);
  const walkInPhone = clean(body.walkInPhone, 80);
  const notes = clean(body.notes, 2000);
  const paymentMethod = clean(body.paymentMethod, 40) || "account";
  const markPaid = Boolean(body.markPaid);
  const branchId = clean(body.branchId, 100) || auth.activeBranchId || auth.accessibleOperationalBranchIds[0] || null;

  if (!branchId || !auth.accessibleOperationalBranchIds.includes(branchId)) {
    return NextResponse.json({ error: "Choose an accessible depot for this sale." }, { status: 400 });
  }

  let customerName = walkInName || "Counter Sale";
  let customerEmail = walkInEmail;
  let customerPhone = walkInPhone;
  let billingAddress = "";

  if (customerId) {
    const customerResult = await admin.from("customers")
      .select("id,business_name,contact_name,email,phone,address,postcode")
      .eq("company_id", auth.companyId).eq("id", customerId).maybeSingle();
    if (customerResult.error) return NextResponse.json({ error: customerResult.error.message }, { status: 500 });
    if (!customerResult.data) return NextResponse.json({ error: "Customer not found in the active company." }, { status: 404 });
    const c = customerResult.data;
    customerName = clean(c.business_name) || clean(c.contact_name) || "Customer";
    customerEmail = clean(c.email);
    customerPhone = clean(c.phone);
    billingAddress = [clean(c.address), clean(c.postcode)].filter(Boolean).join(", ");
  }

  const rawLines = Array.isArray(body.lines) ? body.lines : [];
  const lines = rawLines.map((line: any) => ({
    stock_item_id: clean(line.stockItemId, 100),
    quantity: Math.round(Math.max(0, num(line.quantity)) * 1000) / 1000,
    unit_price: Math.round(Math.max(0, num(line.unitPrice)) * 100) / 100,
    discount_percent: Math.min(100, Math.max(0, num(line.discountPercent))),
  })).filter((line: any) => line.stock_item_id && line.quantity > 0);

  if (!lines.length) return NextResponse.json({ error: "Add at least one part to the sale." }, { status: 400 });

  const invoiceNumber = `INV-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

  const { data, error } = await admin.rpc("agricore_create_parts_counter_sale", {
    p_company: auth.companyId,
    p_branch: branchId,
    p_user: auth.userId,
    p_customer: customerId,
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone,
    p_billing_address: billingAddress,
    p_invoice_number: invoiceNumber,
    p_payment_method: paymentMethod,
    p_mark_paid: markPaid,
    p_notes: notes,
    p_lines: lines,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
