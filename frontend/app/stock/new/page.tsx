"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import Card from "../../../Components/ui/Card";

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
};

function textOrNull(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function parseNumber(value: string) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function NewStockItemPage() {
  const router = useRouter();

  const [form, setForm] = useState<StockFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(
    field: keyof StockFormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const description = form.description.trim();

    if (!description) {
      setErrorMessage("Description is required.");
      return;
    }

    const unitCost = parseNumber(form.unit_cost);
    const unitPrice = parseNumber(form.unit_price);
    const quantityInStock = parseNumber(form.quantity_in_stock);
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

    const { data, error } = await supabase
      .from("stock_items")
      .insert({
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
        active: true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Unable to create stock item:", error);
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(`/stock/${data.id}`);
    router.refresh();
  }

  return (
    <div className="w-full space-y-6 px-5 py-5 lg:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-green-700">
            Workshop Inventory
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            New Stock Item
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Add a part, consumable or workshop item.
          </p>
        </div>

        <Link
          href="/stock"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back to Stock
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Item Details
            </h2>

            <p className="text-sm text-slate-500">
              Enter the identifying information for this item.
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
                  updateField("part_number", event.target.value)
                }
                placeholder="e.g. 84283746"
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
                  updateField("description", event.target.value)
                }
                placeholder="e.g. Fuel Filter"
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
                  updateField("category", event.target.value)
                }
                placeholder="e.g. Filters"
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
                  updateField("manufacturer", event.target.value)
                }
                placeholder="e.g. New Holland"
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
                  updateField("supplier", event.target.value)
                }
                placeholder="e.g. CNH"
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
                  updateField("barcode", event.target.value)
                }
                placeholder="Optional"
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
              Set pricing, quantity and reorder levels.
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
                  updateField("unit_cost", event.target.value)
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
                  updateField("unit_price", event.target.value)
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
                  updateField("minimum_stock", event.target.value)
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
                  updateField("location", event.target.value)
                }
                placeholder="e.g. Van 1 / Shelf A2"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>
          </div>
        </Card>

        <Card>
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
              placeholder="Compatibility, supplier reference or other notes..."
              className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </label>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/stock"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#103d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3024] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Stock Item"}
          </button>
        </div>
      </form>
    </div>
  );
}