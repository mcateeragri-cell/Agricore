"use client";

export type QuoteDiscountType = "" | "percentage" | "fixed";

type QuoteTotalsProps = {
  subtotal: number;
  discountType: QuoteDiscountType;
  discountValue: number;
  vatRate: number;
  onDiscountTypeChange: (value: QuoteDiscountType) => void;
  onDiscountValueChange: (value: number) => void;
  onVatRateChange: (value: number) => void;
};

export default function QuoteTotals({
  subtotal,
  discountType,
  discountValue,
  vatRate,
  onDiscountTypeChange,
  onDiscountValueChange,
  onVatRateChange,
}: QuoteTotalsProps) {
  const safeSubtotal = toSafeNumber(subtotal);
  const safeDiscountValue = Math.max(0, toSafeNumber(discountValue));
  const safeVatRate = Math.max(0, toSafeNumber(vatRate));

  const discountAmount = calculateDiscount(
    safeSubtotal,
    discountType,
    safeDiscountValue,
  );

  const netTotal = Math.max(0, safeSubtotal - discountAmount);
  const vatAmount = netTotal * (safeVatRate / 100);
  const grandTotal = netTotal + vatAmount;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Discount type
          </span>

          <select
            value={discountType}
            onChange={(event) => {
              onDiscountTypeChange(
                event.target.value as QuoteDiscountType,
              );
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="">No discount</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Discount value
          </span>

          <div className="relative">
            {discountType ? (
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
                {discountType === "percentage" ? "%" : "£"}
              </span>
            ) : null}

            <input
              type="number"
              min="0"
              step="0.01"
              value={discountValue}
              onChange={(event) => {
                onDiscountValueChange(toSafeNumber(event.target.value));
              }}
              disabled={!discountType}
              className={`w-full rounded-xl border border-slate-200 py-3 pr-4 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
                discountType ? "pl-8" : "pl-4"
              }`}
            />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            VAT rate
          </span>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
              %
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={vatRate}
              onChange={(event) => {
                onVatRateChange(toSafeNumber(event.target.value));
              }}
              className="w-full rounded-xl border border-slate-200 py-3 pl-4 pr-8 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </label>
      </div>

      <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
          Quote summary
        </h3>

        <dl className="mt-5 space-y-3 text-sm">
          <SummaryRow
            label="Subtotal"
            value={formatCurrency(safeSubtotal)}
          />

          <SummaryRow
            label="Discount"
            value={`−${formatCurrency(discountAmount)}`}
          />

          <SummaryRow
            label="Net total"
            value={formatCurrency(netTotal)}
          />

          <SummaryRow
            label={`VAT (${formatPercentage(safeVatRate)})`}
            value={formatCurrency(vatAmount)}
          />
        </dl>

        <div className="mt-5 border-t border-slate-700 pt-5">
          <div className="flex items-end justify-between gap-4">
            <span className="text-sm font-semibold text-slate-300">
              Total
            </span>

            <span className="text-3xl font-bold tracking-tight">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-300">{label}</dt>
      <dd className="font-semibold text-white">{value}</dd>
    </div>
  );
}

function calculateDiscount(
  subtotal: number,
  discountType: QuoteDiscountType,
  discountValue: number,
) {
  if (discountType === "percentage") {
    const percentage = Math.min(100, discountValue);

    return subtotal * (percentage / 100);
  }

  if (discountType === "fixed") {
    return Math.min(subtotal, discountValue);
  }

  return 0;
}

function toSafeNumber(value: number | string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}