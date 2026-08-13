import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import {
  decryptPaymentSecret,
  loadCompanyPaymentSettings,
  type RevolutEnvironment,
} from "@/lib/payments/company-settings";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestRequest = {
  environment?: RevolutEnvironment;
  apiVersion?: string;
  secretKey?: string;
};

function baseUrl(environment: RevolutEnvironment) {
  return environment === "production"
    ? "https://merchant.revolut.com/api"
    : "https://sandbox-merchant.revolut.com/api";
}

export async function POST(request: NextRequest) {
  const context = await requirePermission(["settings.manage"]);
  const body = (await request.json().catch(() => ({}))) as TestRequest;
  const supabase = await createSupabaseServerClient();
  const saved = await loadCompanyPaymentSettings(supabase, context.companyId);

  const environment: RevolutEnvironment =
    body.environment === "production" ? "production" : "sandbox";
  const apiVersion = body.apiVersion?.trim() || saved?.revolut_api_version || "2026-04-20";

  let secretKey = body.secretKey?.trim() || "";
  if (!secretKey && saved?.revolut_secret_key_encrypted) {
    secretKey = decryptPaymentSecret(saved.revolut_secret_key_encrypted);
  }

  if (!secretKey) {
    return NextResponse.json(
      { success: false, error: "Enter a Revolut secret key or save one before testing." },
      { status: 400 },
    );
  }

  // Validate the credentials against Revolut's current Merchant API
  // without creating or mutating any payment data.
  const response = await fetch(
    `${baseUrl(environment)}/orders?limit=1`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Revolut-Api-Version": apiVersion,
      },
    },
  );

  if (response.status === 401 || response.status === 403) {
    return NextResponse.json(
      {
        success: false,
        error: "Revolut rejected the credentials. Check the environment and secret key.",
      },
      { status: 400 },
    );
  }

  if (response.ok) {
    return NextResponse.json({
      success: true,
      environment,
      apiVersion,
      message: `Connection successful (${environment}).`,
    });
  }

  let detail = "";
  try {
    const result = (await response.json()) as { message?: string; error?: string };
    detail = result.message || result.error || "";
  } catch {
    detail = await response.text().catch(() => "");
  }

  return NextResponse.json(
    {
      success: false,
      error: `Revolut connection test failed (${response.status})${detail ? `: ${detail}` : ". Check the Merchant API environment, API version and account permissions."}`,
    },
    { status: 400 },
  );
}
