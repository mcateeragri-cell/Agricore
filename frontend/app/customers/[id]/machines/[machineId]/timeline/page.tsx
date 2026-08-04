"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigationUser } from "@/Components/navigation/use-navigation-user";
import { supabase } from "@/lib/supabase";

type TimelineType =
  | "job"
  | "diagnostic"
  | "fault"
  | "hours"
  | "quote"
  | "invoice"
  | "service";

type TimelineItem = {
  id: string;
  type: TimelineType;
  date: string;
  title: string;
  description: string;
  amount?: number | null;
  href?: string;
};

type JobRow = {
  id: string;
  job_number: string | null;
  status: string | null;
  fault_reported: string | null;
  diagnosis: string | null;
  work_carried_out: string | null;
  opened_date: string | null;
  completed_date: string | null;
  created_at: string;
};

type DiagnosticRow = {
  id: string;
  original_filename: string;
  report_date: string | null;
  created_at: string;
  import_status: string;
  reported_hours: number | null;
};

type FaultRow = {
  id: string;
  fault_code: string;
  description: string | null;
  status: string;
  created_at: string;
};

type HoursRow = {
  id: string;
  hours: number;
  reading_date: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
};

type QuoteRow = {
  id: string;
  quote_number: string | null;
  title: string | null;
  status: string | null;
  total: number | string | null;
  quote_date: string | null;
  created_at: string;
};

type ServiceEventRow = {
  id: string;
  service_name: string;
  service_date: string;
  service_hours: number | null;
  technician_name: string | null;
  checklist: Array<{ description?: string; completed?: boolean }> | null;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  job_id: string | null;
  status: string | null;
  total: number | string | null;
  issue_date: string | null;
  created_at: string;
};

const FILTERS: Array<{ value: "all" | TimelineType; label: string }> = [
  { value: "all", label: "All history" },
  { value: "job", label: "Jobs" },
  { value: "hours", label: "Hours" },
  { value: "diagnostic", label: "Diagnostics" },
  { value: "fault", label: "Faults" },
  { value: "quote", label: "Quotes" },
  { value: "invoice", label: "Invoices" },
  { value: "service", label: "Services" },
];

