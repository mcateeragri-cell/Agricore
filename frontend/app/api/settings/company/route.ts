import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { CompanySettingsUpdate } from "../../_company/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SETTINGS_PERMISSION = "settings.manage";

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function validHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value.toUpperCase()
    : fallback;
}

function hasSettingsAccess(permissions: string[]) {
  return permissions.includes(SETTINGS_PERMISSION);
}

async function getSettingsAuth() {
  const context = await getAuthenticatedUserContext();

  if (!context) {
    return {
      context: null,
      response: NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      ),
    };
  }

  if (!hasSettingsAccess(context.permissions)) {
    return {
      context: null,
      response: NextResponse.json(
        {
          error:
            "Your account is not authorised to manage company settings.",
        },
        { status: 403 },
      ),
    };
  }

  return { context, response: null };
}

export async function GET() {
  const auth = await getSettingsAuth();
  if (!auth.context) return auth.response;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", auth.context.companyId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load company settings:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error:
          "Company settings have not been created for the active company.",
      },
      { status: 404 },
    );
  }

  let logoUrl: string | null = null;

  if (data.logo_path) {
    const { data: signed, error: signedUrlError } =
      await supabase.storage
        .from("company-branding")
        .createSignedUrl(data.logo_path, 60 * 60);

    if (signedUrlError) {
      console.error(
        "Unable to create company logo URL:",
        signedUrlError,
      );
    }

    logoUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json(
    { settings: data, logoUrl },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PUT(request: NextRequest) {
  const auth = await getSettingsAuth();
  if (!auth.context) return auth.response;

  let body: Partial<CompanySettingsUpdate>;

  try {
    body =
      (await request.json()) as Partial<CompanySettingsUpdate>;
  } catch {
    return NextResponse.json(
      { error: "A valid JSON request body is required." },
      { status: 400 },
    );
  }

  const companyName = cleanText(body.company_name);
  const contactLine = cleanText(body.contact_line);

  if (!companyName) {
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 },
    );
  }

  const paymentTerms = Number(body.payment_terms_days);

  const update = {
    company_name: companyName,
    contact_line:
      contactLine ??
      "Agricultural Engineering & Field Service",
    address_line_1: cleanText(body.address_line_1),
    address_line_2: cleanText(body.address_line_2),
    town_city: cleanText(body.town_city),
    county: cleanText(body.county),
    postcode: cleanText(body.postcode),
    phone: cleanText(body.phone),
    email: cleanText(body.email),
    website: cleanText(body.website),
    vat_number: cleanText(body.vat_number),
    company_registration: cleanText(
      body.company_registration,
    ),
    primary_colour: validHex(
      body.primary_colour,
      "#103D2E",
    ),
    secondary_colour: validHex(
      body.secondary_colour,
      "#E8EFEA",
    ),
    invoice_footer: cleanText(body.invoice_footer),
    payment_terms_days:
      Number.isFinite(paymentTerms) &&
      paymentTerms >= 0
        ? Math.round(paymentTerms)
        : 7,
    bank_name: cleanText(body.bank_name),
    account_name: cleanText(body.account_name),
    sort_code: cleanText(body.sort_code),
    account_number: cleanText(body.account_number),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_settings")
    .update(update)
    .eq("company_id", auth.context.companyId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Unable to update company settings:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error:
          "Company settings have not been created for the active company.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ settings: data });
}