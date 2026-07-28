import { NextRequest, NextResponse } from "next/server";
import { getOfficeAuth } from "../../office/_shared";
import type { CompanySettingsUpdate } from "../../_company/types";

export const runtime = "nodejs";

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function validHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;

  return /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value
    : fallback;
}

export async function GET() {
  const auth = await getOfficeAuth();

  if (!auth.user || !auth.canReview) {
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401 }
    );
  }

  const { data, error } = await auth.supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  let logoUrl: string | null = null;

  if (data.logo_path) {
    const { data: signed, error: signedUrlError } =
      await auth.supabase.storage
        .from("company-branding")
        .createSignedUrl(data.logo_path, 60 * 60);

    if (signedUrlError) {
      console.error(
        "Unable to create company logo URL:",
        signedUrlError
      );
    }

    logoUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({
    settings: data,
    logoUrl,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await getOfficeAuth();

  if (!auth.user || !auth.canReview) {
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401 }
    );
  }

  const body =
    (await request.json()) as Partial<CompanySettingsUpdate>;

  const companyName = cleanText(body.company_name);
  const contactLine = cleanText(body.contact_line);

  if (!companyName) {
    return NextResponse.json(
      { error: "Company name is required" },
      { status: 400 }
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

    company_registration:
      cleanText(body.company_registration),

    primary_colour: validHex(
      body.primary_colour,
      "#103D2E"
    ),

    secondary_colour: validHex(
      body.secondary_colour,
      "#E8EFEA"
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
  };

  const { data, error } = await auth.supabase
    .from("company_settings")
    .update(update)
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    settings: data,
  });
}