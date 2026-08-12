import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinanceProfile } from "./types";

export async function loadFinanceProfile(
  supabase: SupabaseClient,
  companyId: string,
): Promise<FinanceProfile | null> {
  const { data, error } = await supabase
    .from("finance_profiles")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  return (data as FinanceProfile | null) ?? null;
}

export function normaliseFinanceProfileUpdate(input: Record<string, unknown>) {
  const month = Math.max(1, Math.min(12, Number(input.financial_year_start_month || 1)));
  const day = Math.max(1, Math.min(31, Number(input.financial_year_start_day || 1)));
  const accountingMethod = input.accounting_method === "cash" ? "cash" : "accrual";
  return {
    country_code: String(input.country_code || "GB").trim().toUpperCase().slice(0, 2),
    base_currency_code: String(input.base_currency_code || "GBP").trim().toUpperCase().slice(0, 3),
    tax_system: String(input.tax_system || "tax").trim().toLowerCase().slice(0, 64),
    tax_label: String(input.tax_label || "Tax").trim().slice(0, 32),
    accounting_method: accountingMethod,
    accounting_standard: String(input.accounting_standard || "local").trim().toLowerCase().slice(0, 64),
    financial_year_start_month: month,
    financial_year_start_day: day,
    chart_template: String(input.chart_template || "agricore_standard").trim().toLowerCase().slice(0, 64),
    government_connector: String(input.government_connector || "none").trim().toLowerCase().slice(0, 64),
    updated_at: new Date().toISOString(),
  } as const;
}
