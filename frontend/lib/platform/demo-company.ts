import "server-only";

import type { SupabaseAdminClient } from "@/lib/payments/supabase-admin";

export const DEMO_SLUG_PREFIX = "demo-";
export const DEFAULT_DEMO_NAME = "Green Valley Agri Services Ltd";
export const DEMO_MAX_WORKSPACES = 5;

export type DemoProfileKey = "small" | "medium" | "large" | "dealer";

export const DEMO_PROFILES: Record<DemoProfileKey, {
  label: string;
  description: string;
  ranges: { customers: [number, number]; machinesPerCustomer: [number, number]; jobs: [number, number]; quotes: [number, number]; invoices: [number, number]; suppliers: [number, number]; purchaseOrders: [number, number]; stockItems: [number, number] };
}> = {
  small: {
    label: "Small workshop",
    description: "A compact independent workshop with a small field-service team.",
    ranges: { customers: [12, 18], machinesPerCustomer: [1, 3], jobs: [55, 90], quotes: [12, 22], invoices: [32, 55], suppliers: [3, 4], purchaseOrders: [3, 6], stockItems: [10, 14] },
  },
  medium: {
    label: "Medium service business",
    description: "A busy multi-brand agricultural engineering business.",
    ranges: { customers: [20, 34], machinesPerCustomer: [2, 4], jobs: [105, 185], quotes: [22, 42], invoices: [58, 105], suppliers: [4, 6], purchaseOrders: [5, 10], stockItems: [12, 16] },
  },
  large: {
    label: "Large workshop",
    description: "A larger regional workshop with substantial service history.",
    ranges: { customers: [36, 52], machinesPerCustomer: [2, 5], jobs: [185, 280], quotes: [38, 65], invoices: [105, 165], suppliers: [5, 6], purchaseOrders: [8, 14], stockItems: [14, 16] },
  },
  dealer: {
    label: "Dealer-style operation",
    description: "A high-volume dealership-style service and parts environment.",
    ranges: { customers: [48, 68], machinesPerCustomer: [2, 5], jobs: [240, 360], quotes: [50, 85], invoices: [145, 220], suppliers: [6, 6], purchaseOrders: [10, 18], stockItems: [16, 16] },
  },
};

const demoCompanyPrefixes = [
  "Oakridge", "Blackwater", "Northfield", "Riverbank", "Willowbrook", "Meadowview",
  "Crossfield", "Highgrove", "Stonebridge", "Westmoor", "Hillcrest", "Springvale",
  "Ridgeway", "Cedarbank", "Ashgrove", "Silvermead", "Glenmore", "Lakeside",
];

const demoCompanySuffixes = [
  "Agricultural Services Ltd", "Agri Engineering Ltd", "Farm Services Ltd",
  "Machinery Services Ltd", "Rural Engineering Ltd", "Agri Repairs Ltd",
  "Field Service Engineering Ltd", "Agricultural Engineering Ltd",
];

const demoCompanyArchetypes = [
  { businessType: "Agricultural engineering", label: "Independent agricultural engineer" },
  { businessType: "Agricultural machinery service", label: "Multi-brand machinery workshop" },
  { businessType: "Dairy engineering", label: "Dairy and farm service specialist" },
  { businessType: "Agricultural contracting support", label: "Field-service engineering company" },
] as const;

const demoBrandPalettes = [
  ["#103D2E", "#E8EFEA"], ["#174A3A", "#EAF4EF"], ["#244B36", "#EEF4EA"],
  ["#315B43", "#EFF5F0"], ["#0F5132", "#E9F5EE"], ["#36563E", "#F0F5EF"],
] as const;

const technicianNames = [
  "Demo Engineer A",
  "Demo Engineer B",
  "Demo Engineer C",
  "Demo Engineer D",
  "Demo Engineer E",
  "Demo Engineer F",
];

const customerNamePrefixes = [
  "Moorview", "Willowbrook", "Stonefield", "Northbank", "Oakridge", "Cedarvale",
  "Greenridge", "Rivermere", "Hillcrest", "Meadowgate", "Foxglove", "Ashgrove",
  "Brookfield", "Heatherbank", "Silvermead", "Redstone", "Glenview", "Birchfield",
  "Westmoor", "Lakeside", "Springbank", "Highgrove", "Bramblehill", "Ridgeway",
];

