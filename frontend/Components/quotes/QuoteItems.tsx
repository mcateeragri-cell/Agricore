"use client";

import { useRegionalFormatters } from "@/lib/client/use-regional-formatters";

export type QuoteItemType =
  | "labour"
  | "part"
  | "travel"
  | "callout"
  | "other";

export type QuoteLine = {
  id: string;
  item_type: QuoteItemType;
  stock_item_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
};

export type StockItemOption = {
  id: string;
  part_number?: string | null;
  description?: string | null;
  unit_cost?: number | string | null;
  unit_price?: number | string | null;
  quantity_in_stock?: number | string | null;
};

type QuoteItemsProps = {
  items: QuoteLine[];
  stockItems: StockItemOption[];
  onChange: (items: QuoteLine[]) => void;
};

const itemTypes: Array<{
  value: QuoteItemType;
  label: string;
}> = [
  {
    value: "labour",
    label: "Labour",
  },
  {
    value: "part",
    label: "Part",
  },
  {
    value: "travel",
    label: "Travel",
  },
  {
    value: "callout",
    label: "Callout",
  },
  {
    value: "other",
    label: "Other",
  },
];

export default function QuoteItems({
  items,
  stockItems,
  onChange,
}: QuoteItemsProps) {
  const { money, currencySymbol } = useRegionalFormatters();
  const formatCurrency = money;
  function addItem(itemType: QuoteItemType) {
    const newItem: QuoteLine = {
      id: createLocalId(),
      item_type: itemType,
      stock_item_id: null,
      description: getDefaultDescription(itemType),
      quantity: 1,
      unit_cost: 0,
      unit_price: 0,
    };

    onChange([...items, newItem]);
  }

  function updateItem(
    itemId: string,
    changes: Partial<QuoteLine>,
  ) {
    const updatedItems = items.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        ...changes,
      };
    });

    onChange(updatedItems);
  }

  function removeItem(itemId: string) {
    onChange(
      items.filter((item) => item.id !== itemId),
    );
  }

  function moveItem(
    currentIndex: number,
    direction: -1 | 1,
  ) {
    const targetIndex =
      currentIndex + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= items.length
    ) {
      return;
    }

    const updatedItems = [...items];

    const [movedItem] = updatedItems.splice(
      currentIndex,
      1,
    );

    updatedItems.splice(
      targetIndex,
      0,
      movedItem,
    );

    onChange(updatedItems);
  }

  function selectStockItem(
    quoteItemId: string,
    stockItemId: string,
  ) {
    if (!stockItemId) {
      updateItem(quoteItemId, {
        stock_item_id: null,
      });

      return;
    }

    const selectedStockItem =
      stockItems.find(
        (stockItem) =>
          stockItem.id === stockItemId,
      );

    if (!selectedStockItem) {
      return;
    }

    updateItem(quoteItemId, {
      item_type: "part",
      stock_item_id: selectedStockItem.id,
      description:
        buildStockDescription(
          selectedStockItem,
        ) || "Stock part",
      unit_cost: toNumber(
        selectedStockItem.unit_cost,
      ),
      unit_price: toNumber(
        selectedStockItem.unit_price,
      ),
    });
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <h3 className="text-sm font-bold text-slate-800">
            No quote items added
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Add labour, parts, travel, callout
            or another charge.
          </p>

          <button
            type="button"
            onClick={() => {
              addItem("labour");
            }}
            className="mt-4 rounded-xl bg-[#103d2e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c3024]"
          >
            Add first item
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <QuoteItemRow
              key={item.id}
              item={item}
              index={index}
              itemCount={items.length}
              stockItems={stockItems}
              onUpdate={(changes) => {
                updateItem(
                  item.id,
                  changes,
                );
              }}
              onStockItemChange={(
                stockItemId,
              ) => {
                selectStockItem(
                  item.id,
                  stockItemId,
                );
              }}
              onRemove={() => {
                removeItem(item.id);
              }}
              onMoveUp={() => {
                moveItem(index, -1);
              }}
              onMoveDown={() => {
                moveItem(index, 1);
              }}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            addItem("labour");
          }}
          className="rounded-xl bg-[#103d2e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c3024]"
        >
          Add labour
        </button>

        <button
          type="button"
          onClick={() => {
            addItem("part");
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Add part
        </button>

        <button
          type="button"
          onClick={() => {
            addItem("travel");
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Add travel
        </button>

        <button
          type="button"
          onClick={() => {
            addItem("callout");
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Add callout
        </button>

        <button
          type="button"
          onClick={() => {
            addItem("other");
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Add other
        </button>
      </div>
    </div>
  );
}

function QuoteItemRow({
  item,
  index,
  itemCount,
  stockItems,
  onUpdate,
  onStockItemChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: QuoteLine;
  index: number;
  itemCount: number;
  stockItems: StockItemOption[];
  onUpdate: (
    changes: Partial<QuoteLine>,
  ) => void;
  onStockItemChange: (
    stockItemId: string,
  ) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { money: formatCurrency, currencySymbol } =
    useRegionalFormatters();

  const lineTotal =
    toNumber(item.quantity) *
    toNumber(item.unit_price);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
            {index + 1}
          </span>

          <div>
            <p className="text-sm font-bold text-slate-900">
              Quote item
            </p>

            <p className="text-xs text-slate-500">
              {formatItemType(
                item.item_type,
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↑
          </button>

          <button
            type="button"
            onClick={onMoveDown}
            disabled={
              index === itemCount - 1
            }
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↓
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <label className="space-y-2 lg:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Type
          </span>

          <select
            value={item.item_type}
            onChange={(event) => {
              const nextType =
                event.target
                  .value as QuoteItemType;

              onUpdate({
                item_type: nextType,
                stock_item_id:
                  nextType === "part"
                    ? item.stock_item_id
                    : null,
              });
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            {itemTypes.map((itemType) => (
              <option
                key={itemType.value}
                value={itemType.value}
              >
                {itemType.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 lg:col-span-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stock item
          </span>

          <select
            value={
              item.stock_item_id ?? ""
            }
            onChange={(event) => {
              onStockItemChange(
                event.target.value,
              );
            }}
            disabled={
              item.item_type !== "part"
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {item.item_type === "part"
                ? "Manual part or select stock"
                : "Only available for parts"}
            </option>

            {stockItems.map(
              (stockItem) => (
                <option
                  key={stockItem.id}
                  value={stockItem.id}
                >
                  {formatStockOption(
                    stockItem,
                  )}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="space-y-2 lg:col-span-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Description
          </span>

          <input
            value={item.description}
            onChange={(event) => {
              onUpdate({
                description:
                  event.target.value,
              });
            }}
            placeholder="Describe the labour, part or charge"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quantity
          </span>

          <input
            type="number"
            min="0.01"
            step="0.01"
            value={item.quantity}
            onChange={(event) => {
              onUpdate({
                quantity: toNumber(
                  event.target.value,
                ),
              });
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>

        <label className="space-y-2 lg:col-span-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Unit cost
          </span>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
              {currencySymbol}
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={item.unit_cost}
              onChange={(event) => {
                onUpdate({
                  unit_cost: toNumber(
                    event.target.value,
                  ),
                });
              }}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </label>

        <label className="space-y-2 lg:col-span-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Unit price
          </span>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
              {currencySymbol}
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={item.unit_price}
              onChange={(event) => {
                onUpdate({
                  unit_price: toNumber(
                    event.target.value,
                  ),
                });
              }}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </label>

        <div className="space-y-2 lg:col-span-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Line total
          </span>

          <div className="flex min-h-[42px] items-center justify-end rounded-xl bg-slate-100 px-4 text-base font-bold text-slate-900">
            {formatCurrency(lineTotal)}
          </div>
        </div>
      </div>
    </article>
  );
}

function createLocalId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `quote-item-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function getDefaultDescription(
  itemType: QuoteItemType,
) {
  switch (itemType) {
    case "labour":
      return "Labour";

    case "travel":
      return "Travel";

    case "callout":
      return "Callout charge";

    default:
      return "";
  }
}

function buildStockDescription(
  stockItem: StockItemOption,
) {
  const partNumber =
    stockItem.part_number?.trim() ?? "";

  const description =
    stockItem.description?.trim() ?? "";

  if (partNumber && description) {
    return `${partNumber} — ${description}`;
  }

  return description || partNumber;
}

function formatStockOption(
  stockItem: StockItemOption,
) {
  const description =
    buildStockDescription(stockItem) ||
    "Unnamed stock item";

  const stockQuantity = toNumber(
    stockItem.quantity_in_stock,
  );

  return `${description} · Stock: ${stockQuantity}`;
}

function formatItemType(
  itemType: QuoteItemType,
) {
  return (
    itemTypes.find(
      (option) =>
        option.value === itemType,
    )?.label ?? "Other"
  );
}

function toNumber(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency: "GBP",
    },
  ).format(
    Number.isFinite(value) ? value : 0,
  );
}