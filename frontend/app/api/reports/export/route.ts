import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function rangeStart(range: string) {
  if (range === "all") return null;
  const result = new Date();
  result.setHours(0, 0, 0, 0);
  if (range === "30d") result.setDate(result.getDate() - 29);
  else if (range === "90d") result.setDate(result.getDate() - 89);
  else result.setMonth(result.getMonth() - 11, 1);
  return result.toISOString();
}

export async function GET(request: NextRequest) {
  const moduleGate = await requireApiModule("reports");
  if (moduleGate) return moduleGate;

  const user = await requirePermission(["invoices.view", "invoices.manage"]);
  const supabase = await createSupabaseServerClient();
  const requested = request.nextUrl.searchParams.get("range") ?? "12m";
  const range = ["30d", "90d", "12m", "all"].includes(requested) ? requested : "12m";
  const start = rangeStart(range);
  const allowedSections = new Set(["jobs", "invoices", "labour", "stock"]);
  const requestedSections = (request.nextUrl.searchParams.get("sections") ?? "jobs,invoices,labour,stock")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => allowedSections.has(value));
  const sections = new Set(requestedSections.length ? requestedSections : ["jobs", "invoices", "labour", "stock"]);

  let jobsQuery = supabase
    .from("jobs")
    .select("job_number,status,priority,opened_date,engineer_name,fault_reported")
    .eq("company_id", user.companyId)
    .order("created_at", { ascending: false });

  let invoicesQuery = supabase
    .from("invoices")
    .select("invoice_number,status,issue_date,due_date,customer_name,subtotal,vat_amount,total,amount_paid,paid_at")
    .eq("company_id", user.companyId)
    .order("created_at", { ascending: false });

  let labourQuery = supabase
    .from("job_labour_entries")
    .select("engineer_name,labour_date,hours,hourly_rate,description,entry_status")
    .eq("company_id", user.companyId)
    .order("labour_date", { ascending: false });

  if (start) {
    jobsQuery = jobsQuery.gte("opened_date", start.slice(0, 10));
    invoicesQuery = invoicesQuery.gte("issue_date", start.slice(0, 10));
    labourQuery = labourQuery.gte("labour_date", start.slice(0, 10));
  }

  const [jobsResult, invoicesResult, labourResult, stockResult] = await Promise.all([
    jobsQuery,
    invoicesQuery,
    labourQuery,
    supabase
      .from("stock_items")
      .select("part_number,description,category,manufacturer,supplier,quantity_in_stock,minimum_stock,unit_cost,unit_price,location")
      .eq("company_id", user.companyId)
      .eq("active", true)
      .order("description"),
  ]);

  const firstError = jobsResult.error ?? invoicesResult.error ?? labourResult.error ?? stockResult.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const lines: string[] = [];
  lines.push(["AgriCore Reports Export", user.companyName, `Range: ${range}`].map(csvCell).join(","));
  lines.push("");

  if (sections.has("jobs")) {
    lines.push("JOBS");
    lines.push(["Job Number", "Status", "Priority", "Opened", "Engineer", "Fault"].map(csvCell).join(","));
    for (const job of jobsResult.data ?? []) {
      lines.push([job.job_number, job.status, job.priority, job.opened_date, job.engineer_name, job.fault_reported].map(csvCell).join(","));
    }
    lines.push("");
  }

  if (sections.has("invoices")) {
    lines.push("INVOICES");
    lines.push(["Invoice Number", "Status", "Issue Date", "Due Date", "Customer", "Subtotal", "VAT", "Total", "Amount Paid", "Paid At"].map(csvCell).join(","));
    for (const invoice of invoicesResult.data ?? []) {
      lines.push([invoice.invoice_number, invoice.status, invoice.issue_date, invoice.due_date, invoice.customer_name, invoice.subtotal, invoice.vat_amount, invoice.total, invoice.amount_paid, invoice.paid_at].map(csvCell).join(","));
    }
    lines.push("");
  }

  if (sections.has("labour")) {
    lines.push("LABOUR");
    lines.push(["Engineer", "Date", "Hours", "Hourly Rate", "Labour Value", "Status", "Description"].map(csvCell).join(","));
    for (const entry of labourResult.data ?? []) {
      const value = Number(entry.hours ?? 0) * Number(entry.hourly_rate ?? 0);
      lines.push([entry.engineer_name, entry.labour_date, entry.hours, entry.hourly_rate, value.toFixed(2), entry.entry_status, entry.description].map(csvCell).join(","));
    }
    lines.push("");
  }

  if (sections.has("stock")) {
    lines.push("STOCK");
    lines.push(["Part Number", "Description", "Category", "Manufacturer", "Supplier", "On Hand", "Minimum", "Unit Cost", "Cost Value", "Unit Price", "Retail Value", "Location"].map(csvCell).join(","));
    for (const item of stockResult.data ?? []) {
      const quantity = Number(item.quantity_in_stock ?? 0);
      const cost = Number(item.unit_cost ?? 0);
      const price = Number(item.unit_price ?? 0);
      lines.push([item.part_number, item.description, item.category, item.manufacturer, item.supplier, quantity, item.minimum_stock, cost, (quantity * cost).toFixed(2), price, (quantity * price).toFixed(2), item.location].map(csvCell).join(","));
    }
  }

  const safeCompany = user.companyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "company";
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agricore-${safeCompany}-reports-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
