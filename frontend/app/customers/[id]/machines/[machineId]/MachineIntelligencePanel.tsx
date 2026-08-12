"use client";

import Link from "next/link";
import { useRegionalFormatters } from "@/lib/client/use-regional-formatters";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Card from "../../../../../Components/ui/Card";
import { supabase } from "@/lib/supabase";

type MachineIntelligencePanelProps = {
  companyId: string;
  customerId: string;
  machineId: string;
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

type LabourRow = {
  job_id: string;
  hours: number | string | null;
};

type PartRow = {
  job_id: string;
  quantity: number | string | null;
  unit_price: number | string | null;
};

type InvoiceRow = {
  job_id: string | null;
  total: number | string | null;
  status: string | null;
};

type QuoteRow = {
  id: string;
  quote_number: string | null;
  title: string | null;
  status: string | null;
  total: number | string | null;
  quote_date: string | null;
};

const CLOSED_STATUSES = new Set([
  "completed",
  "cancelled",
  "closed",
]);

const STOP_WORDS = new Set([
  "and",
  "the",
  "with",
  "from",
  "this",
  "that",
  "machine",
  "fault",
  "repair",
  "check",
  "not",
  "for",
  "but",
  "was",
  "has",
  "had",
  "after",
  "when",
]);

export default function MachineIntelligencePanel({
  companyId,
  customerId,
  machineId,
}: MachineIntelligencePanelProps) {
  const { money } = useRegionalFormatters();
  const formatCurrency = money;
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [labour, setLabour] = useState<LabourRow[]>([]);
  const [parts, setParts] = useState<PartRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadIntelligence = useCallback(async () => {
    if (!companyId) {
      setJobs([]);
      setLabour([]);
      setParts([]);
      setInvoices([]);
      setQuotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const [jobsResult, quotesResult] = await Promise.all([
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
        .from("quotes")
        .select(`
          id,
          quote_number,
          title,
          status,
          total,
          quote_date
        `)
        .eq("company_id", companyId)
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false }),
    ]);

    if (jobsResult.error || quotesResult.error) {
      const message =
        jobsResult.error?.message ??
        quotesResult.error?.message ??
        "Unable to load machine intelligence.";

      setError(message);
      setLoading(false);
      return;
    }

    const loadedJobs = (jobsResult.data ?? []) as JobRow[];
    const jobIds = loadedJobs.map((job) => job.id);

    let loadedLabour: LabourRow[] = [];
    let loadedParts: PartRow[] = [];
    let loadedInvoices: InvoiceRow[] = [];

    if (jobIds.length > 0) {
      const [labourResult, partsResult, invoicesResult] =
        await Promise.all([
          supabase
            .from("job_labour_entries")
            .select("job_id, hours")
            .eq("company_id", companyId)
            .in("job_id", jobIds),

          supabase
            .from("job_parts_used")
            .select("job_id, quantity, unit_price")
            .eq("company_id", companyId)
            .in("job_id", jobIds),

          supabase
            .from("invoices")
            .select("job_id, total, status")
            .eq("company_id", companyId)
            .in("job_id", jobIds)
            .neq("status", "void"),
        ]);

      const firstError =
        labourResult.error ||
        partsResult.error ||
        invoicesResult.error;

      if (firstError) {
        setError(firstError.message);
      }

      loadedLabour = (labourResult.data ?? []) as LabourRow[];
      loadedParts = (partsResult.data ?? []) as PartRow[];
      loadedInvoices = (invoicesResult.data ?? []) as InvoiceRow[];
    }

    setJobs(loadedJobs);
    setQuotes((quotesResult.data ?? []) as QuoteRow[]);
    setLabour(loadedLabour);
    setParts(loadedParts);
    setInvoices(loadedInvoices);
    setLoading(false);
  }, [companyId, machineId]);

  useEffect(() => {
    void loadIntelligence();
  }, [loadIntelligence]);

  const metrics = useMemo(() => {
    const openJobs = jobs.filter(
      (job) => !CLOSED_STATUSES.has(normalise(job.status)),
    ).length;

    const completedJobs = jobs.filter((job) =>
      CLOSED_STATUSES.has(normalise(job.status)),
    ).length;

    const labourHours = labour.reduce(
      (total, entry) => total + asNumber(entry.hours),
      0,
    );

    const partsValue = parts.reduce(
      (total, part) =>
        total +
        asNumber(part.quantity) * asNumber(part.unit_price),
      0,
    );

    const invoiceValue = invoices.reduce(
      (total, invoice) => total + asNumber(invoice.total),
      0,
    );

    const lastCompletedJob = jobs.find(
      (job) => Boolean(job.completed_date),
    );

    return {
      openJobs,
      completedJobs,
      labourHours,
      partsValue,
      invoiceValue,
      lastCompletedDate: lastCompletedJob?.completed_date ?? null,
    };
  }, [invoices, jobs, labour, parts]);

  const repeatedIssues = useMemo(() => {
    const counts = new Map<string, number>();

    for (const job of jobs) {
      const source = [
        job.fault_reported,
        job.diagnosis,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const uniqueWords = new Set(
        source
          .replace(/[^a-z0-9\s-]/g, " ")
          .split(/\s+/)
          .map((word) => word.trim())
          .filter(
            (word) =>
              word.length >= 4 &&
              !STOP_WORDS.has(word),
          ),
      );

      for (const word of uniqueWords) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label, count }));
  }, [jobs]);

  const recentJobs = jobs.slice(0, 4);
  const recentQuote = quotes[0] ?? null;

  if (loading) {
    return (
      <Card className="p-6 xl:col-span-3">
        <p className="text-sm font-semibold text-slate-600">
          Analysing machine history…
        </p>
      </Card>
    );
  }

  return (
    <section className="space-y-5 xl:col-span-3">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some machine intelligence could not be loaded: {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Open jobs" value={String(metrics.openJobs)} />
        <MetricCard
          label="Completed jobs"
          value={String(metrics.completedJobs)}
        />
        <MetricCard
          label="Lifetime labour"
          value={`${metrics.labourHours.toFixed(1)} hrs`}
        />
        <MetricCard
          label="Parts charged"
          value={formatMoney(metrics.partsValue)}
        />
        <MetricCard
          label="Invoiced value"
          value={formatMoney(metrics.invoiceValue)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Machine intelligence
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">
                Recent work history
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest jobs recorded against this machine.
              </p>
            </div>

            <Link
              href={`/customers/${customerId}/machines/${machineId}/timeline`}
              className="text-sm font-bold text-[#176b4d] hover:underline"
            >
              Full timeline →
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-7 text-center">
              <p className="font-semibold text-slate-700">
                No jobs recorded yet
              </p>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:text-[#176b4d]"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      {job.job_number || "Workshop job"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {job.fault_reported ||
                        job.work_carried_out ||
                        "No fault description recorded."}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <StatusBadge status={job.status} />
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(
                        job.completed_date ||
                          job.opened_date ||
                          job.created_at,
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Patterns and planning
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">
            What needs attention
          </h2>

          <div className="mt-5 space-y-4">
            <InsightRow
              label="Last completed job"
              value={formatDate(metrics.lastCompletedDate)}
            />

            <InsightRow
              label="Latest quote"
              value={
                recentQuote
                  ? `${recentQuote.quote_number || "Quote"} · ${formatMoney(
                      recentQuote.total,
                    )}`
                  : "No quotes recorded"
              }
            />

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">
                Repeat issue signals
              </p>

              {repeatedIssues.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No repeated fault terms detected yet.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {repeatedIssues.map((issue) => (
                    <span
                      key={issue.label}
                      className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold capitalize text-amber-800"
                    >
                      {issue.label} × {issue.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </Card>
  );
}

function InsightRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const value = normalise(status);

  const classes = CLOSED_STATUSES.has(value)
    ? "bg-emerald-100 text-emerald-800"
    : value === "in_progress"
      ? "bg-blue-100 text-blue-800"
      : "bg-amber-100 text-amber-800";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>
      {formatStatus(status)}
    </span>
  );
}

function normalise(value: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatStatus(value: string | null) {
  const status = normalise(value);
  return status
    ? status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase())
    : "Unknown";
}

function asNumber(value: number | string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(asNumber(value));
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
