export function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toMinorUnits(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment amount must be greater than zero.");
  return Math.round(amount * 100);
}

export function buildInvoiceReference(invoiceNumber: string, invoiceId: string): string {
  const cleanNumber = invoiceNumber.trim().replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `invoice-${cleanNumber || invoiceId}-${invoiceId}`;
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
