import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SalesAction = "create_opportunity" | "create_stock" | "create_trade_in" | "update_opportunity" | "update_stock" | "update_trade_in";

type Body = { action?: unknown; id?: unknown; values?: unknown };

function clean(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalDate(value: unknown) {
  const result = clean(value, 30);
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}

function canViewSales(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("sales.view") ||
    auth.permissions.includes("sales.manage")
  );
}

function canManageSales(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("sales.manage")
  );
}

async function authorise(requireManage = false) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  if (requireManage ? !canManageSales(auth) : !canViewSales(auth)) {
    return { error: NextResponse.json({ error: "Machinery Sales permission is required." }, { status: 403 }) } as const;
  }

  const admin = createSupabaseAdmin();
  const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, "machinery_sales_crm");
  if (!enabled) return { error: NextResponse.json({ error: "Machinery Sales CRM is an Enterprise feature." }, { status: 403 }) } as const;
  return { auth, admin, error: null } as const;
}

export async function GET() {
  const moduleGate = await requireApiModule("machinery_sales_crm");
  if (moduleGate) return moduleGate;

  const access = await authorise(false);
  if (access.error) return access.error;
  const { auth, admin } = access;

  const [opportunities, stock, tradeIns, customers, machines] = await Promise.all([
    admin
      .from("sales_opportunities")
      .select("id,customer_id,title,stage,source,estimated_value,probability,assigned_to,expected_close_date,notes,created_at,updated_at")
      .eq("company_id", auth.companyId)
      .order("updated_at", { ascending: false }),
    admin
      .from("sales_stock_machines")
      .select("id,stock_number,make,model,machine_type,year,registration,serial_number,hours,condition,cost_price,asking_price,status,location,description,created_at,updated_at")
      .eq("company_id", auth.companyId)
      .order("updated_at", { ascending: false }),
    admin
      .from("sales_trade_ins")
      .select("id,opportunity_id,customer_machine_id,make,model,year,registration,serial_number,hours,valuation,allowance,status,notes,created_at,updated_at")
      .eq("company_id", auth.companyId)
      .order("updated_at", { ascending: false }),
    admin
      .from("customers")
      .select("id,business_name,contact_name")
      .eq("company_id", auth.companyId)
      .order("business_name", { ascending: true })
      .limit(1000),
    admin
      .from("machines")
      .select("id,customer_id,make,model,year,registration,serial_number,hours")
      .eq("company_id", auth.companyId)
      .order("make", { ascending: true })
      .limit(2000),
  ]);

  const firstError = opportunities.error || stock.error || tradeIns.error || customers.error || machines.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({
    opportunities: opportunities.data ?? [],
    stock: stock.data ?? [],
    tradeIns: tradeIns.data ?? [],
    customers: customers.data ?? [],
    machines: machines.data ?? [],
    canManage: canManageSales(auth),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const moduleGate = await requireApiModule("machinery_sales_crm");
  if (moduleGate) return moduleGate;

  const access = await authorise(true);
  if (access.error) return access.error;
  const { auth, admin } = access;

  let body: Body;
  try { body = (await request.json()) as Body; }
  catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }

  const action = clean(body.action, 60) as SalesAction;
  const values = body.values && typeof body.values === "object" ? body.values as Record<string, unknown> : {};
  const id = clean(body.id, 100);

  if (action === "create_opportunity") {
    const title = clean(values.title, 200);
    if (!title) return NextResponse.json({ error: "Opportunity title is required." }, { status: 400 });
    const { data, error } = await admin.from("sales_opportunities").insert({
      company_id: auth.companyId,
      customer_id: clean(values.customer_id, 100) || null,
      title,
      stage: clean(values.stage, 30) || "lead",
      source: clean(values.source, 120) || null,
      estimated_value: numberValue(values.estimated_value),
      probability: Math.max(0, Math.min(100, Math.round(numberValue(values.probability, 10)))),
      assigned_to: clean(values.assigned_to, 160) || null,
      expected_close_date: optionalDate(values.expected_close_date),
      notes: clean(values.notes, 4000) || null,
    }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ created: true, id: data.id });
  }

  if (action === "create_stock") {
    const make = clean(values.make, 120);
    const model = clean(values.model, 160);
    if (!make || !model) return NextResponse.json({ error: "Make and model are required." }, { status: 400 });
    const { data, error } = await admin.from("sales_stock_machines").insert({
      company_id: auth.companyId,
      stock_number: clean(values.stock_number, 80) || null,
      make,
      model,
      machine_type: clean(values.machine_type, 120) || null,
      year: numberValue(values.year) || null,
      registration: clean(values.registration, 80) || null,
      serial_number: clean(values.serial_number, 160) || null,
      hours: numberValue(values.hours) || null,
      condition: clean(values.condition, 30) || "used",
      cost_price: numberValue(values.cost_price),
      asking_price: numberValue(values.asking_price),
      status: clean(values.status, 30) || "available",
      location: clean(values.location, 160) || null,
      description: clean(values.description, 4000) || null,
    }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ created: true, id: data.id });
  }

  if (action === "create_trade_in") {
    const customerMachineId = clean(values.customer_machine_id, 100);
    let linkedMachine: Record<string, unknown> | null = null;
    if (customerMachineId) {
      const linked = await admin
        .from("machines")
        .select("id,make,model,year,registration,serial_number,hours")
        .eq("company_id", auth.companyId)
        .eq("id", customerMachineId)
        .maybeSingle();
      if (linked.error) return NextResponse.json({ error: linked.error.message }, { status: 500 });
      linkedMachine = linked.data as Record<string, unknown> | null;
    }

    const make = clean(values.make, 120) || clean(linkedMachine?.make, 120);
    const model = clean(values.model, 160) || clean(linkedMachine?.model, 160);
    if (!make || !model) return NextResponse.json({ error: "Choose an existing machine or enter the trade-in make and model." }, { status: 400 });
    const { data, error } = await admin.from("sales_trade_ins").insert({
      company_id: auth.companyId,
      opportunity_id: clean(values.opportunity_id, 100) || null,
      customer_machine_id: customerMachineId || null,
      make,
      model,
      year: numberValue(values.year) || numberValue(linkedMachine?.year) || null,
      registration: clean(values.registration, 80) || clean(linkedMachine?.registration, 80) || null,
      serial_number: clean(values.serial_number, 160) || clean(linkedMachine?.serial_number, 160) || null,
      hours: numberValue(values.hours) || numberValue(linkedMachine?.hours) || null,
      valuation: numberValue(values.valuation),
      allowance: numberValue(values.allowance),
      status: clean(values.status, 30) || "appraising",
      notes: clean(values.notes, 4000) || null,
    }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ created: true, id: data.id });
  }

  if (!id) return NextResponse.json({ error: "Record id is required." }, { status: 400 });

  if (action === "update_opportunity") {
    const stage = clean(values.stage, 30);
    const allowed = new Set(["lead", "qualified", "quoted", "negotiation", "won", "lost"]);
    if (!allowed.has(stage)) return NextResponse.json({ error: "A valid pipeline stage is required." }, { status: 400 });
    const { error } = await admin.from("sales_opportunities").update({ stage, updated_at: new Date().toISOString() }).eq("company_id", auth.companyId).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: true });
  }

  if (action === "update_stock") {
    const status = clean(values.status, 30);
    const allowed = new Set(["available", "reserved", "sold", "workshop", "incoming"]);
    if (!allowed.has(status)) return NextResponse.json({ error: "A valid stock status is required." }, { status: 400 });
    const { error } = await admin.from("sales_stock_machines").update({ status, updated_at: new Date().toISOString() }).eq("company_id", auth.companyId).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: true });
  }

  if (action === "update_trade_in") {
    const status = clean(values.status, 30);
    const allowed = new Set(["appraising", "offered", "accepted", "declined", "received"]);
    if (!allowed.has(status)) return NextResponse.json({ error: "A valid trade-in status is required." }, { status: 400 });
    const { error } = await admin.from("sales_trade_ins").update({ status, updated_at: new Date().toISOString() }).eq("company_id", auth.companyId).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: true });
  }

  return NextResponse.json({ error: "Unsupported sales action." }, { status: 400 });
}
