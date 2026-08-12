import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function refreshFinanceValidation(admin: SupabaseClient, companyId: string) {
  const { data, error } = await admin.rpc("finance_validate_company", { p_company_id: companyId });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function loadFinanceValidation(admin: SupabaseClient, companyId: string) {
  const { data, error } = await admin
    .from("finance_validation_issues")
    .select("id,issue_key,severity,category,entity_type,entity_id,title,detail,status,last_seen_at,resolved_at")
    .eq("company_id", companyId)
    .eq("status", "open")
    .order("last_seen_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
