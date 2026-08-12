import Link from "next/link";
import {
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CirclePoundSterling,
  Clock3,
  FileClock,
  PackageSearch,
  Percent,
  ReceiptText,
  TrendingUp,
  UsersRound,
  Wrench,
} from "lucide-react";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatCurrency as formatRegionalCurrency, formatDate as formatRegionalDate, normaliseRegionalSettings } from "@/lib/regional-settings";
import { ReportsExportButton, ReportsKpiGrid, type KpiItem } from "./ReportsInteractions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string }>;
type AnyRow = Record<string, unknown>;

type JobRow = {
  id: string;
  job_number: string | null;
  status: string | null;
  engineer_name: string | null;
  fault_reported: string | null;
  opened_date: string | null;
  created_at: string | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  status: string | null;
  subtotal: number | string | null;
  vat_amount: number | string | null;
  total: number | string | null;
  amount_paid: number | string | null;
  issue_date: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type LabourRow = {
  id: string;
  job_id: string | null;
  engineer_name: string | null;
  description: string | null;
  labour_date: string | null;
  hours: number | string | null;
  hourly_rate: number | string | null;
  entry_status: string | null;
};

type QuoteRow = {
  id: string;
  quote_number: string | null;
  title: string | null;
  status: string | null;
  total: number | string | null;
  quote_date: string | null;
  created_at: string | null;
};

type StockRow = {
  id: string;
  description: string | null;
  part_number: string | null;
  quantity_in_stock: number | string | null;
  minimum_stock: number | string | null;
  unit_cost: number | string | null;
  unit_price: number | string | null;
};

type ServiceRow = {
  last_service_hours: number | string | null;
  last_service_date: string | null;
  machines: AnyRow | AnyRow[] | null;
  service_programmes: AnyRow | AnyRow[] | null;
};

const COMPLETE = new Set(["completed", "complete", "done", "closed", "invoiced"]);
const PAID = new Set(["paid", "settled", "completed"]);
const ACTIVE_QUOTE = new Set(["draft", "sent", "viewed"]);

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function asNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replaceAll(" ", "_");
}

function money(value: number, decimals = 0) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function shortDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(value);
}

