import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentProvider = "none" | "bank_transfer" | "revolut";
export type RevolutEnvironment = "sandbox" | "production";

export type CompanyPaymentSettings = {
  company_id: string;
  provider: PaymentProvider;
  bank_name: string | null;
  account_name: string | null;
  sort_code: string | null;
  account_number: string | null;
  iban: string | null;
  bic: string | null;
  payment_instructions: string | null;
  revolut_environment: RevolutEnvironment;
  revolut_api_version: string;
  revolut_public_key: string | null;
  revolut_secret_key_encrypted: string | null;
  revolut_webhook_secret_encrypted: string | null;
  revolut_secret_configured: boolean;
  revolut_webhook_secret_configured: boolean;
  updated_at: string;
};

function encryptionKey(): Buffer {
  const value = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY?.trim();
  if (!value) {
    throw new Error("PAYMENT_SETTINGS_ENCRYPTION_KEY is not configured.");
  }
  return crypto.createHash("sha256").update(value).digest();
}

export function encryptPaymentSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptPaymentSecret(value: string): string {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored payment credential is invalid.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function loadCompanyPaymentSettings(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanyPaymentSettings | null> {
  const { data, error } = await supabase
    .from("company_payment_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...(data as Omit<CompanyPaymentSettings, "revolut_secret_configured" | "revolut_webhook_secret_configured">),
    revolut_secret_configured: Boolean(data.revolut_secret_key_encrypted),
    revolut_webhook_secret_configured: Boolean(data.revolut_webhook_secret_encrypted),
  };
}

export async function loadCompanyRevolutCredentials(
  supabase: SupabaseClient,
  companyId: string,
) {
  const settings = await loadCompanyPaymentSettings(supabase, companyId);
  if (!settings || settings.provider !== "revolut") {
    throw new Error("Revolut Business is not enabled for this company.");
  }
  if (!settings.revolut_secret_key_encrypted) {
    throw new Error("This company has not configured its Revolut secret key.");
  }
  return {
    environment: settings.revolut_environment,
    apiVersion: settings.revolut_api_version || "2026-04-20",
    secretKey: decryptPaymentSecret(settings.revolut_secret_key_encrypted),
    webhookSecret: settings.revolut_webhook_secret_encrypted
      ? decryptPaymentSecret(settings.revolut_webhook_secret_encrypted)
      : null,
  };
}
