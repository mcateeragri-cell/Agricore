import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyRole, PlatformRole } from "@/lib/auth/require-permission";

export const DEFAULT_MFA_REQUIRED_ROLES: CompanyRole[] = ["company_admin", "administrator"];
export const PLATFORM_MFA_REQUIRED_ROLES: PlatformRole[] = ["super_admin", "platform_admin", "support"];

export function isPlatformMfaRequired(role: PlatformRole | null) {
  return role ? PLATFORM_MFA_REQUIRED_ROLES.includes(role) : false;
}

export async function loadCompanyMfaRequiredRoles(supabase: SupabaseClient, companyId: string): Promise<CompanyRole[]> {
  const { data, error } = await supabase.from("company_mfa_policies").select("required_roles").eq("company_id", companyId).maybeSingle();
  if (error) {
    console.error("Unable to load company MFA policy:", error);
    return DEFAULT_MFA_REQUIRED_ROLES;
  }
  const values = Array.isArray(data?.required_roles) ? data.required_roles : DEFAULT_MFA_REQUIRED_ROLES;
  const allowed = new Set<CompanyRole>(["company_admin","administrator","service_manager","office","parts_manager","parts_advisor","sales_manager","salesperson","technician","apprentice","read_only"]);
  return values.filter((value): value is CompanyRole => allowed.has(value as CompanyRole));
}
