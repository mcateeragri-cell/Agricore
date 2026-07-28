"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Card from "../../Components/ui/Card";

type StockItem = {
  id: string;
  part_number: string | null;
  description: string;
  category: string | null;
  manufacturer: string | null;
  supplier: string | null;
  unit_cost: number;
  unit_price: number;
  quantity_in_stock: number;
  minimum_stock_level: number;
  storage_location: string | null;
  barcode: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type StockStatus = "all" | "in_stock" | "low_stock" | "out_of_stock";

function formatCurrency(value: number | string | null) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(numericValue);
}

function formatQuantity(value: number | string | null) {
  const numericValue = Number(value ?? 0);

  return Number.isInteger(numericValue)
    ? numericValue.toString()
    : numericValue.toFixed(2);
}

function getStockStatus(item: StockItem) {
  const quantity = Number(item.quantity_in_stock ?? 0);
  const minimum = Number(item.minimum_stock_level ?? 0);

  if (quantity <= 0) {
    return {
      key: "out_of_stock" as const,
      label: "Out of Stock",
      badgeClass: "bg-red-100 text-red-800",
      barClass: "bg-red-500",
    };
  }

  if (quantity <= minimum) {
    return {
      key: "low_stock" as const,
      label: "Low Stock",
      badgeClass: "bg-amber-100 text-amber-800",
      barClass: "bg-amber-500",
    };
  }

  return {
    key: "in_stock" as const,
    label: "In Stock",
    badgeClass: "bg-green-100 text-green-800",
    barClass: "bg-green-600",
  };
}

function getStockBarWidth(item: StockItem) {
  const quantity = Number(item.quantity_in_stock ?? 0);
  const minimum = Number(item.minimum_stock_level ?? 0);
  const target = Math.max(minimum * 2, 1);

  return Math.max(0, Math.min(100, (quantity / target) * 100));
}