export default function MachineTimelinePage() {
  const params = useParams<{ id: string; machineId: string }>();
  const customerId = params.id;
  const machineId = params.machineId;

  const { userState, loading: companyLoading } = useNavigationUser();
  const companyId = userState.activeCompany?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState<"all" | TimelineType>("all");
  const [items, setItems] = useState<TimelineItem[]>([]);

  const loadTimeline = useCallback(async () => {
    if (companyLoading) return;

    if (!companyId) {
      setItems([]);
      setErrorMessage("No active company is selected.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [jobsResult, diagnosticsResult, faultsResult, hoursResult, quotesResult, serviceEventsResult] =
      await Promise.all([
        supabase
          .from("jobs")
          .select(`
            id,
            job_number,
            status,
            fault_reported,
            diagnosis,
            work_carried_out,
            opened_date,
            completed_date,
            created_at
          `)
          .eq("company_id", companyId)
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),

        supabase
          .from("machine_diagnostic_reports")
          .select(
            "id, original_filename, report_date, created_at, import_status, reported_hours",
          )
          .eq("company_id", companyId)
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),

        supabase
          .from("machine_diagnostic_faults")
          .select("id, fault_code, description, status, created_at")
          .eq("company_id", companyId)
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),

        supabase
          .from("machine_hour_readings")
          .select("id, hours, reading_date, source, notes, created_at")
          .eq("company_id", companyId)
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),

        supabase
          .from("quotes")
          .select(
            "id, quote_number, title, status, total, quote_date, created_at",
          )
          .eq("company_id", companyId)
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),

        supabase
          .from("machine_service_events")
          .select(
            "id, service_name, service_date, service_hours, technician_name, checklist, created_at",
          )
          .eq("company_id", companyId)
          .eq("machine_id", machineId)
          .order("service_date", { ascending: false }),
      ]);

    const firstError =
      jobsResult.error ||
      diagnosticsResult.error ||
      faultsResult.error ||
      hoursResult.error ||
      quotesResult.error ||
      serviceEventsResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    const jobs = (jobsResult.data ?? []) as JobRow[];
    const jobIds = jobs.map((job) => job.id);

    let invoices: InvoiceRow[] = [];
    if (jobIds.length > 0) {
      const invoiceResult = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, job_id, status, total, issue_date, created_at",
        )
        .eq("company_id", companyId)
        .in("job_id", jobIds)
        .neq("status", "void")
        .order("created_at", { ascending: false });

      if (invoiceResult.error) {
        setErrorMessage(invoiceResult.error.message);
      } else {
        invoices = (invoiceResult.data ?? []) as InvoiceRow[];
      }
    }

    const timelineItems: TimelineItem[] = [
      ...jobs.map((job) => ({
        id: `job-${job.id}`,
        type: "job" as const,
        date: job.completed_date || job.opened_date || job.created_at,
        title: job.job_number ? `Job ${job.job_number}` : "Workshop job",
        description:
          job.work_carried_out ||
          job.diagnosis ||
          job.fault_reported ||
          "No work description recorded.",
        href: `/jobs/${job.id}`,
      })),

      ...((diagnosticsResult.data ?? []) as DiagnosticRow[]).map((report) => ({
        id: `diagnostic-${report.id}`,
        type: "diagnostic" as const,
        date: report.report_date || report.created_at,
        title: "Diagnostic report",
        description: [
          report.original_filename,
          report.reported_hours !== null
            ? `${Number(report.reported_hours).toLocaleString()} hrs`
            : "",
          formatStatus(report.import_status),
        ]
          .filter(Boolean)
          .join(" · "),
      })),

      ...((faultsResult.data ?? []) as FaultRow[]).map((fault) => ({
        id: `fault-${fault.id}`,
        type: "fault" as const,
        date: fault.created_at,
        title: `Fault ${fault.fault_code}`,
        description: [
          fault.description || "No description recorded",
          formatStatus(fault.status),
        ].join(" · "),
      })),

      ...((hoursResult.data ?? []) as HoursRow[]).map((reading) => ({
        id: `hours-${reading.id}`,
        type: "hours" as const,
        date: reading.reading_date || reading.created_at,
        title: `${Number(reading.hours).toLocaleString()} hrs recorded`,
        description: [formatStatus(reading.source), reading.notes]
          .filter(Boolean)
          .join(" · "),
      })),

      ...((quotesResult.data ?? []) as QuoteRow[]).map((quote) => ({
        id: `quote-${quote.id}`,
        type: "quote" as const,
        date: quote.quote_date || quote.created_at,
        title: quote.quote_number ? `Quote ${quote.quote_number}` : "Quote",
        description: [quote.title, formatStatus(quote.status)]
          .filter(Boolean)
          .join(" · "),
        amount: Number(quote.total ?? 0),
        href: `/quotes/${quote.id}`,
      })),



      ...((serviceEventsResult.data ?? []) as ServiceEventRow[]).map((event) => ({
        id: `service-${event.id}`,
        type: "service" as const,
        date: event.service_date || event.created_at,
        title: `${event.service_name} completed`,
        description: [
          event.service_hours !== null
            ? `${Number(event.service_hours).toLocaleString()} hrs`
            : "",
          event.technician_name,
          Array.isArray(event.checklist)
            ? `${event.checklist.filter((item) => item.completed).length} checklist items`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      })),

      ...invoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        type: "invoice" as const,
        date: invoice.issue_date || invoice.created_at,
        title: `Invoice ${invoice.invoice_number}`,
        description: formatStatus(invoice.status),
        amount: Number(invoice.total ?? 0),
        href: `/invoices/${invoice.id}`,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setItems(timelineItems);
    setLoading(false);
  }, [companyId, companyLoading, machineId]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  const filteredItems = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.type === filter)),
    [filter, items],
  );

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href={`/customers/${customerId}/machines/${machineId}`}
          className="text-sm font-bold text-[#176b4d] hover:underline"
        >
          ← Back to machine
        </Link>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#176b4d]">
          Machine intelligence
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Complete machine timeline
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Jobs, services, diagnostics, faults, hour readings, quotes and invoices in one view.
        </p>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                filter === option.value
                  ? "bg-[#103d2e] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {loading || companyLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          Loading machine timeline…
        </section>
      ) : errorMessage && items.length === 0 ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {errorMessage}
        </section>
      ) : filteredItems.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="font-bold text-slate-800">No matching history yet</p>
          <p className="mt-2 text-sm text-slate-500">
            New work and commercial records will appear here automatically.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {errorMessage ? (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Some history could not be loaded: {errorMessage}
            </div>
          ) : null}

          <div className="space-y-5">
            {filteredItems.map((item, index) => {
              const content = (
                <article className="relative pl-10">
                  <div
                    className={`absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${badgeClasses(
                      item.type,
                    )}`}
                  >
                    {iconForType(item.type)}
                  </div>

                  {index < filteredItems.length - 1 ? (
                    <div className="absolute left-[13px] top-8 h-[calc(100%+1.25rem)] w-px bg-slate-200" />
                  ) : null}

                  <div className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-slate-50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-slate-950">{item.title}</h2>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClasses(
                              item.type,
                            )}`}
                          >
                            {item.type}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.description}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        {typeof item.amount === "number" ? (
                          <p className="font-bold text-slate-950">
                            {formatMoney(item.amount)}
                          </p>
                        ) : null}
                        <time className="text-xs font-semibold text-slate-500">
                          {formatDate(item.date)}
                        </time>
                      </div>
                    </div>
                  </div>
                </article>
              );

              return item.href ? (
                <Link key={item.id} href={item.href}>
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function badgeClasses(type: TimelineType) {
  switch (type) {
    case "diagnostic":
      return "bg-blue-100 text-blue-800";
    case "fault":
      return "bg-amber-100 text-amber-800";
    case "hours":
      return "bg-emerald-100 text-emerald-800";
    case "quote":
      return "bg-violet-100 text-violet-800";
    case "invoice":
      return "bg-cyan-100 text-cyan-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

function iconForType(type: TimelineType) {
  switch (type) {
    case "diagnostic":
      return "D";
    case "fault":
      return "!";
    case "hours":
      return "H";
    case "quote":
      return "Q";
    case "invoice":
      return "£";
    default:
      return "J";
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatStatus(value: string | null) {
  if (!value) return "";
  return value
    .trim()
    .replace(/[\s_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}