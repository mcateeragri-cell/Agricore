"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getActiveCompany } from "@/lib/client/active-company";
import Card from "../../Components/ui/Card";
import WorkspaceHeader from "../../Components/ui/WorkspaceHeader";
import { useRegionalFormatters } from "@/lib/client/use-regional-formatters";

type QuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted";

type Quote = {
  id: string;
  quote_number: string | null;
  customer_id: string;
  machine_id: string | null;
  converted_job_id: string | null;
  status: QuoteStatus;
  title: string | null;
  quote_date: string;
  expiry_date: string | null;
  subtotal: number;
  vat_total: number;
  total: number;
  revision_number: number;
  created_at: string;
};

type Customer = {
  id: string;
  name?: string | null;
  company_name?: string | null;
  business_name?: string | null;
  contact_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type Machine = {
  id: string;
  make?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  registration?: string | null;
  registration_number?: string | null;
  serial_number?: string | null;
};

const statusOptions: Array<{ value: "all" | QuoteStatus; label: string }> = [
  { value: "all", label: "All Quotes" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "converted", label: "Converted" },
];

function formatCurrency(value: number | string | null) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getCustomerName(customer?: Customer) {
  if (!customer) return "Unknown customer";

  const fullName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    customer.company_name ||
    customer.business_name ||
    customer.name ||
    fullName ||
    customer.contact_name ||
    "Unnamed customer"
  );
}

function getMachineName(machine?: Machine) {
  if (!machine) return "No machine";

  const make = machine.make || machine.manufacturer || "";
  const model = machine.model || "";
  const registration =
    machine.registration || machine.registration_number || "";

  const main = [make, model].filter(Boolean).join(" ").trim();

  if (main && registration) return `${main} · ${registration}`;
  if (main) return main;
  if (registration) return registration;
  if (machine.serial_number) return machine.serial_number;

  return "Unnamed machine";
}

