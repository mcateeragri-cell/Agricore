import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyRole } from "@/lib/auth/require-permission";
import type {
  BranchAccessContext,
  BranchOption,
  FinanceScope,
  OperationsScope,
} from "./types";

function operationsScopeForRole(role: CompanyRole | ""): OperationsScope {
  if (role === "company_admin" || role === "administrator") return "company";
  if (role === "technician" || role === "apprentice") return "own_jobs";
  return "branch";
}

function financeScopeForRole(role: CompanyRole | ""): FinanceScope {
  if (role === "company_admin" || role === "administrator") return "company";
  if (role === "technician" || role === "apprentice") return "none";
  return "branch";
}

export async function loadBranchAccessContext(
  client: SupabaseClient,
  companyId: string,
  userId: string,
  role: CompanyRole | "",
  requestedBranchId?: string | null,
  requestedFinanceBranchId?: string | null,
): Promise<BranchAccessContext> {
  const [branchResult, scopeResult, accessResult] = await Promise.all([
    client
      .from("company_branches")
      .select("id,code,name,is_head_office")
      .eq("company_id", companyId)
      .eq("active", true)
      .order("is_head_office", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    client
      .from("company_member_branch_scopes")
      .select("home_branch_id,operations_scope,finance_scope")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("company_member_branch_access")
      .select("branch_id")
      .eq("company_id", companyId)
      .eq("user_id", userId),
  ]);

  const firstError = branchResult.error || scopeResult.error || accessResult.error;
  if (firstError) throw new Error(firstError.message);

  const branches: BranchOption[] = (branchResult.data ?? []).map((branch) => ({
    id: String(branch.id),
    code: String(branch.code ?? ""),
    name: String(branch.name ?? "Depot"),
    isHeadOffice: Boolean(branch.is_head_office),
  }));

  const defaultBranchId = branches[0]?.id ?? null;
  const homeBranchId = scopeResult.data?.home_branch_id ?? defaultBranchId;
  const operationsScope = (scopeResult.data?.operations_scope ?? operationsScopeForRole(role)) as OperationsScope;
  const financeScope = (scopeResult.data?.finance_scope ?? financeScopeForRole(role)) as FinanceScope;
  const selectedIds = new Set<string>((accessResult.data ?? []).map((row) => String(row.branch_id)));
  if (homeBranchId) selectedIds.add(String(homeBranchId));

  const allIds = branches.map((branch) => branch.id);
  const branchScopedIds = homeBranchId ? [String(homeBranchId)] : defaultBranchId ? [defaultBranchId] : [];

  const accessibleOperationalBranchIds =
    operationsScope === "company"
      ? allIds
      : operationsScope === "selected"
        ? allIds.filter((id) => selectedIds.has(id))
        : branchScopedIds;

  const accessibleFinanceBranchIds =
    financeScope === "company"
      ? allIds
      : financeScope === "selected"
        ? allIds.filter((id) => selectedIds.has(id))
        : financeScope === "none"
          ? []
          : branchScopedIds;

  const requested = requestedBranchId?.trim() || "";
  const canUseAllOperations = operationsScope === "company" || operationsScope === "selected";
  const activeBranchId =
    requested === "all" && canUseAllOperations
      ? null
      : requested && accessibleOperationalBranchIds.includes(requested)
        ? requested
        : homeBranchId && accessibleOperationalBranchIds.includes(String(homeBranchId))
          ? String(homeBranchId)
          : accessibleOperationalBranchIds[0] ?? null;

  const requestedFinance = requestedFinanceBranchId?.trim() || "";
  const canUseAllFinance = financeScope === "company" || financeScope === "selected";
  const activeFinanceBranchId =
    requestedFinance === "all" && canUseAllFinance
      ? null
      : requestedFinance && accessibleFinanceBranchIds.includes(requestedFinance)
        ? requestedFinance
        : homeBranchId && accessibleFinanceBranchIds.includes(String(homeBranchId))
          ? String(homeBranchId)
          : accessibleFinanceBranchIds[0] ?? null;

  return {
    activeBranchId,
    activeFinanceBranchId,
    homeBranchId: homeBranchId ? String(homeBranchId) : null,
    operationsScope,
    financeScope,
    accessibleOperationalBranchIds,
    accessibleFinanceBranchIds,
    branches,
  };
}

export function canAccessBranch(
  context: BranchAccessContext,
  branchId: string | null | undefined,
  area: "operations" | "finance" = "operations",
) {
  if (!branchId) return false;
  const ids = area === "finance" ? context.accessibleFinanceBranchIds : context.accessibleOperationalBranchIds;
  return ids.includes(branchId);
}
