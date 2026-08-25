import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanySettings } from "./types";

const FALLBACK_SETTINGS: CompanySettings = {
  id: 1,
  company_name: "AgriCore Company",
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
  sidebar_colour: "#0B4331",
  sidebar_colour_secondary: "#073023",
  sidebar_text_colour: "#F4FFF9",
  sidebar_accent_colour: "#6EE7B7",
  sidebar_style: "gradient",
  invoice_footer: null,
  payment_terms_days: 7,
  bank_name: null,
  account_name: null,
  sort_code: null,
  account_number: null,
  country_code: "GB",
  currency_code: "GBP",
  locale: "en-GB",
  timezone: "Europe/London",
  tax_name: "VAT",
  default_tax_rate: 20,
  default_hourly_rate: 65,
  date_format: "DD/MM/YYYY",
  time_format: "24",
  week_start: "monday",
  measurement_system: "metric",
  updated_at: new Date(0).toISOString(),
};

export async function loadCompanySettings(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanySettings> {
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", companyId)
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
