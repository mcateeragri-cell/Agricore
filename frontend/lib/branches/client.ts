"use client";

export type ClientBranchContext = {
  companyId: string;
  activeBranchId: string | null;
  activeFinanceBranchId: string | null;
  homeBranchId: string | null;
  operationsScope: "own_jobs" | "branch" | "selected" | "company";
  financeScope: "none" | "branch" | "selected" | "company";
  accessibleOperationalBranchIds: string[];
  accessibleFinanceBranchIds: string[];
};

export async function loadClientBranchContext(): Promise<ClientBranchContext> {
  const response = await fetch("/api/auth/company-context", { cache:"no-store", credentials:"same-origin" });
  const body = await response.json();
  if (!response.ok || !body?.activeCompany?.id) throw new Error(body?.error || "Unable to load company depot context.");
  return {
    companyId:String(body.activeCompany.id),
    activeBranchId:body.activeBranchId ?? null,
    activeFinanceBranchId:body.activeFinanceBranchId ?? null,
    homeBranchId:body.branchAccess?.homeBranchId ?? null,
    operationsScope:body.branchAccess?.operationsScope ?? "branch",
    financeScope:body.branchAccess?.financeScope ?? "none",
    accessibleOperationalBranchIds:Array.isArray(body.branchAccess?.accessibleOperationalBranchIds)?body.branchAccess.accessibleOperationalBranchIds:[],
    accessibleFinanceBranchIds:Array.isArray(body.branchAccess?.accessibleFinanceBranchIds)?body.branchAccess.accessibleFinanceBranchIds:[],
  };
}

export function operationalBranchIds(context: ClientBranchContext) {
  return context.activeBranchId ? [context.activeBranchId] : context.accessibleOperationalBranchIds;
}

export function financeBranchIds(context: ClientBranchContext) {
  return context.activeFinanceBranchId ? [context.activeFinanceBranchId] : context.accessibleFinanceBranchIds;
}
