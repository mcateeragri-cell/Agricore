"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import Card from "../ui/Card";

type DatabaseRow = Record<string, unknown>;

type SummaryCard = {
  title: string;
  value: string;
  detail: string;
  accent: string;
  icon: string;
};

const ACTIVE_JOB_STATUSES = new Set([
  "open",
  "new",
  "scheduled",
  "in_progress",
  "in progress",
  "parts_required",
  "parts required",
  "waiting_parts",
  "waiting parts",
  "waiting_customer",
  "waiting customer",
]);

const ATTENTION_JOB_STATUSES = new Set([
  "parts_required",
  "parts required",
  "waiting_parts",
  "waiting parts",
  "waiting_customer",
  "waiting customer",
]);

const PAID_INVOICE_STATUSES = new Set([
  "paid",
  "settled",
  "completed",
]);

function normaliseStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
}

function getNumber(
  row: DatabaseRow,
  keys: string[],
) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim() !== ""
    ) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function getDate(
  row: DatabaseRow,
  keys: string[],
) {
  for (const key of keys) {
    const value = row[key];

    if (
      typeof value === "string" ||
      value instanceof Date
    ) {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return null;
}

function getInvoiceTotal(row: DatabaseRow) {
  const storedTotal = getNumber(row, [
    "total",
    "grand_total",
    "total_amount",
    "amount_total",
    "invoice_total",
  ]);

  if (storedTotal > 0) {
    return storedTotal;
  }

  const subtotal = getNumber(row, [
    "subtotal",
    "sub_total",
    "net_total",
  ]);

  const vatAmount = getNumber(row, [
    "vat_amount",
    "tax_amount",
  ]);

  return subtotal + vatAmount;
}

function getAmountPaid(row: DatabaseRow) {
  const paidAmount = getNumber(row, [
    "amount_paid",
    "paid_amount",
  ]);

  if (paidAmount > 0) {
    return paidAmount;
  }

  const status = normaliseStatus(row.status);

  return PAID_INVOICE_STATUSES.has(status)
    ? getInvoiceTotal(row)
    : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function isDateInCurrentMonth(date: Date) {
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function isDateWithinNextDays(
  date: Date,
  days: number,
) {
  const now = new Date();
  const end = new Date(now);

  end.setDate(end.getDate() + days);

  return date >= now && date <= end;
}

export default function SummaryCards() {
  const [jobs, setJobs] = useState<DatabaseRow[]>([]);
  const [invoices, setInvoices] =
    useState<DatabaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadSummaryData = useCallback(async () => {
    setErrorMessage("");

    const [jobsResult, invoicesResult] =
      await Promise.all([
        supabase.from("jobs").select("*"),
        supabase.from("invoices").select("*"),
      ]);

    if (jobsResult.error || invoicesResult.error) {
      const message =
        jobsResult.error?.message ||
        invoicesResult.error?.message ||
        "Unable to load dashboard summary.";

      console.error(
        "Unable to load dashboard summary:",
        jobsResult.error,
        invoicesResult.error,
      );

      setErrorMessage(message);
      setLoading(false);
      return;
    }

    setJobs(
      (jobsResult.data ?? []) as DatabaseRow[],
    );
    setInvoices(
      (invoicesResult.data ?? []) as DatabaseRow[],
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSummaryData();

    const jobsChannel = supabase
      .channel("dashboard-summary-jobs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        () => {
          void loadSummaryData();
        },
      )
      .subscribe();

    const invoicesChannel = supabase
      .channel("dashboard-summary-invoices")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoices",
        },
        () => {
          void loadSummaryData();
        },
      )
      .subscribe();

    const fallbackRefresh = window.setInterval(
      () => {
        void loadSummaryData();
      },
      60_000,
    );

    return () => {
      window.clearInterval(fallbackRefresh);
      void supabase.removeChannel(jobsChannel);
      void supabase.removeChannel(
        invoicesChannel,
      );
    };
  }, [loadSummaryData]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const activeJobs = jobs.filter((job) =>
      ACTIVE_JOB_STATUSES.has(
        normaliseStatus(job.status),
      ),
    );

    const jobsRequiringAttention = jobs.filter(
      (job) =>
        ATTENTION_JOB_STATUSES.has(
          normaliseStatus(job.status),
        ),
    );

    const unpaidInvoices = invoices.filter(
      (invoice) => {
        const status = normaliseStatus(
          invoice.status,
        );

        const total = getInvoiceTotal(invoice);
        const amountPaid =
          getAmountPaid(invoice);

        return (
          !PAID_INVOICE_STATUSES.has(status) &&
          total - amountPaid > 0.009
        );
      },
    );

    const outstandingValue = unpaidInvoices.reduce(
      (sum, invoice) =>
        sum +
        Math.max(
          0,
          getInvoiceTotal(invoice) -
            getAmountPaid(invoice),
        ),
      0,
    );

    const revenueThisMonth = invoices.reduce(
      (sum, invoice) => {
        const paidDate = getDate(invoice, [
          "paid_at",
          "payment_date",
          "settled_at",
          "updated_at",
        ]);

        if (
          !paidDate ||
          !isDateInCurrentMonth(paidDate)
        ) {
          return sum;
        }

        return sum + getAmountPaid(invoice);
      },
      0,
    );

    const upcomingJobs = jobs.filter((job) => {
      const scheduledDate = getDate(job, [
        "scheduled_date",
        "scheduled_at",
        "start_date",
        "appointment_date",
        "due_date",
      ]);

      if (!scheduledDate) {
        return false;
      }

      const status = normaliseStatus(job.status);

      return (
        status !== "completed" &&
        status !== "cancelled" &&
        isDateWithinNextDays(scheduledDate, 30)
      );
    });

    return [
      {
        title: "Jobs in progress",
        value: String(activeJobs.length),
        detail:
          jobsRequiringAttention.length === 1
            ? "1 requires attention"
            : `${jobsRequiringAttention.length} require attention`,
        accent:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        icon: "🚜",
      },
      {
        title: "Outstanding invoices",
        value: formatCurrency(outstandingValue),
        detail:
          unpaidInvoices.length === 1
            ? "1 invoice unpaid"
            : `${unpaidInvoices.length} invoices unpaid`,
        accent:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
        icon: "💷",
      },
      {
        title: "Revenue this month",
        value: formatCurrency(revenueThisMonth),
        detail: "Paid invoices this month",
        accent:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        icon: "📈",
      },
      {
        title: "Upcoming jobs",
        value: String(upcomingJobs.length),
        detail: "Scheduled within 30 days",
        accent:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        icon: "🔧",
      },
    ];
  }, [jobs, invoices]);

  if (loading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map(
          (_, index) => (
            <Card
              key={index}
              className="rounded-2xl p-5"
            >
              <div className="animate-pulse">
                <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-5 h-9 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-3 h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </Card>
          ),
        )}
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/30">
        <p className="font-bold text-red-700 dark:text-red-300">
          Unable to load dashboard totals
        </p>

        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>

        <button
          type="button"
          onClick={() => void loadSummaryData()}
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((card) => (
        <Card
          key={card.title}
          className="group rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                {card.title}
              </p>

              <h3 className="mt-4 break-words text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {card.value}
              </h3>

              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-400">
                {card.detail}
              </p>
            </div>

            <div
              className={`ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${card.accent}`}
              aria-hidden="true"
            >
              {card.icon}
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}