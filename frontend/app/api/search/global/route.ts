import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { loadEffectiveFeatures } from "@/lib/platform/effective-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchResult = {
  id: string;
  type: "customer" | "machine" | "job" | "quote" | "invoice" | "stock" | "user";
  title: string;
  subtitle: string;
  href: string;
};

function cleanQuery(value: string | null) {
  return String(value ?? "")
    .trim()
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function canViewMoney(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  if (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator"
  ) return true;

  if (auth.role === "technician" || auth.role === "apprentice") return false;

  return auth.permissions.includes("invoices.view") || auth.permissions.includes("invoices.manage");
}

function canViewUsers(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.some((permission) =>
      ["users.view", "users.manage_all", "users.manage_technicians"].includes(permission),
    )
  );
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const effective = await loadEffectiveFeatures(admin, auth.companyId);
  const enabledFeatures = new Set(effective.enabledFeatures);
  if (!enabledFeatures.has("global_search")) {
    return NextResponse.json({ error: "Global Search is not enabled for this company." }, { status: 403 });
  }

  const query = cleanQuery(request.nextUrl.searchParams.get("q"));
  if (query.length < 2) {
    return NextResponse.json({ results: [] as SearchResult[] });
  }

  const pattern = `%${query}%`;
  const fieldRole = auth.role === "technician" || auth.role === "apprentice";
  const moneyAllowed = canViewMoney(auth);
  const usersAllowed = canViewUsers(auth);

  const customersPromise = fieldRole
    ? Promise.resolve({ data: [], error: null })
    : admin
        .from("customers")
        .select("id,business_name,contact_name,phone,email")
        .eq("company_id", auth.companyId)
        .or(`business_name.ilike.${pattern},contact_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
        .limit(8);

  const machinesPromise = fieldRole
    ? Promise.resolve({ data: [], error: null })
    : admin
        .from("machines")
        .select("id,customer_id,make,model,registration,serial_number")
        .eq("company_id", auth.companyId)
        .or(`make.ilike.${pattern},model.ilike.${pattern},registration.ilike.${pattern},serial_number.ilike.${pattern}`)
        .limit(8);

  let jobsQuery = admin
    .from("jobs")
    .select("id,job_number,fault_reported,status,engineer_name")
    .eq("company_id", auth.companyId)
    .or(`job_number.ilike.${pattern},fault_reported.ilike.${pattern},engineer_name.ilike.${pattern}`)
    .limit(8);

  if (fieldRole) {
    jobsQuery = jobsQuery.eq("engineer_name", auth.fullName);
  }

  const quotePromise = moneyAllowed && enabledFeatures.has("quotes")
    ? admin
        .from("quotes")
        .select("id,quote_number,title,status,total")
        .eq("company_id", auth.companyId)
        .or(`quote_number.ilike.${pattern},title.ilike.${pattern},status.ilike.${pattern}`)
        .limit(8)
    : Promise.resolve({ data: [], error: null });

  const invoicePromise = moneyAllowed && enabledFeatures.has("invoices")
    ? admin
        .from("invoices")
        .select("id,invoice_number,customer_name,status,total")
        .eq("company_id", auth.companyId)
        .or(`invoice_number.ilike.${pattern},customer_name.ilike.${pattern},status.ilike.${pattern}`)
        .limit(8)
    : Promise.resolve({ data: [], error: null });

  const stockPromise = moneyAllowed && enabledFeatures.has("stock")
    ? admin
        .from("stock_items")
        .select("id,part_number,description,manufacturer,quantity_in_stock")
        .eq("company_id", auth.companyId)
        .eq("active", true)
        .or(`part_number.ilike.${pattern},description.ilike.${pattern},manufacturer.ilike.${pattern}`)
        .limit(8)
    : Promise.resolve({ data: [], error: null });

  const usersPromise = usersAllowed
    ? admin
        .from("company_member_profiles")
        .select("user_id,full_name,job_title,phone,is_active")
        .eq("company_id", auth.companyId)
        .or(`full_name.ilike.${pattern},job_title.ilike.${pattern},phone.ilike.${pattern}`)
        .limit(8)
    : Promise.resolve({ data: [], error: null });

  const [customers, machines, jobs, quotes, invoices, stock, users] = await Promise.all([
    customersPromise,
    machinesPromise,
    jobsQuery,
    quotePromise,
    invoicePromise,
    stockPromise,
    usersPromise,
  ]);

  const firstError =
    customers.error || machines.error || jobs.error || quotes.error || invoices.error || stock.error || users.error;

  if (firstError) {
    console.error("Global search failed:", firstError);
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const results: SearchResult[] = [];

  for (const row of customers.data ?? []) {
    results.push({
      id: String(row.id),
      type: "customer",
      title: String(row.business_name || row.contact_name || "Unnamed customer"),
      subtitle: [row.contact_name, row.phone, row.email].filter(Boolean).join(" · "),
      href: `/customers/${row.id}`,
    });
  }

  for (const row of machines.data ?? []) {
    results.push({
      id: String(row.id),
      type: "machine",
      title: [row.make, row.model].filter(Boolean).join(" ") || "Unnamed machine",
      subtitle: [row.registration, row.serial_number].filter(Boolean).join(" · "),
      href: row.customer_id ? `/customers/${row.customer_id}/machines/${row.id}` : "/machines",
    });
  }

  for (const row of jobs.data ?? []) {
    results.push({
      id: String(row.id),
      type: "job",
      title: String(row.job_number || "Unnumbered job"),
      subtitle: [row.fault_reported, row.engineer_name, row.status].filter(Boolean).join(" · "),
      href: `/jobs/${row.id}`,
    });
  }

  for (const row of quotes.data ?? []) {
    results.push({
      id: String(row.id),
      type: "quote",
      title: String(row.quote_number || "Unnumbered quote"),
      subtitle: [row.title, row.status].filter(Boolean).join(" · "),
      href: `/quotes/${row.id}`,
    });
  }

  for (const row of invoices.data ?? []) {
    results.push({
      id: String(row.id),
      type: "invoice",
      title: String(row.invoice_number || "Unnumbered invoice"),
      subtitle: [row.customer_name, row.status].filter(Boolean).join(" · "),
      href: `/invoices/${row.id}`,
    });
  }

  for (const row of stock.data ?? []) {
    results.push({
      id: String(row.id),
      type: "stock",
      title: String(row.part_number || row.description || "Unnamed stock item"),
      subtitle: [row.description, row.manufacturer, `Qty ${row.quantity_in_stock ?? 0}`].filter(Boolean).join(" · "),
      href: `/stock/${row.id}`,
    });
  }

  for (const row of users.data ?? []) {
    results.push({
      id: String(row.user_id),
      type: "user",
      title: String(row.full_name || "Unnamed user"),
      subtitle: [row.job_title, row.is_active === false ? "Inactive" : "Active"].filter(Boolean).join(" · "),
      href: "/administration/users",
    });
  }

  return NextResponse.json({ results: results.slice(0, 40) }, { headers: { "Cache-Control": "no-store" } });
}
