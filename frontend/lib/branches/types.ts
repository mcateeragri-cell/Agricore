export type BranchOption = {
  id: string;
  code: string;
  name: string;
  isHeadOffice: boolean;
};

export type OperationsScope = "own_jobs" | "branch" | "selected" | "company";
export type FinanceScope = "none" | "branch" | "selected" | "company";

export type BranchAccessContext = {
  activeBranchId: string | null;
  activeFinanceBranchId: string | null;
  homeBranchId: string | null;
  operationsScope: OperationsScope;
  financeScope: FinanceScope;
  accessibleOperationalBranchIds: string[];
  accessibleFinanceBranchIds: string[];
  branches: BranchOption[];
};
