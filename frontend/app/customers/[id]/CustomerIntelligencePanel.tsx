"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import Card from "../../../Components/ui/Card";
import { supabase } from "@/lib/supabase";

type CustomerIntelligencePanelProps = {
  companyId: string;
  customerId: string;
  canViewFinancials: boolean;
};

type JobRow = {
  id: string;
  job_number: string | null;
  status: string | null;
  fault_reported: string | null;
  engineer_name: string | null;
  opened_date: string | null;
  completed_date: string | null;
  created_at: string | null;
  machine_id: string | null;
  machines:
    | { make: string | null; model: string | null; registration: string | null }
    | Array<{ make: string | null; model: string | null; registration: string | null }>
    | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  status: string | null;
  issue_date: string | null;
  due_date: string | null;
  total: number | string | null;
  amount_paid: number | string | null;
  paid_at: string | null;
};

type QuoteRow = {
  id: string;
  quote_number: string | null;
  title: string | null;
  status: string | null;
  quote_date: string | null;
  total: number | string | null;
};

type MachineRow = {
  id: string;
  make: string | null;
  model: string | null;
  registration: string | null;
  hours: number | string | null;
  created_at: string | null;
};

type ActivityItem = {
  id: string;
  date: string | null;
  label: string;
  detail: string;
  href: string;
  kind: "job" | "invoice" | "quote" | "machine";
};

const CLOSED_JOB_STATUSES = new Set(["completed", "closed", "cancelled"]);
const CLOSED_INVOICE_STATUSES = new Set(["paid", "void", "cancelled"]);

