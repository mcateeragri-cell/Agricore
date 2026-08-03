"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Card from "@/Components/ui/Card";
import QuoteCustomer from "@/Components/quotes/QuoteCustomer";
import QuoteItems, {
  type QuoteLine,
  type StockItemOption,
} from "@/Components/quotes/QuoteItems";
import QuoteNotes from "@/Components/quotes/QuoteNotes";
import QuoteTotals, {
  type QuoteDiscountType,
} from "@/Components/quotes/QuoteTotals";

import { supabase } from "@/lib/supabase";
import { getActiveCompany } from "@/lib/client/active-company";

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
  customer_id?: string | null;
  make?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  registration?: string | null;
  registration_number?: string | null;
  serial_number?: string | null;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00`);

  result.setDate(result.getDate() + days);

  return result.toISOString().slice(0, 10);
}

export default function NewQuotePage() {
  const router = useRouter();

  const initialDate = getToday();

  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stockItems, setStockItems] = useState<StockItemOption[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [title, setTitle] = useState("");
  const [quoteDate, setQuoteDate] = useState(initialDate);
  const [expiryDate, setExpiryDate] = useState(
    addDays(initialDate, 30),
  );

  const [description, setDescription] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [items, setItems] = useState<QuoteLine[]>([]);

  const [discountType, setDiscountType] =
    useState<QuoteDiscountType>("");

  const [discountValue, setDiscountValue] = useState(0);
  const [vatRate, setVatRate] = useState(20);

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<
    "draft" | "sent" | null
  >(null);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPageData() {
      setLoading(true);
      setErrorMessage("");

      try {
        const activeCompany = await getActiveCompany();
        setActiveCompanyId(activeCompany.id);

        const [customersResult, machinesResult, stockResult] =
          await Promise.all([
          supabase
            .from("customers")
            .select("*")
            .eq("company_id", activeCompany.id)
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("machines")
            .select("*")
            .eq("company_id", activeCompany.id)
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("stock_items")
            .select(
              "id, part_number, description, unit_cost, unit_price, quantity_in_stock",
            )
            .eq("company_id", activeCompany.id)
            .eq("active", true)
            .order("description", {
              ascending: true,
            }),
        ]);

      const firstError =
        customersResult.error ??
        machinesResult.error ??
        stockResult.error;

      if (firstError) {
        console.error(
          "Unable to load quote form data:",
          firstError,
        );

        setErrorMessage(firstError.message);
      }

      setCustomers(
        (customersResult.data ?? []) as Customer[],
      );

      setMachines((machinesResult.data ?? []) as Machine[]);

        setStockItems(
          (stockResult.data ?? []) as StockItemOption[],
        );
      } catch (error) {
        console.error("Unable to load quote form data:", error);
        setCustomers([]);
        setMachines([]);
        setStockItems([]);
        setErrorMessage(error instanceof Error ? error.message : "Unable to load quote form data.");
      } finally {
        setLoading(false);
      }
    }

    void loadPageData();
  }, []);

  const customerMachines = useMemo(() => {
    if (!customerId) {
      return [];
    }

    return machines.filter(
      (machine) =>
        String(machine.customer_id ?? "") === customerId,
    );
  }, [customerId, machines]);

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      return (
        total +
        toNumber(item.quantity) * toNumber(item.unit_price)
      );
    }, 0);
  }, [items]);

  function handleCustomerChange(value: string) {
    setCustomerId(value);
    setMachineId("");
  }

  async function saveQuote(status: "draft" | "sent") {
    setErrorMessage("");

    if (!activeCompanyId) {
      setErrorMessage("No active company is selected. Refresh and try again.");
      return;
    }

    if (!customerId) {
      setErrorMessage("Please select a customer.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please enter a quote title.");
      return;
    }

    if (!quoteDate) {
      setErrorMessage("Please enter a quote date.");
      return;
    }

    if (items.length === 0) {
      setErrorMessage("Please add at least one quote item.");
      return;
    }

    if (items.some((item) => !item.description.trim())) {
      setErrorMessage(
        "Every quote item must have a description.",
      );

      return;
    }

    if (
      items.some(
        (item) =>
          toNumber(item.quantity) <= 0 ||
          toNumber(item.unit_price) < 0 ||
          toNumber(item.unit_cost) < 0,
      )
    ) {
      setErrorMessage(
        "Quote item quantities must be above zero and prices cannot be negative.",
      );

      return;
    }

    setSavingStatus(status);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      const quotePayload = {
        company_id: activeCompanyId,
        customer_id: customerId,
        machine_id: machineId || null,
        status,
        title: title.trim(),
        description: description.trim() || null,
        internal_notes: internalNotes.trim() || null,
        customer_notes: customerNotes.trim() || null,
        quote_date: quoteDate,
        expiry_date: expiryDate || null,
        discount_type: discountType || null,
        discount_value: toNumber(discountValue),
        vat_rate: toNumber(vatRate),
        sent_at:
          status === "sent" ? new Date().toISOString() : null,
        created_by: user?.id ?? null,
      };

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert(quotePayload)
        .select("id")
        .single();

      if (quoteError || !quote) {
        throw new Error(
          quoteError?.message ?? "Unable to create quote.",
        );
      }

      const itemPayload = items.map((item, index) => ({
        company_id: activeCompanyId,
        quote_id: quote.id,
        item_type: item.item_type,
        stock_item_id: item.stock_item_id || null,
        description: item.description.trim(),
        quantity: toNumber(item.quantity),
        unit_cost: toNumber(item.unit_cost),
        unit_price: toNumber(item.unit_price),
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from("quote_items")
        .insert(itemPayload);

      if (itemsError) {
        const { error: cleanupError } = await supabase
          .from("quotes")
          .delete()
          .eq("id", quote.id)
          .eq("company_id", activeCompanyId);

        if (cleanupError) {
          console.error(
            "Unable to remove incomplete quote:",
            cleanupError,
          );
        }

        throw new Error(itemsError.message);
      }

      router.push(`/quotes/${quote.id}`);
      router.refresh();
    } catch (error: unknown) {
      console.error("Unable to save quote:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save the quote.",
      );

      setSavingStatus(null);
    }
  }

  if (loading) {
    return (
      <div className="px-5 py-10 text-sm text-slate-500 lg:px-7">
        Loading quote form...
      </div>
    );
  }

  const saving = savingStatus !== null;

  return (
    <div className="w-full space-y-6 px-5 py-5 lg:px-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/quotes"
            className="text-sm font-semibold text-green-700 hover:underline"
          >
            ← Back to Quotes
          </Link>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            New Quote
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Prepare a professional quotation for a customer.
          </p>
        </div>
      </header>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      <Card>
        <h2 className="text-lg font-bold text-slate-900">
          Quote details
        </h2>

        <div className="mt-5 space-y-4">
          <QuoteCustomer
            customers={customers}
            machines={customerMachines}
            customerId={customerId}
            machineId={machineId}
            onCustomerChange={handleCustomerChange}
            onMachineChange={setMachineId}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Quote title
              </span>

              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                placeholder="Example: 1,500-hour tractor service"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Quote date
              </span>

              <input
                type="date"
                value={quoteDate}
                onChange={(event) => {
                  setQuoteDate(event.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Expiry date
              </span>

              <input
                type="date"
                value={expiryDate}
                min={quoteDate}
                onChange={(event) => {
                  setExpiryDate(event.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-slate-900">
          Quote items
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Add labour, stock parts, travel, callout charges or
          other items.
        </p>

        <div className="mt-5">
          <QuoteItems
            items={items}
            stockItems={stockItems}
            onChange={setItems}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-slate-900">
          Notes
        </h2>

        <div className="mt-5">
          <QuoteNotes
            description={description}
            customerNotes={customerNotes}
            internalNotes={internalNotes}
            onDescriptionChange={setDescription}
            onCustomerNotesChange={setCustomerNotes}
            onInternalNotesChange={setInternalNotes}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-slate-900">
          Totals
        </h2>

        <div className="mt-5">
          <QuoteTotals
            subtotal={subtotal}
            discountType={discountType}
            discountValue={discountValue}
            vatRate={vatRate}
            onDiscountTypeChange={setDiscountType}
            onDiscountValueChange={setDiscountValue}
            onVatRateChange={setVatRate}
          />
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/quotes"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>

        <button
          type="button"
          onClick={() => {
            void saveQuote("draft");
          }}
          disabled={saving}
          className="rounded-xl border border-[#103d2e] px-5 py-3 text-sm font-semibold text-[#103d2e] transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingStatus === "draft" ? "Saving..." : "Save Draft"}
        </button>

        <button
          type="button"
          onClick={() => {
            void saveQuote("sent");
          }}
          disabled={saving}
          className="rounded-xl bg-[#103d2e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3024] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingStatus === "sent" ? "Saving..." : "Save as Sent"}
        </button>
      </div>
    </div>
  );
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}