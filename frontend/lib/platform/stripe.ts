import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

type StripeRequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
};

export type StripeObject = Record<string, any>;

function secretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return value;
}

export function professionalStripePriceId() {
  const value = process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY?.trim();
  if (!value) throw new Error("STRIPE_PRICE_PROFESSIONAL_MONTHLY is not configured.");
  return value;
}

export function stripePriceIdForPlan(slug: string, databasePriceId?: string | null) {
  if (databasePriceId?.trim()) return databasePriceId.trim();
  if (slug === "professional") return professionalStripePriceId();
  const envKey = `STRIPE_PRICE_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_MONTHLY`;
  const value = process.env[envKey]?.trim();
  if (!value) throw new Error(`Stripe monthly price is not configured for ${slug}.`);
  return value;
}

function appendFormValue(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendFormValue(params, `${key}[${index}]`, item));
    return;
  }
  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
      appendFormValue(params, `${key}[${childKey}]`, childValue);
    });
    return;
  }
  params.append(key, String(value));
}

export async function stripeRequest<T extends StripeObject = StripeObject>(
  path: string,
  options: StripeRequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Authorization: `Bearer ${secretKey()}` };
  const params = new URLSearchParams();
  if (options.body) {
    Object.entries(options.body).forEach(([key, value]) => appendFormValue(params, key, value));
  }

  let requestPath = path;
  let body: string | undefined;
  if (params.size > 0) {
    if (method === "GET") {
      requestPath += `${path.includes("?") ? "&" : "?"}${params.toString()}`;
    } else {
      body = params.toString();
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  }

  const response = await fetch(`https://api.stripe.com/v1${requestPath}`, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const result = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message || "Stripe request failed.");
  return result;
}

export function verifyStripeWebhook(payload: string, signatureHeader: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");

  const values = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = values.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = values.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;

  const numericTimestamp = Number(timestamp);
  const ageSeconds = Math.abs(Date.now() / 1000 - numericTimestamp);
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    try {
      const actualBuffer = Buffer.from(signature, "hex");
      return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });
}

export function applicationUrl(requestUrl?: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (requestUrl) return new URL(requestUrl).origin;
  throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
}
