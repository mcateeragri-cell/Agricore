"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { loadActiveCompany } from "@/lib/company-context-client";
import Card from "../../../Components/ui/Card";
import { useRegionalFormatters } from "@/lib/client/use-regional-formatters";

type StockFormState = {
  part_number: string;
  description: string;
  category: string;
  manufacturer: string;
  supplier: string;
  unit_cost: string;
  unit_price: string;
  quantity_in_stock: string;
  minimum_stock: string;
  location: string;
  barcode: string;
  notes: string;
  active: boolean;
};

const emptyForm: StockFormState = {
  part_number: "",
  description: "",
  category: "",
  manufacturer: "",
  supplier: "",
  unit_cost: "0",
  unit_price: "0",
  quantity_in_stock: "0",
  minimum_stock: "0",
  location: "",
  barcode: "",
  notes: "",
  active: true,
};

function stringValue(value: unknown) {
  return value === null || value === undefined
    ? ""
    : String(value);
}

function textOrNull(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function parseNumber(value: string) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatCurrency(value: number | string | null) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value ?? 0));
}

export default function StockItemPage() {
  const params = useParams();
  const router = useRouter();

  const stockItemId = String(params.id);

  const [form, setForm] = useState<StockFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { money } = useRegionalFormatters();
  const formatCurrency = money;

  const loadStockItem = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    let activeCompany;

    try {
      activeCompany = await loadActiveCompany();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load the active company.",
      );
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("stock_items")
      .select("*")
      .eq("id", stockItemId)
      .eq("company_id", activeCompany.id)
      .maybeSingle();

    if (error) {
      console.error("Unable to load stock item:", error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setErrorMessage(
        "The stock item could not be found in the active company.",
      );
      setLoading(false);
      return;
    }

    setForm({
      part_number: stringValue(data.part_number),
      description: stringValue(data.description),
      category: stringValue(data.category),
      manufacturer: stringValue(data.manufacturer),
      supplier: stringValue(data.supplier),
      unit_cost: stringValue(data.unit_cost),
      unit_price: stringValue(data.unit_price),
      quantity_in_stock: stringValue(
        data.quantity_in_stock,
      ),
      minimum_stock: stringValue(data.minimum_stock),
      location: stringValue(data.location),
      barcode: stringValue(data.barcode),
      notes: stringValue(data.notes),
      active: Boolean(data.active),
    });

    setLoading(false);
  }, [stockItemId]);

  useEffect(() => {
    void loadStockItem();
  }, [loadStockItem]);

  function updateField(
    field: keyof StockFormState,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const description = form.description.trim();

    if (!description) {
      setErrorMessage("Description is required.");
      return;
    }

    const unitCost = parseNumber(form.unit_cost);
    const unitPrice = parseNumber(form.unit_price);
    const quantityInStock = parseNumber(
      form.quantity_in_stock,
    );
    const minimumStock = parseNumber(form.minimum_stock);

    if (
      unitCost < 0 ||
      unitPrice < 0 ||
      quantityInStock < 0 ||
      minimumStock < 0
    ) {
      setErrorMessage(
        "Prices and stock quantities cannot be negative.",
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    let activeCompany;

    try {
      activeCompany = await loadActiveCompany();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load the active company.",
      );
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("stock_items")
      .update({
        part_number: textOrNull(form.part_number),
        description,
        category: textOrNull(form.category),
        manufacturer: textOrNull(form.manufacturer),
        supplier: textOrNull(form.supplier),
        unit_cost: unitCost,
        unit_price: unitPrice,
        quantity_in_stock: quantityInStock,
        minimum_stock: minimumStock,
        location: textOrNull(form.location),
        barcode: textOrNull(form.barcode),
        notes: textOrNull(form.notes),
        active: form.active,
      })
      .eq("id", stockItemId)
      .eq("company_id", activeCompany.id);

    if (error) {
      console.error("Unable to update stock item:", error);
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Stock item saved.");
    setSaving(false);

    router.refresh();
  }

  async function handleArchive() {
    const confirmed = window.confirm(
      "Archive this stock item? It will disappear from the active stock list but remain in the database.",
    );

    if (!confirmed) {
      return;
    }

    setArchiving(true);
    setErrorMessage("");

    let activeCompany;

    try {
      activeCompany = await loadActiveCompany();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load the active company.",
      );
      setArchiving(false);
      return;
    }

    const { error } = await supabase
      .from("stock_items")
      .update({
        active: false,
      })
      .eq("id", stockItemId)
      .eq("company_id", activeCompany.id);

    if (error) {
      console.error("Unable to archive stock item:", error);
      setErrorMessage(error.message);
      setArchiving(false);
      return;
    }

    router.push("/stock");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="w-full px-5 py-10 text-center text-sm text-slate-500 lg:px-7">
        Loading stock item...
      </div>
    );
  }

  const currentQuantity = parseNumber(
    form.quantity_in_stock,
  );

  const minimumStock = parseNumber(form.minimum_stock);

  const isLowStock = currentQuantity <= minimumStock;

  const stockCostValue =
    currentQuantity * parseNumber(form.unit_cost);

  const stockRetailValue =
    currentQuantity * parseNumber(form.unit_price);

  return (
    <div className="w-full space-y-6 px-5 py-5 lg:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-green-700">
            Workshop Inventory
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            {form.description || "Stock Item"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {form.part_number || "No part number"}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/stock"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Stock
          </Link>

          <button
            type="button"
            onClick={() => void loadStockItem()}
            disabled={loading || saving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quantity
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {currentQuantity}
          </p>
        </Card>

        <Card>
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              isLowStock
                ? "text-amber-700"
                : "text-green-700"
            }`}
          >
            Stock Status
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              isLowStock
                ? "text-amber-800"
                : "text-[#103d2e]"
            }`}
          >
            {isLowStock ? "Low Stock" : "In Stock"}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cost Value
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(stockCostValue)}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Retail Value
          </p>

          <p className="mt-2 text-2xl font-bold text-[#103d2e]">
            {formatCurrency(stockRetailValue)}
          </p>
        </Card>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Item Details
            </h2>

            <p className="text-sm text-slate-500">
              Update the identifying information for this item.
            </p>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Part Number
              </span>

              <input
                type="text"
                value={form.part_number}
                onChange={(event) =>
                  updateField(
                    "part_number",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Description
              </span>

              <input
                type="text"
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value,
                  )
                }
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Category
              </span>

              <input
                type="text"
                value={form.category}
                onChange={(event) =>
                  updateField(
                    "category",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Manufacturer
              </span>

              <input
                type="text"
                value={form.manufacturer}
                onChange={(event) =>
                  updateField(
                    "manufacturer",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Supplier
              </span>

              <input
                type="text"
                value={form.supplier}
                onChange={(event) =>
                  updateField(
                    "supplier",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Barcode
              </span>

              <input
                type="text"
                value={form.barcode}
                onChange={(event) =>
                  updateField(
                    "barcode",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>
          </div>
        </Card>

        <Card>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Pricing and Stock
            </h2>

            <p className="text-sm text-slate-500">
              Update pricing, quantities and reorder levels.
            </p>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Unit Cost
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_cost}
                onChange={(event) =>
                  updateField(
                    "unit_cost",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Selling Price
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={(event) =>
                  updateField(
                    "unit_price",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Quantity in Stock
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.quantity_in_stock}
                onChange={(event) =>
                  updateField(
                    "quantity_in_stock",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Minimum Stock
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minimum_stock}
                onChange={(event) =>
                  updateField(
                    "minimum_stock",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>
          </div>

          <div className="mt-5">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Storage Location
              </span>

              <input
                type="text"
                value={form.location}
                onChange={(event) =>
                  updateField(
                    "location",
                    event.target.value,
                  )
                }
                placeholder="e.g. Van 1 / Shelf A2"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>
          </div>
        </Card>

        <Card>
          <div className="space-y-5">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Notes
              </span>

              <textarea
                rows={5}
                value={form.notes}
                onChange={(event) =>
                  updateField("notes", event.target.value)
                }
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  updateField("active", event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-600"
              />

              <span className="text-sm font-semibold text-slate-700">
                Active stock item
              </span>
            </label>
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => void handleArchive()}
            disabled={archiving || saving}
            className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            {archiving ? "Archiving..." : "Archive Item"}
          </button>

          <button
            type="submit"
            disabled={saving || archiving}
            className="rounded-xl bg-[#103d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3024] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Stock Item"}
          </button>
        </div>
      </form>
    </div>
  );
}