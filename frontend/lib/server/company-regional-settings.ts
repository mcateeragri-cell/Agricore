import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_REGIONAL_SETTINGS,
  normaliseRegionalSettings,
  type RegionalSettings,
} from "@/lib/regional-settings";

export async function loadCompanyRegionalSettings(
  supabase: SupabaseClient,
  companyId: string,
): Promise<RegionalSettings> {
  const { data, error } = await supabase
    .from("company_settings")
    .select(
      "country_code,currency_code,locale,timezone,tax_name,default_tax_rate,date_format,time_format,week_start,measurement_system",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load company regional settings:", error);
    return DEFAULT_REGIONAL_SETTINGS;
  }

  return normaliseRegionalSettings(data ?? DEFAULT_REGIONAL_SETTINGS);
}
