import "server-only";
import type { CreateRevolutOrderInput, RevolutOrder } from "@/lib/payments/types";

type RevolutErrorBody = { message?: string; error?: string };
export type RevolutClientConfig = {
  environment: "sandbox" | "production";
  secretKey: string;
  apiVersion: string;
};

function baseUrl(environment: RevolutClientConfig["environment"]) {
  return environment === "production"
    ? "https://merchant.revolut.com/api"
    : "https://sandbox-merchant.revolut.com/api";
}

async function revolutRequest<T>(config: RevolutClientConfig, path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl(config.environment)}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/json",
      "Revolut-Api-Version": config.apiVersion,
      ...init.headers,
    },
  });
  if (!response.ok) {
    let detail = "";
    try { const body = await response.json() as RevolutErrorBody; detail = body.message || body.error || ""; }
    catch { detail = await response.text().catch(() => ""); }
    throw new Error(`Revolut API request failed (${response.status})${detail ? `: ${detail}` : "."}`);
  }
  return await response.json() as T;
}

export function createRevolutOrder(
  config: RevolutClientConfig,
  input: CreateRevolutOrderInput,
): Promise<RevolutOrder> {
  return revolutRequest<RevolutOrder>(config, "/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountMinor,
      currency: input.currency.toUpperCase(),
      description: input.description,
      redirect_url: input.redirectUrl,
      customer: input.customerEmail
        ? { email: input.customerEmail }
        : undefined,
      merchant_order_data: {
        reference: input.merchantOrderReference,
      },
    }),
  });
}
export function retrieveRevolutOrder(config: RevolutClientConfig, orderId: string): Promise<RevolutOrder> {
  return revolutRequest<RevolutOrder>(config, `/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}