const customerNameSuffixes = [
  "Farming Ltd", "Agri Services Ltd", "Dairy Ltd", "Contracting Ltd",
  "Farm Enterprises", "Agricultural Services", "Livestock Ltd", "Rural Contractors",
];

const demoContactFirstNames = [
  "Alex", "Jamie", "Morgan", "Taylor", "Jordan", "Casey", "Riley", "Cameron",
  "Avery", "Rowan", "Robin", "Drew",
];

const demoContactLastNames = [
  "Demo", "Sample", "Example", "Testfield", "Mockridge", "Seedwell",
];

const machineTemplates = [
  ["New Holland", "T7.270", "Tractor"], ["New Holland", "T6.180", "Tractor"],
  ["John Deere", "6155R", "Tractor"], ["John Deere", "6250R", "Tractor"],
  ["Massey Ferguson", "7726", "Tractor"], ["Fendt", "724 Vario", "Tractor"],
  ["Claas", "Arion 650", "Tractor"], ["JCB", "435S", "Loading Shovel"],
  ["JCB", "542-70", "Telehandler"], ["Case IH", "Puma 240", "Tractor"],
  ["Kuhn", "FC 313", "Mower"], ["Krone", "Comprima V150", "Baler"],
  ["Kverneland", "ES 100", "Plough"], ["New Holland", "CX8.80", "Combine"],
];

const jobFaults = [
  "Annual service and inspection",
  "Hydraulic pressure low under load",
  "Air conditioning not cooling",
  "PTO intermittently disengaging",
  "Engine warning lamp and reduced power",
  "Front axle oil leak",
  "Electrical fault on lighting circuit",
  "Transmission calibration required",
  "AdBlue warning and SCR diagnostic",
  "Implement hydraulic coupler leaking",
  "Brake pedal travel excessive",
  "Workshop inspection before busy season",
];

const stockCatalog = [
  ["FLT-ENG-001", "Engine oil filter", "Filters", "Fleetguard", 12.5, 24.5],
  ["FLT-FUEL-010", "Primary fuel filter", "Filters", "Donaldson", 18.2, 36.0],
  ["FLT-AIR-025", "Outer air filter", "Filters", "MANN", 31.0, 58.0],
  ["OIL-15W40-20", "15W-40 engine oil 20L", "Lubricants", "Agrimax", 49.0, 78.0],
  ["OIL-UTTO-20", "UTTO transmission oil 20L", "Lubricants", "Agrimax", 55.0, 88.0],
  ["HYD-46-20", "ISO 46 hydraulic oil 20L", "Lubricants", "Agrimax", 41.0, 69.0],
  ["BRG-6205", "6205 2RS bearing", "Bearings", "SKF", 8.5, 18.5],
  ["BRG-6207", "6207 2RS bearing", "Bearings", "SKF", 12.0, 25.0],
  ["BELT-A42", "A42 drive belt", "Belts", "Gates", 7.8, 16.0],
  ["BELT-B55", "B55 drive belt", "Belts", "Gates", 11.2, 24.0],
  ["HYD-1-2-BSP", "1/2 BSP hydraulic fitting", "Hydraulics", "Parker", 3.2, 8.5],
  ["HYD-3-4-BSP", "3/4 BSP hydraulic fitting", "Hydraulics", "Parker", 5.1, 12.0],
  ["AC-PAG46", "PAG 46 air-con oil 250ml", "Air Conditioning", "Denso", 7.0, 17.5],
  ["AC-VALVE-R134", "R134a service valve core", "Air Conditioning", "Waeco", 1.2, 4.5],
  ["ELEC-RELAY40", "40A automotive relay", "Electrical", "Bosch", 2.8, 7.5],
  ["ELEC-FUSE30", "30A blade fuse pack", "Electrical", "Littelfuse", 2.0, 5.5],
];

function isoDaysAgo(days: number) {
  const date = new Date(Date.now() - days * 86_400_000);
  return date.toISOString();
}

function dateDaysAgo(days: number) {
  return isoDaysAgo(days).slice(0, 10);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "company";
}

