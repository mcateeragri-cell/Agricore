"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number | string | null;
  vat_amount: number | string | null;
  total: number | string | null;
  amount_paid: number | string | null;
};

type InvoiceResponse = {
  invoices?: InvoiceRow[];
  error?: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

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

      const body =
        (await response.json()) as InvoiceResponse;

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

  const filteredInvoices = useMemo(() => {
    if (statusFilter === "all") {
      return invoices;
    }

    return invoices.filter(
      (invoice) =>
        normaliseStatus(invoice.status) ===
        statusFilter,
    );
  }, [invoices, statusFilter]);

  const totals = useMemo(() => {
    return invoices.reduce(
      (summary, invoice) => {
        const total = asNumber(invoice.total);
        const amountPaid = asNumber(
          invoice.amount_paid,
        );

        const outstanding = Math.max(
          0,
          total - amountPaid,
        );

        summary.totalInvoiced += total;
        summary.outstanding += outstanding;

        if (
          normaliseStatus(invoice.status) ===
          "paid"
        ) {
          summary.paid += total;
        }

        if (
          normaliseStatus(invoice.status) ===
          "draft"
        ) {
          summary.drafts += 1;
        }

        return summary;
      },
      {
        totalInvoiced: 0,
        outstanding: 0,
        paid: 0,
        drafts: 0,
      },
    );
  }, [invoices]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              AgriCore
            </p>

            <h1 className="text-3xl font-bold text-slate-950">
              Invoices
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Review, approve and send customer
              invoices.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadInvoices()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
          >
            Refresh
          </button>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total invoiced"
            value={formatMoney(
              totals.totalInvoiced,
            )}
          />

          <SummaryCard
            label="Outstanding"
            value={formatMoney(totals.outstanding)}
          />

          <SummaryCard
            label="Paid"
            value={formatMoney(totals.paid)}
          />

          <SummaryCard
            label="Draft invoices"
            value={String(totals.drafts)}
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
                {filteredInvoices.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="all">
                All statuses
              </option>
              <option value="draft">Draft</option>
              <option value="approved">
                Approved
              </option>
              <option value="sent">Sent</option>
              <option value="part_paid">
                Part paid
              </option>
              <option value="paid">Paid</option>
              <option value="overdue">
                Overdue
              </option>
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
                onClick={() =>
                  void loadInvoices()
                }
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
                Approve a completed job and create its
                draft invoice.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHeading>
                      Invoice
                    </TableHeading>
                    <TableHeading>
                      Customer
                    </TableHeading>
                    <TableHeading>
                      Issue date
                    </TableHeading>
                    <TableHeading>
                      Due date
                    </TableHeading>
                    <TableHeading>
                      Status
                    </TableHeading>
                    <TableHeading align="right">
                      Total
                    </TableHeading>
                    <TableHeading align="right">
                      Outstanding
                    </TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInvoices.map(
                    (invoice) => {
                      const total = asNumber(
                        invoice.total,
                      );

                      const outstanding = Math.max(
                        0,
                        total -
                          asNumber(
                            invoice.amount_paid,
                          ),
                      );

                      return (
                        <tr
                          key={invoice.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="font-semibold text-emerald-700 hover:text-emerald-900"
                            >
                              {invoice.invoice_number}
                            </Link>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-800">
                            {invoice.customer_name ||
                              "No customer"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              invoice.issue_date,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              invoice.due_date,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <StatusBadge
                              status={
                                invoice.status
                              }
                            />
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                            {formatMoney(total)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                            {formatMoney(
                              outstanding,
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )}
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
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </p>
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
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalised = normaliseStatus(status);

  const classes: Record<string, string> = {
    draft:
      "bg-slate-100 text-slate-700",
    approved:
      "bg-blue-100 text-blue-800",
    sent:
      "bg-amber-100 text-amber-800",
    part_paid:
      "bg-orange-100 text-orange-800",
    paid:
      "bg-emerald-100 text-emerald-800",
    overdue:
      "bg-red-100 text-red-800",
    void:
      "bg-slate-200 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        classes[normalised] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {displayStatus(normalised)}
    </span>
  );
}

function normaliseStatus(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function displayStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function asNumber(value: unknown) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value.slice(0, 10)}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB").format(
    date,
  );
}