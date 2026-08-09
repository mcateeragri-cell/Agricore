import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await requirePermission(["invoices.view", "invoices.manage"]);
  const supabase = await createSupabaseServerClient();

  const [{ data: jobs, error: jobsError }, { data: invoices, error: invoicesError }] = await Promise.all([
    supabase
      .from("jobs")
      .select("job_number, status, priority, opened_date, engineer_name, fault_reported")
      .eq("company_id", user.companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("invoice_number, status, issue_date, due_date, total, amount_paid, customer_name")
      .eq("company_id", user.companyId)
      .order("created_at", { ascending: false }),
  ]);

  if (jobsError || invoicesError) {
    return NextResponse.json(
      { error: jobsError?.message ?? invoicesError?.message ?? "Unable to export reports." },
      { status: 500 },
    );
  }

  const lines: string[] = [];
  lines.push("AGRiCORE JOBS REPORT");
  lines.push(["Job Number", "Status", "Priority", "Opened", "Engineer", "Fault"].map(csvCell).join(","));
  for (const job of jobs ?? []) {
    lines.push([
      job.job_number,
      job.status,
      job.priority,
      job.opened_date,
      job.engineer_name,
      job.fault_reported,
    ].map(csvCell).join(","));
  }

  lines.push("");
  lines.push("AGRICORE INVOICES REPORT");
  lines.push(["Invoice Number", "Status", "Issue Date", "Due Date", "Customer", "Total", "Amount Paid"].map(csvCell).join(","));
  for (const invoice of invoices ?? []) {
    lines.push([
      invoice.invoice_number,
      invoice.status,
      invoice.issue_date,
      invoice.due_date,
      invoice.customer_name,
      invoice.total,
      invoice.amount_paid,
    ].map(csvCell).join(","));
  }

  const safeCompany = user.companyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "company";

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agricore-${safeCompany}-report.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