function getStatusClasses(status: QuoteStatus) {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "sent":
      return "bg-blue-100 text-blue-800";
    case "viewed":
      return "bg-violet-100 text-violet-800";
    case "accepted":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "expired":
      return "bg-amber-100 text-amber-800";
    case "converted":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: QuoteStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [machines, setMachines] = useState<Record<string, Machine>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | QuoteStatus>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { money, date } = useRegionalFormatters();
  const formatCurrency = money;
  const formatDate = (value: string | null) => value ? date(`${value.slice(0, 10)}T12:00:00`, { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeCompany = await getActiveCompany();

    const { data: quoteData, error: quoteError } = await supabase
      .from("quotes")
      .select(
        "id, quote_number, customer_id, machine_id, converted_job_id, status, title, quote_date, expiry_date, subtotal, vat_total, total, revision_number, created_at",
      )
      .eq("company_id", activeCompany.id)
      .order("created_at", { ascending: false });

    if (quoteError) {
      console.error("Unable to load quotes:", quoteError);
      setErrorMessage(quoteError.message);
      setQuotes([]);
      setLoading(false);
      return;
    }

    const loadedQuotes = (quoteData ?? []) as Quote[];
    setQuotes(loadedQuotes);

    const customerIds = Array.from(
      new Set(loadedQuotes.map((quote) => quote.customer_id).filter(Boolean)),
    );

    const machineIds = Array.from(
      new Set(
        loadedQuotes
          .map((quote) => quote.machine_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const [customerResult, machineResult] = await Promise.all([
      customerIds.length > 0
        ? supabase.from("customers").select("*").eq("company_id", activeCompany.id).in("id", customerIds)
        : Promise.resolve({ data: [], error: null }),
      machineIds.length > 0
        ? supabase.from("machines").select("*").eq("company_id", activeCompany.id).in("id", machineIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (customerResult.error) {
      console.error("Unable to load quote customers:", customerResult.error);
      setErrorMessage(customerResult.error.message);
    }

    if (machineResult.error) {
      console.error("Unable to load quote machines:", machineResult.error);
      setErrorMessage((current) =>
        current
          ? `${current} ${machineResult.error?.message ?? ""}`.trim()
          : machineResult.error?.message ?? "",
      );
    }

    const customerMap = Object.fromEntries(
      ((customerResult.data ?? []) as Customer[]).map((customer) => [
        customer.id,
        customer,
      ]),
    );

    const machineMap = Object.fromEntries(
      ((machineResult.data ?? []) as Machine[]).map((machine) => [
        machine.id,
        machine,
      ]),
    );

      setCustomers(customerMap);
      setMachines(machineMap);
    } catch (error) {
      console.error("Unable to load quotes:", error);
      setQuotes([]);
      setCustomers({});
      setMachines({});
      setErrorMessage(error instanceof Error ? error.message : "Unable to load quotes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  const filteredQuotes = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return quotes.filter((quote) => {
      if (statusFilter !== "all" && quote.status !== statusFilter) {
        return false;
      }

      if (!search) return true;

      const customerName = getCustomerName(customers[quote.customer_id]);
      const machineName = quote.machine_id
        ? getMachineName(machines[quote.machine_id])
        : "";

      return [
        quote.quote_number,
        quote.title,
        customerName,
        machineName,
        quote.status,
      ].some((value) => value?.toLowerCase().includes(search));
    });
  }, [customers, machines, quotes, searchTerm, statusFilter]);

  const draftCount = quotes.filter((quote) => quote.status === "draft").length;
  const awaitingCount = quotes.filter((quote) =>
    ["sent", "viewed"].includes(quote.status),
  ).length;
  const acceptedValue = quotes
    .filter((quote) => quote.status === "accepted")
    .reduce((total, quote) => total + Number(quote.total), 0);
  const openValue = quotes
    .filter((quote) =>
      ["draft", "sent", "viewed", "accepted"].includes(quote.status),
    )
    .reduce((total, quote) => total + Number(quote.total), 0);

  return (
    <div className="w-full space-y-6 px-5 py-5 lg:px-7">
      <WorkspaceHeader
        eyebrow="Sales & estimating"
        title="Quotes"
        description="Create, track and convert customer quotations without making the estimating workflow feel heavy."
        actions={
          <Link
            href="/quotes/new"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)]"
          >
            + New quote
          </Link>
        }
      />

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="ui-compact-metrics">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Draft Quotes
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{draftCount}</p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Awaiting Reply
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-800">
            {awaitingCount}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Accepted Value
          </p>
          <p className="mt-2 text-2xl font-bold text-green-800">
            {formatCurrency(acceptedValue)}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open Quote Value
          </p>
          <p className="mt-2 text-2xl font-bold text-[#103d2e]">
            {formatCurrency(openValue)}
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">All Quotes</h2>
            <p className="text-sm text-slate-500">
              Search by quote number, customer, machine or title.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadQuotes()}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search quotes..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | QuoteStatus)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading quotes...
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold text-slate-700">No quotes found</p>
              <p className="mt-1 text-sm text-slate-500">
                Create a new quote or adjust your filters.
              </p>
            </div>
          ) : (
            <table className="ui-data-table min-w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quote
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Machine
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="px-3 py-4">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="font-semibold text-[#103d2e] hover:underline"
                      >
                        {quote.quote_number || "Draft quote"}
                      </Link>

                      {quote.title && (
                        <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {quote.title}
                        </p>
                      )}

                      {quote.revision_number > 1 && (
                        <p className="mt-1 text-xs text-slate-400">
                          Revision {quote.revision_number}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <Link
                        href={`/customers/${quote.customer_id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {getCustomerName(customers[quote.customer_id])}
                      </Link>
                    </td>

                    <td className="px-3 py-4 text-sm text-slate-600">
                      {quote.machine_id ? (
                        <Link
                          href={`/machines/${quote.machine_id}`}
                          className="hover:text-[#103d2e] hover:underline"
                        >
                          {getMachineName(machines[quote.machine_id])}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-3 py-4 text-sm text-slate-600">
                      {formatDate(quote.quote_date)}
                      {quote.expiry_date && (
                        <p className="mt-1 text-xs text-slate-400">
                          Expires {formatDate(quote.expiry_date)}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(quote.total)}
                    </td>

                    <td className="px-3 py-4 text-right">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          quote.status,
                        )}`}
                      >
                        {formatStatus(quote.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}