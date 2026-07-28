export type RevolutEnvironment = "sandbox" | "production";

export const REVOLUT_API_VERSION = process.env.REVOLUT_API_VERSION?.trim() || "2026-04-20";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getRevolutEnvironment(): RevolutEnvironment {
  return process.env.REVOLUT_ENVIRONMENT?.trim().toLowerCase() === "production" ? "production" : "sandbox";
}

export function getRevolutApiBaseUrl(): string {
  return getRevolutEnvironment() === "production"
    ? "https://merchant.revolut.com/api/1.0"
    : "https://sandbox-merchant.revolut.com/api/1.0";
}

export function getRevolutSecretKey(): string { return required("REVOLUT_SECRET_KEY"); }
export function getRevolutWebhookSecret(): string { return required("REVOLUT_WEBHOOK_SECRET"); }
export function getAppUrl(): string { return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000"; }
export function getSupabaseUrl(): string { return required("NEXT_PUBLIC_SUPABASE_URL"); }
export function getSupabaseServiceRoleKey(): string { return required("SUPABASE_SERVICE_ROLE_KEY"); }