function randomChoice<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDemoCompanyName() {
  const suffix = randomChoice(demoCompanySuffixes).replace(/ Ltd$/, "");
  return `${randomChoice(demoCompanyPrefixes)} Demo ${suffix} ${randomToken(3)} Ltd`;
}

function syntheticInvoicePrefix(companyId: string) {
  return `DM${companyId.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase().padEnd(4, "X")}`;
}

function randomToken(tokenLength = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let index = 0; index < tokenLength; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

function buildSyntheticCustomers(count: number) {
  const used = new Set<string>();
  const customers: Array<{ businessName: string; contactName: string; demoReference: string }> = [];

  for (let index = 0; index < count; index += 1) {
    let businessName = "";
    do {
      const suffix = randomChoice(customerNameSuffixes).replace(/ Ltd$/, "");
      businessName = `${randomChoice(customerNamePrefixes)} Demo ${suffix} ${randomToken(3)}`;
      if (!businessName.endsWith("Ltd")) businessName = `${businessName} Ltd`;
      if (used.has(businessName)) businessName = `${businessName.replace(/ Ltd$/, "")} ${randomToken(3)} Ltd`;
    } while (used.has(businessName));
    used.add(businessName);

    customers.push({
      businessName,
      contactName: `${randomChoice(demoContactFirstNames)} ${randomChoice(demoContactLastNames)}`,
      demoReference: `DEMO-CUST-${String(index + 1).padStart(3, "0")}-${randomToken(4)}`,
    });
  }

  return customers;
}

function syntheticRegistration(machineType: string) {
  if (!["Tractor", "Telehandler", "Loading Shovel"].includes(machineType)) return "";
  return `DEMO-${machineType.slice(0, 2).toUpperCase()}-${randomToken(6)}`;
}

function syntheticSerial(make: string) {
  const makeCode = make.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
  return `DEMO-${makeCode}-${randomToken(10)}`;
}

type SupabaseLikeError = { code?: string | null; message: string; details?: string | null; hint?: string | null };

function assertNoError(label: string, error: SupabaseLikeError | null) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

/**
 * PostgREST reports absent optional tables as PGRST205 / "schema cache" errors,
 * while PostgreSQL itself may report 42P01 (undefined table) or 42703
 * (undefined column). Demo cleanup must tolerate these because AgriCore's optional
 * modules evolve independently across installations.
 */
function isOptionalSchemaError(error: SupabaseLikeError | null) {
  if (!error) return false;
  const code = String(error.code ?? "").toUpperCase();
  const message = String(error.message ?? "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    code === "42703" ||
    /could not find the table .* in the schema cache/i.test(message) ||
    /relation .* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message)
  );
}

async function deleteCompanyRowsIfPresent(admin: SupabaseAdminClient, table: string, companyId: string) {
  const { error } = await admin.from(table).delete().eq("company_id", companyId);
  if (isOptionalSchemaError(error as SupabaseLikeError | null)) {
    console.info(`[demo] Skipping optional/missing table ${table}`);
    return false;
  }
  if (error) throw new Error(`Unable to clear ${table}: ${error.message}`);
  return true;
}

async function insertRows(admin: SupabaseAdminClient, table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return [];
  const { data, error } = await admin.from(table).insert(rows).select();
  assertNoError(`Unable to seed ${table}`, error);
  return (data ?? []) as Record<string, unknown>[];
}

export async function clearDemoCompanyData(admin: SupabaseAdminClient, companyId: string) {
  // Dependency-aware cleanup. Tables are deliberately ordered from the most
  // deeply nested records back to their parents. Missing optional tables are
  // ignored so the demo engine can run across older AgriCore installations.
  const tables = [
    "machine_diagnostic_faults",
    "machine_diagnostic_reports",
    "job_photos",
    "job_parts_used",
    "job_parts",
    "job_labour_entries",
    "job_travel_sessions",
    "job_completions",
    "job_assignments",
    "invoice_items",
    "invoices",
    "quote_items",
    "quotes",
    "purchase_order_lines",
    "stock_movements",
    "purchase_orders",
    "machine_hour_readings",
    "machine_service_events",
    "machine_service_programmes",
    "service_programme_items",
    "service_programmes",
    "jobs",
    "machines",
    "stock_items",
    "stock_suppliers",
    "customers",
  ];

  for (const table of tables) {
    await deleteCompanyRowsIfPresent(admin, table, companyId);
  }
}

