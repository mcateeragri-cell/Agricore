import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  encryptPaymentSecret,
  loadCompanyPaymentSettings,
  type PaymentProvider,
  type RevolutEnvironment,
} from "@/lib/payments/company-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function provider(value: unknown): PaymentProvider {
  return value === "bank_transfer" || value === "revolut" ? value : "none";
}

function environment(value: unknown): RevolutEnvironment {
  return value === "production" ? "production" : "sandbox";
}

export async function GET() {
  const context = await requirePermission(["settings.manage"]);
  const supabase = await createSupabaseServerClient();
  const settings = await loadCompanyPaymentSettings(supabase, context.companyId);
  return NextResponse.json({
    companyId: context.companyId,
    settings: settings
      ? {
          ...settings,
          revolut_secret_key_encrypted: undefined,
          revolut_webhook_secret_encrypted: undefined,
        }
      : null,
  });
}

export async function PUT(request: NextRequest) {
  const context = await requirePermission(["settings.manage"]);
  const body = (await request.json()) as Record<string, unknown>;
  const selectedProvider = provider(body.provider);

  const update: Record<string, unknown> = {
    company_id: context.companyId,
    provider: selectedProvider,
    bank_name: clean(body.bank_name),
    account_name: clean(body.account_name),
    sort_code: clean(body.sort_code),
    account_number: clean(body.account_number),
    iban: clean(body.iban),
    bic: clean(body.bic),
    payment_instructions: clean(body.payment_instructions),
    revolut_environment: environment(body.revolut_environment),
    revolut_api_version: clean(body.revolut_api_version) ?? "2026-04-20",
    revolut_public_key: clean(body.revolut_public_key),
    updated_at: new Date().toISOString(),
  };

  const revolutSecretKey = clean(body.revolut_secret_key);
  const revolutWebhookSecret = clean(body.revolut_webhook_secret);
  if (revolutSecretKey) update.revolut_secret_key_encrypted = encryptPaymentSecret(revolutSecretKey);
  if (revolutWebhookSecret) update.revolut_webhook_secret_encrypted = encryptPaymentSecret(revolutWebhookSecret);
  if (body.clear_revolut_secret_key === true) update.revolut_secret_key_encrypted = null;
  if (body.clear_revolut_webhook_secret === true) update.revolut_webhook_secret_encrypted = null;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("company_payment_settings")
    .upsert(update, { onConflict: "company_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings = await loadCompanyPaymentSettings(supabase, context.companyId);
  return NextResponse.json({
    companyId: context.companyId,
    settings: settings
      ? {
          ...settings,
          revolut_secret_key_encrypted: undefined,
          revolut_webhook_secret_encrypted: undefined,
        }
      : null,
  });
}