function normalise(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date not recorded";

  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function relatedMachine(
  value: JobRow["machines"],
): { make: string | null; model: string | null; registration: string | null } | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function machineLabel(machine: ReturnType<typeof relatedMachine>) {
  if (!machine) return "No machine linked";
  const name = [machine.make, machine.model].filter(Boolean).join(" ").trim();
  if (name && machine.registration) return `${name} · ${machine.registration}`;
  return name || machine.registration || "Machine";
}

export default function CustomerIntelligencePanel({
  companyId,
  customerId,
  canViewFinancials,
}: CustomerIntelligencePanelProps) {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!companyId || !customerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const jobsQuery = supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        status,
        fault_reported,
        engineer_name,
        opened_date,
        completed_date,
        created_at,
        machine_id,
        machines (make, model, registration)
      `)
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50);

    const machinesQuery = supabase
      .from("machines")
      .select("id, make, model, registration, hours, created_at")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    const quotesQuery = canViewFinancials
      ? supabase
          .from("quotes")
          .select("id, quote_number, title, status, quote_date, total")
          .eq("company_id", companyId)
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [], error: null });

    const invoicesQuery = canViewFinancials
      ? supabase
          .from("invoices")
          .select("id, invoice_number, status, issue_date, due_date, total, amount_paid, paid_at")
          .eq("company_id", companyId)
          .eq("customer_id", customerId)
          .neq("status", "void")
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [], error: null });

    const [jobsResult, machinesResult, quotesResult, invoicesResult] =
      await Promise.all([jobsQuery, machinesQuery, quotesQuery, invoicesQuery]);

    const firstError =
      jobsResult.error ||
      machinesResult.error ||
      quotesResult.error ||
      invoicesResult.error;

    if (firstError) {
      setError(firstError.message);
    }

    setJobs((jobsResult.data ?? []) as JobRow[]);
    setMachines((machinesResult.data ?? []) as MachineRow[]);
    setQuotes((quotesResult.data ?? []) as QuoteRow[]);
    setInvoices((invoicesResult.data ?? []) as InvoiceRow[]);
    setLoading(false);
  }, [canViewFinancials, companyId, customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    const openJobs = jobs.filter(
      (job) => !CLOSED_JOB_STATUSES.has(normalise(job.status)),
    ).length;

    const completedJobs = jobs.filter((job) =>
      CLOSED_JOB_STATUSES.has(normalise(job.status)),
    ).length;

    const invoiced = invoices.reduce(
      (sum, invoice) => sum + asNumber(invoice.total),
      0,
    );

    const outstanding = invoices.reduce((sum, invoice) => {
      if (CLOSED_INVOICE_STATUSES.has(normalise(invoice.status))) return sum;
      return Math.max(
        0,
        sum + asNumber(invoice.total) - asNumber(invoice.amount_paid),
      );
    }, 0);

    const acceptedQuotes = quotes.filter((quote) =>
      ["accepted", "converted"].includes(normalise(quote.status)),
    ).length;

    const latestJob = jobs[0] ?? null;

    return {
      openJobs,
      completedJobs,
      invoiced,
      outstanding,
      acceptedQuotes,
      latestJob,
    };
  }, [invoices, jobs, quotes]);

  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    for (const job of jobs.slice(0, 12)) {
      items.push({
        id: `job-${job.id}`,
        date: job.completed_date || job.opened_date || job.created_at,
        label: `Job ${job.job_number || "record"}`,
        detail: `${machineLabel(relatedMachine(job.machines))} · ${job.fault_reported || "No fault description"}`,
        href: `/jobs/${job.id}`,
        kind: "job",
      });
    }

    if (canViewFinancials) {
      for (const invoice of invoices.slice(0, 8)) {
        items.push({
          id: `invoice-${invoice.id}`,
          date: invoice.paid_at || invoice.issue_date,
          label: `Invoice ${invoice.invoice_number || "record"}`,
          detail: `${currency(asNumber(invoice.total))} · ${normalise(invoice.status) || "draft"}`,
          href: `/invoices/${invoice.id}`,
          kind: "invoice",
        });
      }

      for (const quote of quotes.slice(0, 8)) {
        items.push({
          id: `quote-${quote.id}`,
          date: quote.quote_date,
          label: `Quote ${quote.quote_number || "record"}`,
          detail: `${quote.title || "Quote"} · ${currency(asNumber(quote.total))}`,
          href: `/quotes/${quote.id}`,
          kind: "quote",
        });
      }
    }

    for (const machine of machines.slice(0, 5)) {
      items.push({
        id: `machine-${machine.id}`,
        date: machine.created_at,
        label: [machine.make, machine.model].filter(Boolean).join(" ") || "Machine added",
        detail: machine.registration || "Machine record added",
        href: `/customers/${customerId}/machines/${machine.id}`,
        kind: "machine",
      });
    }

    return items
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 12);
  }, [canViewFinancials, customerId, invoices, jobs, machines, quotes]);

  if (loading) {
    return (
      <Card className="p-6">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          Building customer overview…
        </p>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Some customer insight could not be loaded: {error}
        </div>
      )}

      <div className={`grid gap-4 ${canViewFinancials ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
        <Metric label="Machines" value={String(machines.length)} detail="Registered equipment" />
        <Metric label="Open jobs" value={String(metrics.openJobs)} detail={`${metrics.completedJobs} completed`} />
        <Metric
          label="Last activity"
          value={metrics.latestJob ? formatDate(metrics.latestJob.opened_date || metrics.latestJob.created_at) : "No jobs"}
          detail={metrics.latestJob?.engineer_name || "No engineer activity yet"}
          compact
        />
        {canViewFinancials && (
          <Metric label="Lifetime invoiced" value={currency(metrics.invoiced)} detail={`${invoices.length} invoices recorded`} />
        )}
        {canViewFinancials && (
          <Metric label="Outstanding" value={currency(metrics.outstanding)} detail={`${metrics.acceptedQuotes} accepted/converted quotes`} emphasis={metrics.outstanding > 0} />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                Relationship history
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100">
                Recent customer activity
              </h2>
            </div>
            <Link href="/jobs/new" className="text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-400">
              + Create job
            </Link>
          </div>

          {activity.length === 0 ? (
            <div className="p-8 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
              Customer activity will build automatically as jobs, machines, quotes and invoices are recorded.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activity.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-4 px-6 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                >
                  <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${kindClasses(item.kind)}`}>
                    {kindLabel(item.kind)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="truncate font-bold text-slate-950 dark:text-slate-100">{item.label}</p>
                      <p className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-500">{formatDate(item.date)}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-600 dark:text-slate-400">{item.detail}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
            Quick access
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100">
            Customer workspace
          </h2>
          <div className="mt-5 grid gap-3">
            <QuickLink href="/jobs/new" title="Create a job" detail="Open a new workshop or field-service job." />
            <QuickLink href="/quotes" title="Quotes" detail="Review this company’s quote workflow." />
            {canViewFinancials && (
              <QuickLink href="/invoices" title="Invoices" detail="Open invoice and payment records." />
            )}
            <QuickLink href="/calendar" title="Schedule" detail="Review upcoming field and workshop work." />
          </div>
        </Card>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  compact = false,
  emphasis = false,
}: {
  label: string;
  value: string;
  detail: string;
  compact?: boolean;
  emphasis?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">{label}</p>
      <p className={`mt-2 font-black tracking-tight ${compact ? "text-lg" : "text-2xl"} ${emphasis ? "text-amber-700 dark:text-amber-400" : "text-slate-950 dark:text-slate-100"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-500">{detail}</p>
    </Card>
  );
}

function QuickLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-slate-950 dark:text-slate-100">{title}</p>
        <span className="font-black text-emerald-700 transition group-hover:translate-x-0.5 dark:text-emerald-400">→</span>
      </div>
      <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">{detail}</p>
    </Link>
  );
}

function kindLabel(kind: ActivityItem["kind"]) {
  switch (kind) {
    case "invoice": return "INV";
    case "quote": return "QTE";
    case "machine": return "MAC";
    default: return "JOB";
  }
}

function kindClasses(kind: ActivityItem["kind"]) {
  switch (kind) {
    case "invoice": return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300";
    case "quote": return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300";
    case "machine": return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    default: return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
}