async function clearDemoCompanyConfiguration(admin: SupabaseAdminClient, companyId: string) {
  const tables = [
    "company_role_permissions",
    "company_features",
    "company_subscriptions",
    "company_onboarding",
    "company_field_operations_settings",
    "company_payment_settings",
    "company_settings",
    "company_member_roles",
    "company_member_profiles",
    "company_members",
  ];

  for (const table of tables) {
    await deleteCompanyRowsIfPresent(admin, table, companyId);
  }
}

export async function deleteDemoCompany(admin: SupabaseAdminClient, companyId: string) {
  await clearDemoCompanyData(admin, companyId);
  await clearDemoCompanyConfiguration(admin, companyId);

  const { error } = await admin.from("companies").delete().eq("id", companyId);
  assertNoError("Unable to delete demo company", error);
}

export async function refreshDemoCompanyIdentity(admin: SupabaseAdminClient, companyId: string) {
  const name = generateDemoCompanyName();
  const archetype = randomChoice(demoCompanyArchetypes);
  const [primaryColour, secondaryColour] = randomChoice(demoBrandPalettes);

  const { error: companyError } = await admin.from("companies").update({
    company_name: name,
    business_type: archetype.businessType,
  }).eq("id", companyId);
  assertNoError("Unable to refresh demo company", companyError);

  const { error: settingsError } = await admin.from("company_settings").update({
    company_name: name,
    contact_line: `DEMO COMPANY · ${archetype.label} · Sample data only`,
    primary_colour: primaryColour,
    secondary_colour: secondaryColour,
    payment_terms_days: randomChoice([7, 14, 30] as const),
    updated_at: new Date().toISOString(),
  }).eq("company_id", companyId);
  if (settingsError && !/relation .* does not exist/i.test(settingsError.message)) {
    throw new Error(`Unable to refresh demo company settings: ${settingsError.message}`);
  }

  return { name, primaryColour, secondaryColour, archetype };
}

