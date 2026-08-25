"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getActiveCompany } from "@/lib/client/active-company";
import Card from "../../../Components/ui/Card";
import { useRegionalFormatters } from "@/lib/client/use-regional-formatters";
import PartsQuoteReservationActions from "../../../Components/quotes/PartsQuoteReservationActions";

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
  commercial_type: "service" | "machinery_sale" | "parts" | "general" | null;
  status: QuoteStatus;
  title: string | null;
  description: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  quote_date: string;
  expiry_date: string | null;
  labour_total: number;
  parts_total: number;
  subtotal: number;
  discount_type: "percentage" | "fixed" | null;
  discount_value: number;
  discount_total: number;
  vat_rate: number;
  vat_total: number;
  total: number;
  revision_number: number;
  accepted_at: string | null;
  rejected_at: string | null;
  sent_at: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
};

type QuoteItem = {
  id: string;
  quote_id: string;
  item_type:
    | "labour"
    | "part"
    | "travel"
    | "callout"
    | "miscellaneous";
  stock_item_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  line_cost: number;
  line_total: number;
  sort_order: number;
};

type Customer = {
  id: string;
  name?: string | null;
  company_name?: string | null;
  business_name?: string | null;
  contact_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
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

function formatCurrency(value: number | string | null) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value ?? 0));
}

