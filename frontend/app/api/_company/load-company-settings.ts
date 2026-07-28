import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanySettings } from "./types";

const FALLBACK_SETTINGS: CompanySettings = {
  id: 1,
  company_name: "McAteer Agricultural Services Ltd",
  contact_line: "Agricultural Engineering & Field Service",
  address_line_1: null,
  address_line_2: null,
  town_city: null,
  county: null,
  postcode: null,
  phone: null,
  email: null,
  website: null,
  vat_number: null,
  company_registration: null,
  logo_path: null,
  primary_colour: "#103D2E",
  secondary_colour: "#E8EFEA",
  invoice_footer: null,
  payment_terms_days: 7,
  bank_name: null,
  account_name: null,
  sort_code: null,
  account_number: null,
  updated_at: new Date(0).toISOString(),
};

export async function loadCompanySettings(
  supabase: SupabaseClient
): Promise<CompanySettings> {
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Unable to load company settings:", error);
    return FALLBACK_SETTINGS;
  }

  return data ?? FALLBACK_SETTINGS;
}

export async function loadCompanyLogoBytes(
  supabase: SupabaseClient,
  logoPath: string | null
): Promise<Uint8Array | null> {
  if (!logoPath) return null;

  const { data, error } = await supabase.storage
    .from("company-branding")
    .download(logoPath);

  if (error || !data) {
    console.error("Unable to download company logo:", error);
    return null;
  }

  return new Uint8Array(await data.arrayBuffer());
}