export default function StockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedManufacturer, setSelectedManufacturer] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<StockStatus>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadStock = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("stock_items")
      .select("*")
      .eq("active", true)
      .order("description", { ascending: true });

    if (error) {
      console.error("Unable to load stock:", error);
      setErrorMessage(error.message);
      setStockItems([]);
      setLoading(false);
      return;
    }

    setStockItems((data ?? []) as StockItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          stockItems
            .map((item) => item.category?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [stockItems],
  );

  const manufacturers = useMemo(
    () =>
      Array.from(
        new Set(
          stockItems
            .map((item) => item.manufacturer?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [stockItems],
  );

  const suppliers = useMemo(
    () =>
      Array.from(
        new Set(
          stockItems
            .map((item) => item.supplier?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [stockItems],
  );

  const filteredStockItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return stockItems.filter((item) => {
      const status = getStockStatus(item).key;

      const matchesSearch =
        !search ||
        [
          item.part_number,
          item.description,
          item.category,
          item.manufacturer,
          item.supplier,
          item.storage_location,
          item.barcode,
        ].some((value) => value?.toLowerCase().includes(search));

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      const matchesManufacturer =
        selectedManufacturer === "all" ||
        item.manufacturer === selectedManufacturer;

      const matchesSupplier =
        selectedSupplier === "all" || item.supplier === selectedSupplier;

      const matchesStatus =
        selectedStatus === "all" || status === selectedStatus;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesManufacturer &&
        matchesSupplier &&
        matchesStatus
      );
    });
  }, [
    searchTerm,
    selectedCategory,
    selectedManufacturer,
    selectedSupplier,
    selectedStatus,
    stockItems,
  ]);

  const totalStockItems = stockItems.length;
  const lowStockItems = stockItems.filter(
    (item) => getStockStatus(item).key === "low_stock",
  ).length;
  const outOfStockItems = stockItems.filter(
    (item) => getStockStatus(item).key === "out_of_stock",
  ).length;

  const totalStockCost = stockItems.reduce(
    (total, item) =>
      total + Number(item.quantity_in_stock) * Number(item.unit_cost),
    0,
  );

  const totalStockValue = stockItems.reduce(
    (total, item) =>
      total + Number(item.quantity_in_stock) * Number(item.unit_price),
    0,
  );

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedCategory !== "all" ||
    selectedManufacturer !== "all" ||
    selectedSupplier !== "all" ||
    selectedStatus !== "all";

  function clearFilters() {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedManufacturer("all");
    setSelectedSupplier("all");
    setSelectedStatus("all");
  }

  return (
    <div className="w-full space-y-6 px-5 py-5 lg:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-green-700">
            Workshop Inventory
          </p>

          <h1 className="text-3xl font-bold text-slate-900">Stock</h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage parts, pricing, stock levels and reorder requirements.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/stock/movements"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Stock Movements
          </Link>

          <Link
            href="/stock/new"
            className="inline-flex items-center justify-center rounded-xl bg-[#103d2e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3024]"
          >
            + New Stock Item
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active Items
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalStockItems}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Low Stock
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-800">
            {lowStockItems}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Out of Stock
          </p>
          <p className="mt-2 text-2xl font-bold text-red-800">
            {outOfStockItems}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stock Cost
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalStockCost)}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Retail Value
          </p>
          <p className="mt-2 text-2xl font-bold text-[#103d2e]">
            {formatCurrency(totalStockValue)}
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Stock Items</h2>
            <p className="text-sm text-slate-500">
              Search and filter your active workshop inventory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear Filters
              </button>
            )}

            <button
              type="button"
              onClick={() => void loadStock()}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search stock..."
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100 xl:col-span-2"
          />

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={selectedManufacturer}
            onChange={(event) => setSelectedManufacturer(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All manufacturers</option>
            {manufacturers.map((manufacturer) => (
              <option key={manufacturer} value={manufacturer}>
                {manufacturer}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value as StockStatus)
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All stock levels</option>
            <option value="in_stock">In stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
        </div>

        <div className="mt-3 max-w-sm">
          <select
            value={selectedSupplier}
            onChange={(event) => setSelectedSupplier(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
          <span>
            Showing {filteredStockItems.length} of {stockItems.length} items
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading stock...
          </div>
        ) : filteredStockItems.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-semibold text-slate-700">No stock items found</p>
            <p className="mt-1 text-sm text-slate-500">
              Add your first stock item or adjust the filters.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 md:hidden">
              {filteredStockItems.map((item) => {
                const status = getStockStatus(item);

                return (
                  <Link
                    key={item.id}
                    href={`/stock/${item.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-green-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {item.part_number || "No part number"}
                        </p>
                        <h3 className="mt-1 font-bold text-slate-900">
                          {item.description}
                        </h3>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.badgeClass}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Quantity</p>
                        <p className="font-semibold text-slate-900">
                          {formatQuantity(item.quantity_in_stock)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Minimum</p>
                        <p className="font-semibold text-slate-900">
                          {formatQuantity(item.minimum_stock_level)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Location</p>
                        <p className="font-semibold text-slate-900">
                          {item.storage_location || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Sell Price</p>
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 hidden overflow-x-auto md:block">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Part
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Manufacturer
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Supplier
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Location
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Stock Level
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cost
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sell Price
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStockItems.map((item) => {
                    const status = getStockStatus(item);
                    const stockBarWidth = getStockBarWidth(item);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-3 py-4">
                          <Link
                            href={`/stock/${item.id}`}
                            className="font-semibold text-[#103d2e] hover:underline"
                          >
                            {item.part_number || "—"}
                          </Link>
                          <Link
                            href={`/stock/${item.id}`}
                            className="mt-1 block font-medium text-slate-900 hover:underline"
                          >
                            {item.description}
                          </Link>
                          {item.category && (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.category}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-4 text-sm text-slate-600">
                          {item.manufacturer || "—"}
                        </td>

                        <td className="px-3 py-4 text-sm text-slate-600">
                          {item.supplier || "—"}
                        </td>

                        <td className="px-3 py-4 text-sm text-slate-600">
                          {item.storage_location || "—"}
                        </td>

                        <td className="min-w-40 px-3 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-semibold text-slate-900">
                              {formatQuantity(item.quantity_in_stock)}
                            </span>
                            <span className="text-xs text-slate-400">
                              / min {formatQuantity(item.minimum_stock_level)}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${status.barClass}`}
                              style={{ width: `${stockBarWidth}%` }}
                            />
                          </div>
                        </td>

                        <td className="px-3 py-4 text-right font-semibold text-slate-900">
                          {formatCurrency(item.unit_cost)}
                        </td>

                        <td className="px-3 py-4 text-right font-semibold text-slate-900">
                          {formatCurrency(item.unit_price)}
                        </td>

                        <td className="px-3 py-4 text-right">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.badgeClass}`}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}