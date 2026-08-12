"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRegionalFormatters } from "@/lib/client/use-regional-formatters";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  paid_at: string | null;
  subtotal: number | string | null;
  vat_amount: number | string | null;
  total: number | string | null;
  amount_paid: number | string | null;
};

type InvoiceResponse = {
  invoices?: InvoiceRow[];
  error?: string;
};

type PeriodKey =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "all_time"
  | "custom";

type DateRange = {
  start: Date | null;
  end: Date | null;
};

type InvoiceTotals = {
  totalInvoiced: number;
  outstanding: number;
  paid: number;
  drafts: number;
};

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  last_month: "Last month",
  this_quarter: "This quarter",
  this_year: "This year",
  all_time: "All time",
  custom: "Custom range",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const { money, date } = useRegionalFormatters();
  const formatMoney = money;
  const formatDate = (value: string | null) => value ? date(`${value.slice(0, 10)}T12:00:00`, { day: "2-digit", month: "short", year: "numeric" }) : "—";

  useEffect(() => {
    void loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/invoices", {
        cache: "no-store",
      });

      const body = (await response.json()) as InvoiceResponse;

      if (!response.ok) {
        throw new Error(
          body.error ?? "Unable to load invoices.",
        );
      }

      setInvoices(body.invoices ?? []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load invoices.",
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedRange = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  const previousRange = useMemo(
    () => getPreviousDateRange(period, selectedRange),
    [period, selectedRange],
  );

  const periodInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        isDateInRange(invoice.issue_date, selectedRange),
      ),
    [invoices, selectedRange],
  );

  const filteredInvoices = useMemo(() => {
    if (statusFilter === "all") {
      return periodInvoices;
    }

    return periodInvoices.filter(
      (invoice) =>
        normaliseStatus(invoice.status) === statusFilter,
    );
  }, [periodInvoices, statusFilter]);

  const totals = useMemo(
    () => calculateTotals(invoices, selectedRange),
    [invoices, selectedRange],
  );

  const previousTotals = useMemo(
    () =>
      previousRange
        ? calculateTotals(invoices, previousRange)
        : null,
    [invoices, previousRange],
  );

  const selectedPeriodLabel =
    period === "custom"
      ? formatRangeLabel(selectedRange)
      : PERIOD_LABELS[period];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              AgriCore
            </p>

            <h1 className="text-3xl font-bold text-slate-950">
              Invoices
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Review, approve and send customer invoices.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-sm font-semibold text-slate-700">
              Reporting period
              <select
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value as PeriodKey)
                }
                className="mt-1 block min-w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                {Object.entries(PERIOD_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void loadInvoices()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>
        </header>

        {period === "custom" ? (
          <section className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
            <label className="text-sm font-semibold text-slate-700">
              From
              <input
                type="date"
                value={customStart}
                onChange={(event) =>
                  setCustomStart(event.target.value)
                }
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              To
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(event) =>
                  setCustomEnd(event.target.value)
                }
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              />
            </label>

            <p className="pb-2 text-sm text-slate-500">
              Figures and the invoice register use the selected date range.
            </p>
          </section>
        ) : null}

        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-700">
            {selectedPeriodLabel}
          </p>

          <p className="text-xs text-slate-500">
            Paid is counted using the payment date.
          </p>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total invoiced"
            value={formatMoney(totals.totalInvoiced)}
            trend={calculateTrend(
              totals.totalInvoiced,
              previousTotals?.totalInvoiced,
            )}
          />

          <SummaryCard
            label="Outstanding"
            value={formatMoney(totals.outstanding)}
            trend={calculateTrend(
              totals.outstanding,
              previousTotals?.outstanding,
            )}
          />

          <SummaryCard
            label="Paid"
            value={formatMoney(totals.paid)}
            trend={calculateTrend(
              totals.paid,
              previousTotals?.paid,
            )}
          />

          <SummaryCard
            label="Draft invoices"
            value={String(totals.drafts)}
            trend={calculateTrend(
              totals.drafts,
              previousTotals?.drafts,
            )}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">
                Invoice register
              </h2>

              <p className="text-sm text-slate-500">
                {filteredInvoices.length} invoice
                {filteredInvoices.length === 1 ? "" : "s"} in {selectedPeriodLabel.toLowerCase()}
              </p>
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
              <option value="part_paid">Part paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading invoices…
            </div>
          ) : error ? (
            <div className="p-8">
              <p className="text-sm font-medium text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() => void loadInvoices()}
                className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="font-semibold text-slate-900">
                No invoices found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                No invoices match the selected period and status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHeading>Invoice</TableHeading>
                    <TableHeading>Customer</TableHeading>
                    <TableHeading>Issue date</TableHeading>
                    <TableHeading>Due date</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading align="right">Total</TableHeading>
                    <TableHeading align="right">Outstanding</TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInvoices.map((invoice) => {
                    const total = asNumber(invoice.total);
                    const outstanding = Math.max(
                      0,
                      total - asNumber(invoice.amount_paid),
                    );

                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-4">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="font-semibold text-emerald-700 hover:text-emerald-900"
                          >
                            {invoice.invoice_number}
                          </Link>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-800">
                          {invoice.customer_name || "No customer"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(invoice.issue_date)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(invoice.due_date)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <StatusBadge status={invoice.status} />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                          {formatMoney(total)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                          {formatMoney(outstanding)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: number | null;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </p>

      {trend !== null ? (
        <p
          className={`mt-2 text-xs font-semibold ${
            trend > 0
              ? "text-emerald-700"
              : trend < 0
                ? "text-rose-700"
                : "text-slate-500"
          }`}
        >
          {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"}{" "}
          {trend === 0 ? "No change" : `${Math.abs(trend).toFixed(0)}% vs previous period`}
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          No previous-period comparison
        </p>
      )}
    </article>
  );
}

function TableHeading({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalised = normaliseStatus(status);

  const classes: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    approved: "bg-blue-100 text-blue-800",
    sent: "bg-amber-100 text-amber-800",
    part_paid: "bg-orange-100 text-orange-800",
    paid: "bg-emerald-100 text-emerald-800",
    overdue: "bg-red-100 text-red-800",
    void: "bg-slate-200 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        classes[normalised] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {displayStatus(normalised)}
    </span>
  );
}

function calculateTotals(
  invoices: InvoiceRow[],
  range: DateRange,
): InvoiceTotals {
  const issuedInRange = invoices.filter((invoice) =>
    isDateInRange(invoice.issue_date, range),
  );

  const paidInRange = invoices.filter(
    (invoice) =>
      normaliseStatus(invoice.status) === "paid" &&
      isDateInRange(invoice.paid_at, range),
  );

  return {
    totalInvoiced: issuedInRange.reduce(
      (total, invoice) => total + asNumber(invoice.total),
      0,
    ),
    outstanding: issuedInRange.reduce(
      (total, invoice) =>
        total +
        Math.max(
          0,
          asNumber(invoice.total) - asNumber(invoice.amount_paid),
        ),
      0,
    ),
    paid: paidInRange.reduce(
      (total, invoice) =>
        total + asNumber(invoice.amount_paid || invoice.total),
      0,
    ),
    drafts: issuedInRange.filter(
      (invoice) => normaliseStatus(invoice.status) === "draft",
    ).length,
  };
}

function getDateRange(
  period: PeriodKey,
  customStart: string,
  customEnd: string,
): DateRange {
  const now = startOfDay(new Date());

  if (period === "all_time") {
    return { start: null, end: null };
  }

  if (period === "custom") {
    return {
      start: parseDateOnly(customStart),
      end: customEnd ? endOfDay(parseDateOnly(customEnd)) : null,
    };
  }

  if (period === "today") {
    return { start: now, end: endOfDay(now) };
  }

  if (period === "this_week") {
    const day = now.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    const start = addDays(now, -daysSinceMonday);
    return { start, end: endOfDay(addDays(start, 6)) };
  }

  if (period === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endOfDay(
      new Date(now.getFullYear(), now.getMonth() + 1, 0),
    );
    return { start, end };
  }

  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = endOfDay(
      new Date(now.getFullYear(), now.getMonth(), 0),
    );
    return { start, end };
  }

  if (period === "this_quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterStartMonth, 1);
    const end = endOfDay(
      new Date(now.getFullYear(), quarterStartMonth + 3, 0),
    );
    return { start, end };
  }

  const start = new Date(now.getFullYear(), 0, 1);
  const end = endOfDay(new Date(now.getFullYear(), 11, 31));
  return { start, end };
}

function getPreviousDateRange(
  period: PeriodKey,
  range: DateRange,
): DateRange | null {
  if (
    period === "all_time" ||
    period === "custom" ||
    !range.start ||
    !range.end
  ) {
    return null;
  }

  const duration = range.end.getTime() - range.start.getTime() + 1;
  const previousEnd = new Date(range.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration + 1);

  return {
    start: startOfDay(previousStart),
    end: endOfDay(previousEnd),
  };
}

function isDateInRange(
  value: string | null,
  range: DateRange,
) {
  if (!range.start && !range.end) {
    return true;
  }

  const date = parseDateOnly(value);

  if (!date) {
    return false;
  }

  if (range.start && date < range.start) {
    return false;
  }

  if (range.end && date > range.end) {
    return false;
  }

  return true;
}

function parseDateOnly(value: string | null) {
  if (!value) {
    return null;
  }

  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function endOfDay(date: Date | null) {
  if (!date) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function calculateTrend(
  current: number,
  previous: number | undefined,
) {
  if (previous === undefined) {
    return null;
  }

  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / previous) * 100;
}

function formatRangeLabel(range: DateRange) {
  if (!range.start && !range.end) {
    return "Custom range";
  }

  if (range.start && range.end) {
    return `${formatDisplayDate(range.start)} – ${formatDisplayDate(range.end)}`;
  }

  if (range.start) {
    return `From ${formatDisplayDate(range.start)}`;
  }

  return `Up to ${formatDisplayDate(range.end as Date)}`;
}

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normaliseStatus(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function displayStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(value: string | null) {
  const date = parseDateOnly(value);

  if (!date) {
    return value || "—";
  }

  return new Intl.DateTimeFormat("en-GB").format(date);
}
