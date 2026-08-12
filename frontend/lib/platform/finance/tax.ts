import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TaxCalculation = { net: number; tax: number; gross: number; rate: number };
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateTax(amount: number, rate: number, pricesIncludeTax = false): TaxCalculation {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const safeRate = Number.isFinite(rate) ? Math.max(0, Math.min(100, rate)) : 0;
  if (pricesIncludeTax && safeRate > 0) {
    const gross = roundMoney(safeAmount);
    const net = roundMoney(gross / (1 + safeRate / 100));
    return { net, tax: roundMoney(gross - net), gross, rate: safeRate };
  }
  const net = roundMoney(safeAmount);
  const tax = roundMoney(net * safeRate / 100);
  return { net, tax, gross: roundMoney(net + tax), rate: safeRate };
}

export async function loadEffectiveTaxRate(admin: SupabaseClient, companyId: string, taxCodeId: string, onDate: string) {
  const { data, error } = await admin.from("finance_tax_code_rates").select("rate,effective_from,effective_to").eq("company_id", companyId).eq("tax_code_id", taxCodeId).lte("effective_from", onDate).or(`effective_to.is.null,effective_to.gte.${onDate}`).order("effective_from", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? Number(data.rate) : null;
}