export async function seedDemoCompanyData(admin: SupabaseAdminClient, companyId: string, profileKey: DemoProfileKey = "medium") {
  const profile = DEMO_PROFILES[profileKey] ?? DEMO_PROFILES.medium;
  const customerCount = randomInt(...profile.ranges.customers);
  const machineCount = randomInt(customerCount * profile.ranges.machinesPerCustomer[0], customerCount * profile.ranges.machinesPerCustomer[1]);
  const jobCount = randomInt(...profile.ranges.jobs);
  const quoteCount = randomInt(...profile.ranges.quotes);
  const invoiceCount = randomInt(...profile.ranges.invoices);
  const supplierCount = randomInt(...profile.ranges.suppliers);
  const purchaseOrderCount = randomInt(...profile.ranges.purchaseOrders);
  const stockItemCount = Math.min(stockCatalog.length, randomInt(...profile.ranges.stockItems));
  const invoicePrefix = syntheticInvoicePrefix(companyId);

  const syntheticCustomers = buildSyntheticCustomers(customerCount);
  const customers = await insertRows(admin, "customers", syntheticCustomers.map((customer, index) => ({
    company_id: companyId,
    business_name: customer.businessName,
    contact_name: customer.contactName,
    customer_type: index % 4 === 0 ? "Contractor" : index % 3 === 0 ? "Dairy" : "Farm",
    // Deliberately non-routable demo contact details. They cannot belong to a real customer.
    phone: `DEMO-${String(index + 1).padStart(3, "0")}-${randomToken(4)}`,
    email: `customer-${String(index + 1).padStart(3, "0")}-${randomToken(4).toLowerCase()}@example.invalid`,
    address: `Unit ${1 + (index % 18)}, Demo Business Park`,
    postcode: `DEMO ${String(index + 1).padStart(3, "0")}`,
    vat_number: "",
    notes: `${customer.demoReference} · Synthetic sample record. ${index % 5 === 0 ? "Priority service customer." : ""}`.trim(),
    created_at: isoDaysAgo(320 - index * 9),
  })));

  const machines: Record<string, unknown>[] = [];
  for (let i = 0; i < machineCount; i += 1) {
    const customer = randomChoice(customers);
    const [make, model, type] = randomChoice(machineTemplates);
    machines.push({
      company_id: companyId,
      customer_id: customer.id,
      make,
      model,
      machine_type: type,
      year: randomInt(2011, 2026),
      registration: syntheticRegistration(type),
      serial_number: syntheticSerial(make),
      hours: randomInt(350, 9800),
      usage_profile: randomChoice(["light", "medium", "heavy"] as const),
      estimated_hours_per_week: randomInt(8, 48),
      notes: `Synthetic demo machine · ${i % 7 === 0 ? "Service contract machine." : "Sample record."}`,
      created_at: isoDaysAgo(300 - (i % 60) * 4),
    });
  }
  const machineRows = await insertRows(admin, "machines", machines);

  const jobs: Record<string, unknown>[] = [];
  for (let i = 0; i < jobCount; i += 1) {
    const machine = randomChoice(machineRows);
    const openedDaysAgo = randomInt(0, 180);
    const isRecentOpen = openedDaysAgo < 28 && Math.random() < 0.55;
    const status = isRecentOpen
      ? randomChoice(["open", "in_progress", "waiting_parts", "waiting_customer"] as const)
      : "completed";
    jobs.push({
      company_id: companyId,
      customer_id: machine.customer_id,
      machine_id: machine.id,
      engineer_name: randomChoice(technicianNames),
      priority: Math.random() < 0.06 ? "urgent" : Math.random() < 0.18 ? "high" : "normal",
      status,
      fault_reported: randomChoice(jobFaults),
      machine_hours: Number(machine.hours ?? 0) + randomInt(0, 90),
      opened_date: dateDaysAgo(openedDaysAgo),
      completed_date: status === "completed" ? dateDaysAgo(Math.max(0, openedDaysAgo - (i % 3))) : null,
      created_at: isoDaysAgo(openedDaysAgo),
      updated_at: isoDaysAgo(Math.max(0, openedDaysAgo - 1)),
    });
  }
  const jobRows = await insertRows(admin, "jobs", jobs);

  const quoteRows = await insertRows(admin, "quotes", Array.from({ length: quoteCount }, (_, i) => {
    const machine = randomChoice(machineRows);
    const status = randomChoice(["draft", "sent", "sent", "accepted", "accepted", "rejected", "converted"] as const);
    return {
      company_id: companyId,
      customer_id: machine.customer_id,
      machine_id: machine.id,
      status,
      title: randomChoice(["Major service", "Hydraulic repair", "Air conditioning repair", "PTO overhaul", "Pre-season inspection", "Electrical diagnostic", "Workshop overhaul"] as const),
      description: "Demo quotation generated for the AgriCore sales environment.",
      quote_date: dateDaysAgo(i * 3 + 2),
      expiry_date: dateDaysAgo(i * 3 - 28),
      discount_type: null,
      discount_value: 0,
      vat_rate: 20,
      sent_at: status === "draft" ? null : isoDaysAgo(i * 3 + 2),
      created_at: isoDaysAgo(i * 3 + 3),
    };
  }));

  const quoteItems: Record<string, unknown>[] = [];
  quoteRows.forEach((quote, i) => {
    const price = randomInt(260, 1450);
    quoteItems.push(
      { company_id: companyId, quote_id: quote.id, item_type: "labour", description: "Workshop / field labour", quantity: 4 + (i % 6), unit_cost: 35, unit_price: 68, sort_order: 0 },
      { company_id: companyId, quote_id: quote.id, item_type: "part", description: "Parts and consumables", quantity: 1, unit_cost: price * 0.58, unit_price: price, sort_order: 1 },
    );
  });
  await insertRows(admin, "quote_items", quoteItems);

  const invoices: Record<string, unknown>[] = [];
  for (let i = 0; i < invoiceCount; i += 1) {
    const job = randomChoice(jobRows);
    const customer = customers.find((row) => row.id === job.customer_id) ?? customers[0];
    const issueDaysAgo = randomInt(2, 190);
    const subtotal = randomInt(180, 1750) + randomChoice([0, 0.5] as const);
    const vat = Math.round(subtotal * 0.2 * 100) / 100;
    const total = subtotal + vat;
    const status = Math.random() < 0.14 ? "overdue" : Math.random() < 0.24 ? "sent" : "paid";
    invoices.push({
      company_id: companyId,
      invoice_number: `${invoicePrefix}-${String(1001 + i).padStart(4, "0")}`,
      job_id: job.id,
      customer_id: customer.id,
      status,
      issue_date: dateDaysAgo(issueDaysAgo),
      due_date: dateDaysAgo(issueDaysAgo - 14),
      subtotal,
      vat_rate: 20,
      vat_amount: vat,
      total,
      amount_paid: status === "paid" ? total : 0,
      customer_name: customer.business_name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      billing_address: `${customer.address}, ${customer.postcode}`,
      notes: "Demo invoice — no payment is due.",
      payment_terms: "Payment due within 14 days",
      paid_at: status === "paid" ? isoDaysAgo(Math.max(0, issueDaysAgo - 9)) : null,
      created_at: isoDaysAgo(issueDaysAgo),
      updated_at: isoDaysAgo(Math.max(0, issueDaysAgo - 1)),
    });
  }
  const invoiceRows = await insertRows(admin, "invoices", invoices);
  const invoiceItems: Record<string, unknown>[] = [];
  invoiceRows.forEach((invoice) => {
    const labourHours = randomInt(1, 9);
    const partPrice = randomInt(65, 620);
    invoiceItems.push(
      { company_id: companyId, invoice_id: invoice.id, item_type: "labour", description: "Engineer labour", quantity: labourHours, unit_price: 68, line_total: labourHours * 68, sort_order: 0 },
      { company_id: companyId, invoice_id: invoice.id, item_type: "part", description: "Parts and workshop consumables", quantity: 1, unit_price: partPrice, line_total: partPrice, sort_order: 1 },
    );
  });
  await insertRows(admin, "invoice_items", invoiceItems);

  const demoSupplierNames = ["Demo Parts Direct", "Sample Agri Components", "Example Hydraulics", "Demo Workshop Supplies", "Sample Filter Co", "Example Machinery Parts"];
  const suppliers = await insertRows(admin, "stock_suppliers", demoSupplierNames.slice(0, supplierCount).map((name, i) => ({
    company_id: companyId, name, contact_name: `Demo Supplier Contact ${i + 1}`, email: `supplier-${i + 1}@example.invalid`, phone: `DEMO-SUP-${String(i + 1).padStart(3, "0")}`, account_reference: `DEMO-SUP-${100 + i}-${randomToken(2)}`, active: true,
  })));

  const stockTemplates = [...stockCatalog].sort(() => Math.random() - 0.5).slice(0, stockItemCount);
  const stock = await insertRows(admin, "stock_items", stockTemplates.map(([part, description, category, manufacturer, cost, price], i) => ({
    company_id: companyId, part_number: `DEMO-${part}-${randomToken(3)}`, description, category, manufacturer, supplier: suppliers[i % suppliers.length]?.name ?? "Demo Supplier", unit: i < 6 ? "each" : "each", unit_cost: cost, unit_price: price, vat_rate: 20, quantity_in_stock: i % 5 === 0 ? 2 : 8 + (i * 3) % 28, quantity_reserved: 0, minimum_stock: 4, reorder_level: 6, location: `Stores ${String.fromCharCode(65 + (i % 4))}-${1 + (i % 6)}`, active: true,
  })));

  const purchaseOrders = await insertRows(admin, "purchase_orders", Array.from({ length: purchaseOrderCount }, (_, i) => {
    const subtotal = randomInt(300, 1900);
    const vatTotal = Math.round(subtotal * 0.2 * 100) / 100;
    return {
      company_id: companyId,
      supplier_id: suppliers[i % suppliers.length].id,
      supplier_name: suppliers[i % suppliers.length].name,
      order_number: `PO-DEMO-${randomToken(4)}-${String(201 + i)}`,
      status: randomChoice(["draft", "ordered", "part_received", "received"] as const),
      order_date: dateDaysAgo(randomInt(1, 45)),
      expected_date: dateDaysAgo(randomInt(-14, 20)),
      notes: "Synthetic demo purchase order.",
      subtotal,
      vat_total: vatTotal,
      total: subtotal + vatTotal,
    };
  }));
  const poLines: Record<string, unknown>[] = [];
  purchaseOrders.forEach((po, i) => {
    for (let j = 0; j < 3; j += 1) {
      const item = stock[(i * 2 + j) % stock.length];
      poLines.push({ company_id: companyId, purchase_order_id: po.id, stock_item_id: item.id, part_number: item.part_number, description: item.description, quantity_ordered: 3 + j * 2, quantity_received: po.status === "received" ? 3 + j * 2 : po.status === "part_received" ? j + 1 : 0, unit_cost: item.unit_cost, vat_rate: 20 });
    }
  });
  await insertRows(admin, "purchase_order_lines", poLines);

  // Labour history drives technician/reports metrics. If the installation has the table,
  // create realistic entries; otherwise keep the demo usable without blocking creation.
  const labourRows = jobRows.filter((job) => job.status === "completed").slice(0, Math.min(120, Math.max(50, jobRows.length - 20))).map((job, i) => ({
    company_id: companyId,
    job_id: job.id,
    engineer_name: job.engineer_name,
    labour_date: String(job.opened_date ?? dateDaysAgo(i % 90)),
    start_time: new Date(String(job.created_at ?? isoDaysAgo(i % 90))).toISOString(),
    finish_time: new Date(new Date(String(job.created_at ?? isoDaysAgo(i % 90))).getTime() + (1.5 + (i % 7) * 0.75) * 3_600_000).toISOString(),
    break_minutes: i % 4 === 0 ? 15 : 0,
    hours: 1.5 + (i % 7) * 0.75,
    hourly_rate: 68,
    description: "Demo labour entry",
    entry_status: "completed",
  }));
  const labourResult = await admin.from("job_labour_entries").insert(labourRows);
  if (labourResult.error) console.warn("Demo labour rows skipped:", labourResult.error.message);

  return {
    customers: customers.length,
    machines: machineRows.length,
    jobs: jobRows.length,
    quotes: quoteRows.length,
    invoices: invoiceRows.length,
    stockItems: stock.length,
    suppliers: suppliers.length,
    purchaseOrders: purchaseOrders.length,
    profile: profileKey,
    profileLabel: profile.label,
  };
}