function dateFrom(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function rangeStart(range: string, now = new Date()) {
  if (range === "all") return null;
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  if (range === "30d") result.setDate(result.getDate() - 29);
  else if (range === "90d") result.setDate(result.getDate() - 89);
  else result.setMonth(result.getMonth() - 11, 1);
  return result;
}

function within(value: string | null | undefined, start: Date | null) {
  if (!start) return true;
  const date = dateFrom(value);
  return Boolean(date && date >= start);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date;
}


export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedRange = params.range ?? "12m";
  const range = ["30d", "90d", "12m", "all"].includes(requestedRange) ? requestedRange : "12m";

  const user = await requirePermission(["invoices.view", "invoices.manage"]);
  const supabase = await createSupabaseServerClient();
  const start = rangeStart(range);
  const now = new Date();

  const [
    jobsResult,
    invoicesResult,
    labourResult,
    quotesResult,
    customersResult,
    machinesResult,
    stockResult,
    serviceResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id,job_number,status,engineer_name,fault_reported,opened_date,created_at")
      .eq("company_id", user.companyId),
    supabase
      .from("invoices")
      .select("id,invoice_number,customer_id,customer_name,status,subtotal,vat_amount,total,amount_paid,issue_date,due_date,paid_at,created_at")
      .eq("company_id", user.companyId),
    supabase
      .from("job_labour_entries")
      .select("id,job_id,engineer_name,description,labour_date,hours,hourly_rate,entry_status")
      .eq("company_id", user.companyId),
    supabase
      .from("quotes")
      .select("id,quote_number,title,status,total,quote_date,created_at")
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
      .from("stock_items")
      .select("id,description,part_number,quantity_in_stock,minimum_stock,unit_cost,unit_price")
      .eq("company_id", user.companyId)
      .eq("active", true),
    supabase
      .from("machine_service_programmes")
      .select(`
        last_service_hours,
        last_service_date,
        machines (id,hours,estimated_hours_per_week),
        service_programmes (interval_hours,interval_months)
      `)
      .eq("company_id", user.companyId)
      .eq("active", true),
    supabase
      .from("company_settings")
      .select("country_code,currency_code,locale,timezone,tax_name,default_tax_rate,date_format,time_format,week_start,measurement_system")
      .eq("company_id", user.companyId)
      .maybeSingle(),
  ]);

  const errors = [
    jobsResult.error,
    invoicesResult.error,
    labourResult.error,
    quotesResult.error,
    customersResult.error,
    machinesResult.error,
    stockResult.error,
    serviceResult.error,
    settingsResult.error,
  ].filter(Boolean);

  const jobs = ((jobsResult.data ?? []) as JobRow[]).filter((row) => within(row.opened_date ?? row.created_at, start));
  const invoices = ((invoicesResult.data ?? []) as InvoiceRow[]).filter((row) => within(row.issue_date ?? row.created_at, start));
  const labour = ((labourResult.data ?? []) as LabourRow[]).filter((row) => within(row.labour_date, start));
  const quotes = ((quotesResult.data ?? []) as QuoteRow[]).filter((row) => within(row.quote_date ?? row.created_at, start));
  const stock = (stockResult.data ?? []) as StockRow[];
  const services = (serviceResult.data ?? []) as ServiceRow[];

  const regional = normaliseRegionalSettings(settingsResult.data ?? undefined);
  const money = (value: number, decimals = 0) => formatRegionalCurrency(value, regional, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const shortDate = (value: Date) => formatRegionalDate(value, regional, { day: "2-digit", month: "short" });
  const monthLabel = (value: Date) => formatRegionalDate(value, regional, { month: "short" });
  const taxName = regional.tax_name;

  const completedJobs = jobs.filter((job) => COMPLETE.has(normalise(job.status))).length;
  const openJobs = Math.max(0, jobs.length - completedJobs);
  const completionRate = jobs.length ? Math.round((completedJobs / jobs.length) * 100) : 0;

  let invoiced = 0;
  let paid = 0;
  let vat = 0;
  let outstanding = 0;
  let overdue = 0;
  let overdueCount = 0;
  let paidCount = 0;

  const ageing = { current: 0, d30: 0, d60: 0, d90: 0 };
  const customerRevenue = new Map<string, number>();

  for (const invoice of invoices) {
    const total = asNumber(invoice.total);
    const amountPaid = PAID.has(normalise(invoice.status)) ? Math.max(total, asNumber(invoice.amount_paid)) : asNumber(invoice.amount_paid);
    const balance = Math.max(0, total - amountPaid);
    invoiced += total;
    paid += Math.min(total, amountPaid);
    vat += asNumber(invoice.vat_amount);
    outstanding += balance;
    if (balance <= 0) paidCount += 1;

    const customer = invoice.customer_name?.trim() || "Unnamed customer";
    customerRevenue.set(customer, (customerRevenue.get(customer) ?? 0) + total);

    if (balance > 0) {
      const due = dateFrom(invoice.due_date);
      if (!due || due >= now) ageing.current += balance;
      else {
        const days = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
        overdue += balance;
        overdueCount += 1;
        if (days <= 30) ageing.d30 += balance;
        else if (days <= 60) ageing.d60 += balance;
        else ageing.d90 += balance;
      }
    }
  }

  const averageInvoice = invoices.length ? invoiced / invoices.length : 0;
  const collectionRate = invoiced ? Math.round((paid / invoiced) * 100) : 0;

  const labourHours = labour.reduce((sum, row) => sum + asNumber(row.hours), 0);
  const labourValue = labour.reduce((sum, row) => sum + asNumber(row.hours) * asNumber(row.hourly_rate), 0);
  const engineerHours = new Map<string, number>();
  for (const row of labour) {
    const engineer = row.engineer_name?.trim() || "Unassigned";
    engineerHours.set(engineer, (engineerHours.get(engineer) ?? 0) + asNumber(row.hours));
  }
  const topEngineers = [...engineerHours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxEngineerHours = Math.max(1, ...topEngineers.map(([, hours]) => hours));

  const quoteValue = quotes.reduce((sum, row) => sum + asNumber(row.total), 0);
  const activeQuotes = quotes.filter((row) => ACTIVE_QUOTE.has(normalise(row.status))).length;
  const acceptedQuotes = quotes.filter((row) => ["accepted", "converted"].includes(normalise(row.status))).length;
  const decidedQuotes = quotes.filter((row) => ["accepted", "converted", "rejected", "expired"].includes(normalise(row.status))).length;
  const quoteWinRate = decidedQuotes ? Math.round((acceptedQuotes / decidedQuotes) * 100) : 0;

  const stockCost = stock.reduce((sum, row) => sum + asNumber(row.quantity_in_stock) * asNumber(row.unit_cost), 0);
  const stockRetail = stock.reduce((sum, row) => sum + asNumber(row.quantity_in_stock) * asNumber(row.unit_price), 0);
  const lowStock = stock.filter((row) => asNumber(row.quantity_in_stock) <= asNumber(row.minimum_stock)).length;
  const outOfStock = stock.filter((row) => asNumber(row.quantity_in_stock) <= 0).length;

  let serviceOverdue = 0;
  let serviceDueSoon = 0;
  for (const row of services) {
    const machine = one(row.machines);
    const programme = one(row.service_programmes);
    if (!machine || !programme) continue;

    const currentHours = asNumber(machine.hours);
    const intervalHours = programme.interval_hours == null ? null : asNumber(programme.interval_hours);
    const remainingHours = intervalHours == null ? null : asNumber(row.last_service_hours ?? currentHours) + intervalHours - currentHours;

    let dueDate: Date | null = null;
    if (programme.interval_months && row.last_service_date) {
      dueDate = addMonths(row.last_service_date, asNumber(programme.interval_months));
    }
    const weekly = asNumber(machine.estimated_hours_per_week);
    if (remainingHours != null && weekly > 0) {
      const predicted = new Date(now);
      predicted.setDate(predicted.getDate() + Math.ceil((Math.max(0, remainingHours) / weekly) * 7));
      if (!dueDate || predicted < dueDate) dueDate = predicted;
    }

    if ((remainingHours != null && remainingHours < 0) || (dueDate && dueDate < now)) serviceOverdue += 1;
    else if ((remainingHours != null && remainingHours <= 50) || (dueDate && dueDate.getTime() - now.getTime() <= 7 * 86_400_000)) serviceDueSoon += 1;
  }

  const months: Array<{ key: string; label: string; total: number; paid: number }> = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({ key: monthKey(date), label: monthLabel(date), total: 0, paid: 0 });
  }
  for (const invoice of invoicesResult.data ?? []) {
    const row = invoice as InvoiceRow;
    const issue = dateFrom(row.issue_date ?? row.created_at);
    if (!issue) continue;
    const month = months.find((item) => item.key === monthKey(issue));
    if (!month) continue;
    month.total += asNumber(row.total);
    if (PAID.has(normalise(row.status))) month.paid += asNumber(row.total);
    else month.paid += Math.min(asNumber(row.total), asNumber(row.amount_paid));
  }
  const maxMonth = Math.max(1, ...months.map((month) => month.total));

  const topCustomers = [...customerRevenue.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCustomer = Math.max(1, ...topCustomers.map(([, value]) => value));

  const periodLabel = range === "30d" ? "Last 30 days" : range === "90d" ? "Last 90 days" : range === "all" ? "All time" : "Last 12 months";

  const invoiceRecords = invoices.slice().sort((a, b) => asNumber(b.total) - asNumber(a.total)).slice(0, 12).map((invoice) => ({
    id: invoice.id,
    title: invoice.invoice_number || "Invoice",
    subtitle: `${invoice.customer_name?.trim() || "Unnamed customer"} · ${invoice.status || "Unknown status"}`,
    value: money(asNumber(invoice.total)),
    meta: invoice.issue_date ? shortDate(dateFrom(invoice.issue_date) ?? now) : undefined,
    href: `/invoices/${invoice.id}`,
  }));

  const outstandingRecords = invoices
    .map((invoice) => {
      const total = asNumber(invoice.total);
      const amountPaid = PAID.has(normalise(invoice.status)) ? Math.max(total, asNumber(invoice.amount_paid)) : asNumber(invoice.amount_paid);
      return { invoice, balance: Math.max(0, total - amountPaid) };
    })
    .filter((item) => item.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 12)
    .map(({ invoice, balance }) => ({
      id: invoice.id,
      title: invoice.invoice_number || "Invoice",
      subtitle: `${invoice.customer_name?.trim() || "Unnamed customer"} · due ${invoice.due_date ? shortDate(dateFrom(invoice.due_date) ?? now) : "not set"}`,
      value: money(balance),
      meta: normalise(invoice.status).replaceAll("_", " "),
      href: `/invoices/${invoice.id}`,
    }));

  const paymentRecords = invoices
    .map((invoice) => ({ invoice, paidValue: PAID.has(normalise(invoice.status)) ? asNumber(invoice.total) : asNumber(invoice.amount_paid) }))
    .filter((item) => item.paidValue > 0)
    .sort((a, b) => b.paidValue - a.paidValue)
    .slice(0, 12)
    .map(({ invoice, paidValue }) => ({
      id: invoice.id,
      title: invoice.invoice_number || "Invoice",
      subtitle: invoice.customer_name?.trim() || "Unnamed customer",
      value: money(paidValue),
      meta: invoice.paid_at ? `Paid ${shortDate(dateFrom(invoice.paid_at) ?? now)}` : "Payment recorded",
      href: `/invoices/${invoice.id}`,
    }));

  const jobRecords = jobs.slice().sort((a, b) => String(b.opened_date ?? b.created_at ?? "").localeCompare(String(a.opened_date ?? a.created_at ?? ""))).slice(0, 12).map((job) => ({
    id: job.id,
    title: job.job_number || "Job",
    subtitle: job.fault_reported?.trim() || "No fault description entered",
    value: normalise(job.status).replaceAll("_", " ") || "Unknown",
    meta: job.engineer_name?.trim() || "Unassigned",
    href: `/jobs/${job.id}`,
  }));

  const labourRecords = labour.slice().sort((a, b) => String(b.labour_date ?? "").localeCompare(String(a.labour_date ?? ""))).slice(0, 12).map((entry) => ({
    id: entry.id,
    title: entry.engineer_name?.trim() || "Unassigned",
    subtitle: entry.description?.trim() || "Labour entry",
    value: `${asNumber(entry.hours).toFixed(1)} hrs`,
    meta: money(asNumber(entry.hours) * asNumber(entry.hourly_rate)),
    href: entry.job_id ? `/jobs/${entry.job_id}` : undefined,
  }));

  const quoteRecords = quotes.slice().sort((a, b) => asNumber(b.total) - asNumber(a.total)).slice(0, 12).map((quote) => ({
    id: quote.id,
    title: quote.quote_number || quote.title || "Quote",
    subtitle: quote.title?.trim() || normalise(quote.status).replaceAll("_", " ") || "Quote",
    value: money(asNumber(quote.total)),
    meta: normalise(quote.status).replaceAll("_", " "),
    href: `/quotes/${quote.id}`,
  }));

  const stockRecords = stock
    .filter((item) => asNumber(item.quantity_in_stock) <= asNumber(item.minimum_stock))
    .sort((a, b) => asNumber(a.quantity_in_stock) - asNumber(b.quantity_in_stock))
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      title: item.part_number?.trim() || item.description?.trim() || "Stock item",
      subtitle: item.description?.trim() || "Stock item",
      value: `${asNumber(item.quantity_in_stock)} on hand`,
      meta: `Minimum ${asNumber(item.minimum_stock)}`,
      href: `/stock/${item.id}`,
    }));

  const kpis: KpiItem[] = [
    {
      id: "revenue", label: "Revenue invoiced", value: money(invoiced), detail: `${invoices.length} invoices in period`, icon: "revenue",
      description: `Total invoice value raised during ${periodLabel.toLowerCase()}.`,
      rows: [
        { label: "Invoices raised", value: invoices.length.toLocaleString("en-GB") },
        { label: "Average invoice", value: money(averageInvoice) },
        { label: `${taxName} included`, value: money(vat) },
        { label: "Payments recorded", value: money(paid) },
      ],
      records: invoiceRecords,
      recordsLabel: "Invoices in this period",
    },
    {
      id: "payments", label: "Payments recorded", value: money(paid), detail: `${collectionRate}% of invoiced value collected`, icon: "payments", tone: "sky",
      description: "Payments recorded against invoices in the selected reporting period.",
      rows: [
        { label: "Collection rate", value: `${collectionRate}%` },
        { label: "Paid / fully settled invoices", value: paidCount.toLocaleString("en-GB") },
        { label: "Invoiced value", value: money(invoiced) },
        { label: "Still outstanding", value: money(outstanding) },
      ],
      records: paymentRecords,
      recordsLabel: "Invoices with recorded payments",
    },
    {
      id: "outstanding", label: "Outstanding", value: money(outstanding), detail: `${overdueCount} overdue invoice${overdueCount === 1 ? "" : "s"}`, icon: "outstanding", tone: outstanding > 0 ? "amber" : "emerald",
      description: "Open customer balances, split between current and overdue invoice ageing.",
      rows: [
        { label: "Not yet due", value: money(ageing.current) },
        { label: "1–30 days overdue", value: money(ageing.d30) },
        { label: "31–60 days overdue", value: money(ageing.d60) },
        { label: "60+ days overdue", value: money(ageing.d90) },
      ],
      records: outstandingRecords,
      recordsLabel: "Open invoice balances",
    },
    {
      id: "vat", label: `${taxName} on invoices`, value: money(vat), detail: `Average invoice ${money(averageInvoice)}`, icon: "vat", tone: "violet",
      description: `${taxName} recorded on invoices in this operational report period. Reconcile with your accounting system for statutory tax reporting.`,
      rows: [
        { label: "Invoice count", value: invoices.length.toLocaleString("en-GB") },
        { label: "Gross invoiced", value: money(invoiced) },
        { label: `${taxName} recorded`, value: money(vat) },
        { label: "Average gross invoice", value: money(averageInvoice) },
      ],
      records: invoiceRecords,
      recordsLabel: `Invoices contributing to ${taxName}`,
    },
    {
      id: "jobs", label: "Jobs completed", value: completedJobs.toLocaleString("en-GB"), detail: `${completionRate}% completion rate · ${openJobs} open`, icon: "jobs",
      description: "Job throughput for the selected reporting period.",
      rows: [
        { label: "Jobs recorded", value: jobs.length.toLocaleString("en-GB") },
        { label: "Completed", value: completedJobs.toLocaleString("en-GB") },
        { label: "Open", value: openJobs.toLocaleString("en-GB") },
        { label: "Completion rate", value: `${completionRate}%` },
      ],
      records: jobRecords,
      recordsLabel: "Recent jobs in this period",
    },
    {
      id: "labour", label: "Labour recorded", value: `${labourHours.toFixed(1)} hrs`, detail: `${money(labourValue)} recorded labour value`, icon: "labour", tone: "sky",
      description: "Recorded labour hours and value calculated from each labour entry's hours and hourly rate.",
      rows: [
        { label: "Total hours", value: `${labourHours.toFixed(1)} hrs` },
        { label: "Recorded labour value", value: money(labourValue) },
        { label: "Engineers with entries", value: engineerHours.size.toLocaleString("en-GB") },
        { label: "Average value per hour", value: labourHours ? money(labourValue / labourHours, 2) : money(0, 2) },
      ],
      records: labourRecords,
      recordsLabel: "Recent labour entries",
    },
    {
      id: "quotes", label: "Quotes", value: new Intl.NumberFormat(regional.locale).format(activeQuotes), detail: `${quoteWinRate}% decided quote win rate · ${money(quoteValue)} total`, icon: "quotes", tone: "violet",
      description: "Quote activity and outcomes for the selected period.",
      rows: [
        { label: "Quotes recorded", value: quotes.length.toLocaleString("en-GB") },
        { label: "Active", value: new Intl.NumberFormat(regional.locale).format(activeQuotes) },
        { label: "Accepted / converted", value: acceptedQuotes.toLocaleString("en-GB") },
        { label: "Decided win rate", value: `${quoteWinRate}%` },
      ],
      records: quoteRecords,
      recordsLabel: "Quotes in this period",
    },
    {
      id: "stock", label: "Stock alerts", value: new Intl.NumberFormat(regional.locale).format(lowStock), detail: `${outOfStock} out of stock · ${money(stockCost)} at cost`, icon: "stock", tone: lowStock ? "rose" : "emerald",
      description: "Current active inventory position for the company. Stock data is not restricted by report date because it represents today's position.",
      rows: [
        { label: "Items tracked", value: stock.length.toLocaleString("en-GB") },
        { label: "Low stock", value: new Intl.NumberFormat(regional.locale).format(lowStock) },
        { label: "Out of stock", value: outOfStock.toLocaleString("en-GB") },
        { label: "Retail value", value: money(stockRetail) },
      ],
      records: stockRecords,
      recordsLabel: "Items requiring stock attention",
    },
  ];

  return (
    <main className="min-h-dvh w-full bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Management intelligence</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Reports centre</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
              Financial, operational, technician and service insight for {user.companyName}. Every figure is restricted to the active company.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {[["30d", "30 days"], ["90d", "90 days"], ["12m", "12 months"], ["all", "All time"]].map(([value, label]) => (
                <Link
                  key={value}
                  href={`/reports?range=${value}`}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${range === value ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  {label}
                </Link>
              ))}
            </div>
            <ReportsExportButton range={range} />
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Some reporting sources could not be loaded. Available figures are still shown. {errors[0]?.message}
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          <CalendarClock size={15} /> {periodLabel}
        </div>

        <ReportsKpiGrid items={kpis} />

        <section className="mt-6 grid gap-6 2xl:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">6-month trend</p>
                <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Invoice revenue</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Invoiced value with recorded payments over the latest six calendar months.</p>
              </div>
              <TrendingUp className="text-emerald-700 dark:text-emerald-400" size={21} />
            </div>
            <div className="mt-6 grid grid-cols-6 gap-2 sm:gap-4">
              {months.map((month) => {
                const height = Math.max(5, Math.round((month.total / maxMonth) * 100));
                const paidHeight = month.total ? Math.round((Math.min(month.paid, month.total) / month.total) * height) : 0;
                return (
                  <div key={month.key} className="min-w-0">
                    <div className="flex h-48 items-end justify-center rounded-xl bg-slate-50 px-1 dark:bg-slate-950/70">
                      <div className="relative w-full max-w-12 overflow-hidden rounded-t-lg bg-emerald-100 dark:bg-emerald-950/60" style={{ height: `${height}%` }} title={`${month.label}: ${money(month.total, 2)}`}>
                        <div className="absolute inset-x-0 bottom-0 bg-emerald-600 dark:bg-emerald-500" style={{ height: `${month.total ? Math.round((paidHeight / Math.max(height, 1)) * 100) : 0}%` }} />
                      </div>
                    </div>
                    <p className="mt-2 truncate text-center text-xs font-black text-slate-700 dark:text-slate-300">{month.label}</p>
                    <p className="mt-0.5 truncate text-center text-[10px] font-semibold text-slate-500">{money(month.total)}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-100 dark:bg-emerald-950" /> Invoiced</span>
              <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Paid</span>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">Cash collection</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Invoice ageing</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Outstanding balance grouped by due-date age.</p>
            <div className="mt-5 space-y-3">
              {[
                ["Not yet due", ageing.current, "bg-emerald-500"],
                ["1–30 days overdue", ageing.d30, "bg-amber-500"],
                ["31–60 days overdue", ageing.d60, "bg-orange-500"],
                ["60+ days overdue", ageing.d90, "bg-rose-600"],
              ].map(([label, value, colour]) => {
                const numeric = Number(value);
                const width = outstanding ? Math.max(2, Math.round((numeric / outstanding) * 100)) : 0;
                return (
                  <div key={String(label)}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                      <span className="font-black text-slate-950 dark:text-white">{money(numeric)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full ${colour}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/70">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Overdue balance</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{money(overdue)}</p>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-sky-700 dark:text-sky-400">Field team</p>
                <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Labour by engineer</h2>
              </div>
              <UsersRound size={21} className="text-sky-700 dark:text-sky-400" />
            </div>
            <div className="mt-5 space-y-4">
              {topEngineers.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-950/70">No labour entries in this period.</p>
              ) : topEngineers.map(([engineer, hours]) => (
                <div key={engineer}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-bold text-slate-800 dark:text-slate-200">{engineer}</span>
                    <span className="font-black text-slate-950 dark:text-white">{hours.toFixed(1)} hrs</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-sky-600" style={{ width: `${Math.max(3, Math.round((hours / maxEngineerHours) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-700 dark:text-violet-400">Customer value</p>
                <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Top customers by invoiced revenue</h2>
              </div>
              <Percent size={21} className="text-violet-700 dark:text-violet-400" />
            </div>
            <div className="mt-5 space-y-4">
              {topCustomers.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-950/70">No customer invoice data in this period.</p>
              ) : topCustomers.map(([customer, value]) => (
                <div key={customer}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-bold text-slate-800 dark:text-slate-200">{customer}</span>
                    <span className="font-black text-slate-950 dark:text-white">{money(value)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max(3, Math.round((value / maxCustomer) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">Customers & machines</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Database coverage</h2>
            <dl className="mt-5 space-y-3">
              {[
                ["Customers", customersResult.count ?? 0],
                ["Machines", machinesResult.count ?? 0],
                ["Jobs in selected period", jobs.length],
                ["Invoices in selected period", invoices.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
                  <dt className="text-sm font-semibold text-slate-600 dark:text-slate-400">{label}</dt>
                  <dd className="text-sm font-black text-slate-950 dark:text-white">{Number(value).toLocaleString("en-GB")}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">Preventative maintenance</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Service exposure</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-rose-50 p-4 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                <p className="text-xs font-black uppercase tracking-wide">Overdue</p>
                <p className="mt-2 text-3xl font-black">{serviceOverdue}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="text-xs font-black uppercase tracking-wide">Due soon</p>
                <p className="mt-2 text-3xl font-black">{serviceDueSoon}</p>
              </div>
            </div>
            <Link href="/service-programmes" className="mt-4 inline-flex text-sm font-black text-emerald-700 hover:underline dark:text-emerald-400">Open service programmes →</Link>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-700 dark:text-rose-400">Inventory</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Stock position</h2>
            <dl className="mt-5 space-y-3">
              {[
                ["Items tracked", stock.length.toLocaleString("en-GB")],
                ["Low stock", new Intl.NumberFormat(regional.locale).format(lowStock)],
                ["Out of stock", outOfStock.toLocaleString("en-GB")],
                ["Cost value", money(stockCost)],
                ["Retail value", money(stockRetail)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
                  <dt className="text-sm font-semibold text-slate-600 dark:text-slate-400">{label}</dt>
                  <dd className="text-sm font-black text-slate-950 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        <p className="mt-6 text-xs font-medium leading-5 text-slate-500 dark:text-slate-500">
          Revenue is based on invoice totals and recorded payments. Labour value uses hours × hourly rate from labour entries. Stock valuation uses current on-hand quantities. These reports are operational management figures and should be reconciled with your accounting system for statutory reporting.
        </p>
      </div>
    </main>
  );
}