function formatQuantity(value: number | string | null) {
  const numeric = Number(value ?? 0);
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function getCustomerName(customer: Customer | null) {
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

function getMachineName(machine: Machine | null) {
  if (!machine) return "No machine";

  const make = machine.make || machine.manufacturer || "";
  const model = machine.model || "";
  const registration =
    machine.registration || machine.registration_number || "";
  const label = [make, model].filter(Boolean).join(" ").trim();

  if (label && registration) return `${label} · ${registration}`;
  if (label) return label;
  if (registration) return registration;
  if (machine.serial_number) return machine.serial_number;

  return "Unnamed machine";
}

function statusClasses(status: QuoteStatus) {
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

function labelStatus(status: QuoteStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quoteId = params.id;

  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [partsReserved, setPartsReserved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { money, date, taxName } = useRegionalFormatters();
  const formatCurrency = money;
  const formatDate = (value: string | null) => value ? date(`${value.slice(0, 10)}T12:00:00`, { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const loadQuote = useCallback(async () => {
    if (!quoteId) return;

    setLoading(true);
    setErrorMessage("");

    let companyId = "";

    try {
      const activeCompany = await getActiveCompany();
      companyId = activeCompany.id;
      setActiveCompanyId(companyId);

    const { data: quoteData, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (quoteError || !quoteData) {
      console.error("Unable to load quote:", quoteError);
      setErrorMessage(quoteError?.message ?? "Quote not found.");
      setLoading(false);
      return;
    }

    const loadedQuote = quoteData as Quote;
    setQuote(loadedQuote);

    const [itemsResult, customerResult, machineResult] = await Promise.all([
      supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteId)
        .eq("company_id", companyId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("customers")
        .select("*")
        .eq("id", loadedQuote.customer_id)
        .eq("company_id", companyId)
        .single(),
      loadedQuote.machine_id
        ? supabase
            .from("machines")
            .select("*")
            .eq("id", loadedQuote.machine_id)
            .eq("company_id", companyId)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (itemsResult.error) {
      console.error("Unable to load quote items:", itemsResult.error);
      setErrorMessage(itemsResult.error.message);
    }

    if (customerResult.error) {
      console.error("Unable to load customer:", customerResult.error);
      setErrorMessage((current) =>
        current
          ? `${current} ${customerResult.error?.message ?? ""}`.trim()
          : customerResult.error?.message ?? "",
      );
    }

    if (machineResult.error) {
      console.error("Unable to load machine:", machineResult.error);
      setErrorMessage((current) =>
        current
          ? `${current} ${machineResult.error?.message ?? ""}`.trim()
          : machineResult.error?.message ?? "",
      );
    }

      setItems((itemsResult.data ?? []) as QuoteItem[]);
      setCustomer((customerResult.data ?? null) as Customer | null);
      setMachine((machineResult.data ?? null) as Machine | null);

      if (loadedQuote.commercial_type === "parts") {
        const { data: reservationRows, error: reservationError } = await supabase
          .from("parts_quote_reservations")
          .select("id")
          .eq("company_id", companyId)
          .eq("quote_id", quoteId)
          .eq("status", "reserved")
          .limit(1);

        if (reservationError) {
          console.error("Unable to load Parts quote reservation:", reservationError);
        }

        setPartsReserved((reservationRows ?? []).length > 0);
      } else {
        setPartsReserved(false);
      }
    } catch (error) {
      console.error("Unable to load quote:", error);
      setQuote(null);
      setItems([]);
      setCustomer(null);
      setMachine(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load quote.");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, QuoteItem[]> = {
      labour: [],
      part: [],
      travel: [],
      callout: [],
      miscellaneous: [],
    };

    for (const item of items) {
      groups[item.item_type].push(item);
    }

    return groups;
  }, [items]);

  const sendQuoteEmail = async () => {
    if (!quote) return;
    const defaultEmail = customer?.email ?? "";
    const recipient = window.prompt("Send quotation to:", defaultEmail);
    if (!recipient) return;
    setSendingEmail(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/quotes/${quote.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to email quotation.");
      await loadQuote();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to email quotation.");
    } finally {
      setSendingEmail(false);
    }
  };

  const updateStatus = async (status: QuoteStatus) => {
    if (!quote) return;

    setSavingStatus(true);
    setErrorMessage("");

    const now = new Date().toISOString();

    const payload: Partial<Quote> = { status };

    if (status === "sent") payload.sent_at = now;
    if (status === "accepted") payload.accepted_at = now;
    if (status === "rejected") payload.rejected_at = now;

    const { error } = await supabase
      .from("quotes")
      .update(payload)
      .eq("id", quote.id)
      .eq("company_id", activeCompanyId);

    if (error) {
      console.error("Unable to update quote status:", error);
      setErrorMessage(error.message);
      setSavingStatus(false);
      return;
    }

    await loadQuote();
    setSavingStatus(false);
  };

  const deleteQuote = async () => {
    if (!quote) return;

    const confirmed = window.confirm(
      `Delete ${quote.quote_number ?? "this quote"}? This cannot be undone.`,
    );

    if (!confirmed) return;

    setDeleting(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", quote.id)
      .eq("company_id", activeCompanyId);

    if (error) {
      console.error("Unable to delete quote:", error);
      setErrorMessage(error.message);
      setDeleting(false);
      return;
    }

    router.push("/quotes");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="px-5 py-10 text-sm text-slate-500 lg:px-7">
        Loading quote...
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="space-y-4 px-5 py-10 lg:px-7">
        <p className="text-sm text-red-700">
          {errorMessage || "Quote not found."}
        </p>
        <Link href="/quotes" className="font-semibold text-green-700 hover:underline">
          ← Back to Quotes
        </Link>
      </div>
    );
  }

  const itemSections: Array<{
    key: keyof typeof groupedItems;
    title: string;
  }> = [
    { key: "labour", title: "Labour" },
    { key: "part", title: "Parts" },
    { key: "travel", title: "Travel" },
    { key: "callout", title: "Callout" },
    { key: "miscellaneous", title: "Miscellaneous" },
  ];

  return (
    <div className="w-full space-y-6 px-5 py-5 lg:px-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link
            href="/quotes"
            className="text-sm font-semibold text-green-700 hover:underline"
          >
            ← Back to Quotes
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">
              {quote.quote_number || "Quote"}
            </h1>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                quote.status,
              )}`}
            >
              {labelStatus(quote.status)}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {quote.title || "Untitled quote"} · Revision {quote.revision_number}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={sendingEmail}
            onClick={() => void sendQuoteEmail()}
            className="rounded-xl bg-[#103d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c3024] disabled:opacity-50"
          >
            {sendingEmail ? "Sending…" : "Email Quote"}
          </button>
          {quote.status === "draft" && (
            <button
              type="button"
              disabled={savingStatus}
              onClick={() => void updateStatus("sent")}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
            >
              Mark Sent
            </button>
          )}

          {quote.commercial_type !== "parts" && ["draft", "sent", "viewed"].includes(quote.status) && (
            <>
              <button
                type="button"
                disabled={savingStatus}
                onClick={() => void updateStatus("accepted")}
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100 disabled:opacity-50"
              >
                Mark Accepted
              </button>

              <button
                type="button"
                disabled={savingStatus}
                onClick={() => void updateStatus("rejected")}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Mark Rejected
              </button>
            </>
          )}

          {quote.converted_job_id ? (
            <Link
              href={`/jobs/${quote.converted_job_id}`}
              className="rounded-xl bg-[#103d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c3024]"
            >
              View Job
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title="Job conversion will be connected after confirming your jobs table fields."
              className="cursor-not-allowed rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Convert to Job
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-bold text-slate-900">Customer &amp; machine</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </p>
                <Link
                  href={`/customers/${quote.customer_id}`}
                  className="mt-2 block text-lg font-bold text-[#103d2e] hover:underline"
                >
                  {getCustomerName(customer)}
                </Link>
                {(customer?.phone || customer?.mobile) && (
                  <p className="mt-1 text-sm text-slate-600">
                    {customer.phone || customer.mobile}
                  </p>
                )}
                {customer?.email && (
                  <p className="mt-1 text-sm text-slate-600">{customer.email}</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Machine
                </p>
                {quote.machine_id ? (
                  <Link
                    href={`/machines/${quote.machine_id}`}
                    className="mt-2 block text-lg font-bold text-[#103d2e] hover:underline"
                  >
                    {getMachineName(machine)}
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No machine selected</p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">Quote items</h2>

            <div className="mt-5 space-y-6">
              {itemSections.map((section) => {
                const sectionItems = groupedItems[section.key];
                if (sectionItems.length === 0) return null;

                return (
                  <div key={section.key}>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                      {section.title}
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-slate-200 text-left">
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Description
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Qty
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Unit Price
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Total
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {sectionItems.map((item) => (
                            <tr key={item.id} className="border-b border-slate-100">
                              <td className="px-3 py-3 text-sm font-medium text-slate-900">
                                {item.description}
                              </td>
                              <td className="px-3 py-3 text-right text-sm text-slate-600">
                                {formatQuantity(item.quantity)}
                              </td>
                              <td className="px-3 py-3 text-right text-sm text-slate-600">
                                {formatCurrency(item.unit_price)}
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-semibold text-slate-900">
                                {formatCurrency(item.line_total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {(quote.description ||
            quote.customer_notes ||
            quote.internal_notes) && (
            <Card>
              <h2 className="text-lg font-bold text-slate-900">Notes</h2>

              <div className="mt-5 space-y-5">
                {quote.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Work description
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {quote.description}
                    </p>
                  </div>
                )}

                {quote.customer_notes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Customer notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {quote.customer_notes}
                    </p>
                  </div>
                )}

                {quote.internal_notes && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Internal notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-amber-900">
                      {quote.internal_notes}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-bold text-slate-900">Quote summary</h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Labour</span>
                <span>{formatCurrency(quote.labour_total)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Parts &amp; charges</span>
                <span>{formatCurrency(quote.parts_total)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3 text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>

              {Number(quote.discount_total) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>
                    Discount
                    {quote.discount_type === "percentage"
                      ? ` (${formatQuantity(quote.discount_value)}%)`
                      : ""}
                  </span>
                  <span>-{formatCurrency(quote.discount_total)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>{taxName} ({formatQuantity(quote.vat_rate)}%)</span>
                <span>{formatCurrency(quote.vat_total)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-4 text-xl font-bold text-[#103d2e]">
                <span>Total</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">Dates</h2>

            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Quote date</dt>
                <dd className="font-semibold text-slate-900">
                  {formatDate(quote.quote_date)}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Expiry date</dt>
                <dd className="font-semibold text-slate-900">
                  {formatDate(quote.expiry_date)}
                </dd>
              </div>

              {quote.sent_at && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Sent</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatDate(quote.sent_at)}
                  </dd>
                </div>
              )}

              {quote.accepted_at && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Accepted</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatDate(quote.accepted_at)}
                  </dd>
                </div>
              )}

              {quote.rejected_at && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Rejected</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatDate(quote.rejected_at)}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {quote.commercial_type === "parts" && !["converted", "accepted", "rejected", "expired"].includes(quote.status) && (
            <Card>
              <h2 className="text-lg font-bold text-slate-900">Parts reservation</h2>
              <p className="mt-2 text-sm text-slate-600">
                {partsReserved
                  ? "Stock is reserved against this quote and is unavailable to Counter Sale."
                  : "Reserve the stock at the active depot before accepting this Parts quote."}
              </p>
              <div className="mt-4">
                <PartsQuoteReservationActions
                  quoteId={quote.id}
                  reserved={partsReserved}
                />
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-bold text-slate-900">Actions</h2>

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Print Quote
              </button>

              <button
                type="button"
                onClick={() => void loadQuote()}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>

              {quote.status === "draft" && (
                <button
                  type="button"
                  onClick={() => void deleteQuote()}
                  disabled={deleting}
                  className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Draft"}
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}