/**
 * Create the minimum company records using the same ordering as AgriCore's
 * production onboarding flow. Membership MUST exist before profile/role rows
 * because current databases enforce a membership foreign key.
 *
 * Demo workspaces intentionally reuse the signed-in platform administrator's
 * auth user. No synthetic auth users are created.
 */
async function bootstrapDemoCompanyWorkspace(
  admin: SupabaseAdminClient,
  company: { id: string; company_name: string },
  owner: { userId: string; fullName: string; email: string },
  branding: { archetypeLabel: string; primaryColour: string; secondaryColour: string },
) {
  const now = new Date().toISOString();

  const { error: membershipError } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: owner.userId,
    is_active: true,
    joined_at: now,
    updated_at: now,
  });
  assertNoError("Unable to create demo company membership", membershipError);

  const { error: profileError } = await admin.from("company_member_profiles").upsert({
    company_id: company.id,
    user_id: owner.userId,
    full_name: "Demo Workspace Manager",
    job_title: "Service Manager",
    is_active: true,
    updated_at: now,
  }, { onConflict: "company_id,user_id" });
  assertNoError("Unable to create demo company profile", profileError);

  const { error: roleError } = await admin.from("company_member_roles").upsert({
    company_id: company.id,
    user_id: owner.userId,
    role: "company_admin",
    updated_at: now,
  }, { onConflict: "company_id,user_id" });
  assertNoError("Unable to assign demo company administrator role", roleError);

  const configurationResults = await Promise.all([
    admin.from("company_settings").insert({
      company_id: company.id,
      company_name: company.company_name,
      contact_line: `DEMO COMPANY · ${branding.archetypeLabel} · Sample data only`,
      email: "demo-company@example.invalid",
      primary_colour: branding.primaryColour,
      secondary_colour: branding.secondaryColour,
      payment_terms_days: randomChoice([7, 14, 30] as const),
      country_code: "GB",
      currency_code: "GBP",
      locale: "en-GB",
      timezone: "Europe/London",
      tax_name: "VAT",
      default_tax_rate: 20,
      date_format: "DD/MM/YYYY",
      time_format: "24",
      week_start: "monday",
      measurement_system: "metric",
      updated_at: now,
    }),
    admin.from("company_payment_settings").insert({ company_id: company.id }),
    admin.from("company_field_operations_settings").insert({ company_id: company.id }),
    admin.from("company_onboarding").insert({
      company_id: company.id,
      current_step: 6,
      business_details_complete: true,
      invoice_settings_complete: true,
      payment_settings_complete: true,
      team_setup_complete: true,
      completed_at: now,
    }),
  ]);

  const failedConfiguration = configurationResults.find((result) => result.error)?.error;
  if (failedConfiguration) {
    throw new Error(`Unable to configure demo company: ${failedConfiguration.message}`);
  }

  const { data: permissions, error: permissionLookupError } = await admin
    .from("app_permissions")
    .select("permission_key");
  if (permissionLookupError && !isOptionalSchemaError(permissionLookupError as SupabaseLikeError)) {
    throw new Error(`Unable to load demo permissions: ${permissionLookupError.message}`);
  }
  if (permissions?.length) {
    const { error: permissionError } = await admin.from("company_role_permissions").upsert(
      permissions.map((row: { permission_key: string }) => ({
        company_id: company.id,
        role: "company_admin",
        permission_key: row.permission_key,
        allowed: true,
      })),
      { onConflict: "company_id,role,permission_key" },
    );
    if (permissionError && !isOptionalSchemaError(permissionError as SupabaseLikeError)) {
      throw new Error(`Unable to seed demo permissions: ${permissionError.message}`);
    }
  }

  const { data: defaults, error: featureLookupError } = await admin
    .from("platform_features")
    .select("feature_key,default_enabled");
  if (featureLookupError && !isOptionalSchemaError(featureLookupError as SupabaseLikeError)) {
    throw new Error(`Unable to load demo feature defaults: ${featureLookupError.message}`);
  }
  if (defaults?.length) {
    const { error: featureError } = await admin.from("company_features").upsert(
      defaults.map((feature: { feature_key: string; default_enabled: boolean | null }) => ({
        company_id: company.id,
        feature_key: feature.feature_key,
        enabled: feature.default_enabled !== false,
      })),
      { onConflict: "company_id,feature_key" },
    );
    if (featureError && !isOptionalSchemaError(featureError as SupabaseLikeError)) {
      throw new Error(`Unable to seed demo feature flags: ${featureError.message}`);
    }
  }
}

