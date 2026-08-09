import Link from "next/link";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  status: string | null;
  engineer_name: string | null;
  created_at: string | null;
};

type InvoiceRow = {
  id: string;
  status: string | null;
  total: number | string | null;
  amount_paid: number | string | null;
  issue_date: string | null;
  due_date: string | null;
  created_at: string | null;
};

type RoleRow = {
  role: string | null;
};

function asNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function normaliseStatus(value: string | null) {
  return String(value ?? "unknown").trim().toLowerCase();
}

function percentage(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export default async function ReportsPage() {
  const user = await requirePermission(["invoices.view", "invoices.manage"]);
  const supabase = await createSupabaseServerClient();

  const [
    jobsResult,
    invoicesResult,
    customersResult,
    machinesResult,
    rolesResult,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, status, engineer_name, created_at")
      .eq("company_id", user.companyId),
    supabase
      .from("invoices")
      .select("id, status, total, amount_paid, issue_date, due_date, created_at")
      .eq("company_id", user.companyId),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", user.companyId),
    supabase
      .from("machines")
      .select("id", { count: "exact", head: true })
      .eq("company_id", user.companyId),
    supabase
      .from("company_member_roles")
      .select("role")
      .eq("company_id", user.companyId),
  ]);

  const firstError = [
    jobsResult.error,
    invoicesResult.error,
    customersResult.error,
    machinesResult.error,
    rolesResult.error,
  ].find(Boolean);

  const jobs = (jobsResult.data ?? []) as JobRow[];
  const invoices = (invoicesResult.data ?? []) as InvoiceRow[];
  const roles = (rolesResult.data ?? []) as RoleRow[];

  const completedJobs = jobs.filter((job) =>
    ["completed", "complete", "done", "closed"].includes(normaliseStatus(job.status)),
  ).length;
  const openJobs = jobs.length - completedJobs;

  const invoiceTotal = invoices.reduce((sum, invoice) => sum + asNumber(invoice.total), 0);
  const amountPaid = invoices.reduce((sum, invoice) => sum + asNumber(invoice.amount_paid), 0);
  const outstanding = Math.max(invoiceTotal - amountPaid, 0);
  const paidInvoices = invoices.filter((invoice) => {
    const status = normaliseStatus(invoice.status);
    return status === "paid" || asNumber(invoice.amount_paid) >= asNumber(invoice.total);
  }).length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonthRevenue = invoices.reduce((sum, invoice) => {
    const dateValue = invoice.issue_date ?? invoice.created_at;
    if (!dateValue || new Date(dateValue).getTime() < monthStart) return sum;
    return sum + asNumber(invoice.total);
  }, 0);

  const technicians = roles.filter((row) =>
    row.role === "technician" || row.role === "apprentice",
  ).length;

  const engineerCounts = new Map<string, number>();
  for (const job of jobs) {
    const engineer = job.engineer_name?.trim() || "Unassigned";
    engineerCounts.set(engineer, (engineerCounts.get(engineer) ?? 0) + 1);
  }
  const topEngineers = Array.from(engineerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const cards = [
    ["Jobs recorded", jobs.length.toLocaleString("en-GB"), `${completedJobs} completed`],
    ["Open jobs", openJobs.toLocaleString("en-GB"), `${percentage(completedJobs, jobs.length)} completion rate`],
    ["Revenue this month", money(thisMonthRevenue), `${invoices.length} invoices total`],
    ["Outstanding", money(outstanding), `${paidInvoices} invoices fully paid`],
    ["Customers", (customersResult.count ?? 0).toLocaleString("en-GB"), `${machinesResult.count ?? 0} machines`],
    ["Field team", technicians.toLocaleString("en-GB"), "Technicians & apprentices"],
  ];

  return (
    <main className="min-h-dvh w-full bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Management reports</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Reports centre</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              A live operational snapshot for {user.companyName}. All figures are scoped to the active company.
            </p>
          </div>
          <Link
            href="/api/reports/export"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Export CSV
          </Link>
        </div>

        {firstError && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Some reporting data could not be loaded: {firstError.message}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(([label, value, detail]) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Job workload by engineer</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Jobs currently recorded against each engineer name.</p>
            <div className="mt-5 space-y-3">
              {topEngineers.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No job activity yet.</p>
              ) : topEngineers.map(([engineer, count]) => (
                <div key={engineer} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950/70">
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{engineer}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">{count}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Invoice position</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">High-level invoicing and collection status.</p>
            <dl className="mt-5 space-y-4">
              {[
                ["Total invoiced", money(invoiceTotal)],
                ["Payments recorded", money(amountPaid)],
                ["Outstanding balance", money(outstanding)],
                ["Paid invoices", paidInvoices.toLocaleString("en-GB")],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
                  <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</dt>
                  <dd className="text-sm font-bold text-slate-950 dark:text-slate-100">{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        <p className="mt-6 text-xs leading-5 text-slate-500 dark:text-slate-500">
          This launch report focuses on reliable company-level operational and financial metrics. Technician profitability, labour recovery and detailed margin analysis can be added once the underlying costing data is consistently captured across live companies.
        </p>
      </div>
    </main>
  );
}
