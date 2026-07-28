import "server-only";
import { getRevolutApiBaseUrl, getRevolutSecretKey, REVOLUT_API_VERSION } from "@/lib/payments/config";
import type { CreateRevolutOrderInput, RevolutOrder } from "@/lib/payments/types";

type RevolutErrorBody = { message?: string; error?: string };
async function revolutRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${getRevolutApiBaseUrl()}${path}`, { ...init, cache: "no-store", headers: { Authorization: `Bearer ${getRevolutSecretKey()}`, "Content-Type": "application/json", "Revolut-Api-Version": REVOLUT_API_VERSION, ...init.headers } });
  if (!response.ok) {
    let detail = "";
    try { const body = await response.json() as RevolutErrorBody; detail = body.message || body.error || ""; } catch { detail = await response.text().catch(() => ""); }
    throw new Error(`Revolut API request failed (${response.status})${detail ? `: ${detail}` : "."}`);
  }
  return await response.json() as T;
}

export async function createRevolutOrder(input: CreateRevolutOrderInput): Promise<RevolutOrder> {
  return revolutRequest<RevolutOrder>("/orders", { method: "POST", body: JSON.stringify({ amount: input.amountMinor, currency: input.currency.toUpperCase(), merchant_order_ext_ref: input.merchantOrderReference, description: input.description, redirect_url: input.redirectUrl, customer: input.customerEmail ? { email: input.customerEmail } : undefined }) });
}
export async function retrieveRevolutOrder(orderId: string): Promise<RevolutOrder> {
  return revolutRequest<RevolutOrder>(`/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}