export async function createDemoCompany(admin: SupabaseAdminClient, owner: { userId: string; fullName: string; email: string }, requestedName?: string, profileKey: DemoProfileKey = "medium") {
  const name = requestedName?.trim() || generateDemoCompanyName();
  const archetype = randomChoice(demoCompanyArchetypes);
  const [primaryColour, secondaryColour] = randomChoice(demoBrandPalettes);
  const suffix = `${Date.now().toString(36).slice(-4)}${randomToken(3).toLowerCase()}`;
  const slug = `${DEMO_SLUG_PREFIX}${slugify(name)}-${suffix}`;
  const now = new Date().toISOString();
  const { data: company, error } = await admin.from("companies").insert({
    company_name: name,
    slug,
    email: owner.email,
    business_type: archetype.businessType,
    billing_mode: "demo",
    created_by: owner.userId,
    is_active: true,
  }).select("id,company_name,slug").single();
  assertNoError("Unable to create demo company", error);
  if (!company) throw new Error("Unable to create demo company.");

  try {
    await bootstrapDemoCompanyWorkspace(
      admin,
      company,
      owner,
      {
        archetypeLabel: archetype.label,
        primaryColour,
        secondaryColour,
      },
    );

    const counts = await seedDemoCompanyData(admin, company.id, profileKey);
    return { company, counts };
  } catch (seedError) {
    try {
      await deleteDemoCompany(admin, company.id);
    } catch (cleanupError) {
      console.error("Unable to fully clean failed demo company:", cleanupError);
    }
    throw seedError;
  }
}
