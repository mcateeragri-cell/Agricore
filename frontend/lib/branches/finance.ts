import "server-only";
import type { AuthenticatedUserContext } from "@/lib/auth/require-permission";
export function requireFinanceBranchAccess(auth: AuthenticatedUserContext) { if(auth.financeScope === "none" || auth.accessibleFinanceBranchIds.length===0) throw new Error("You do not have financial access to a depot."); }
export function financeBranchIds(auth: AuthenticatedUserContext) { requireFinanceBranchAccess(auth); return auth.activeFinanceBranchId ? [auth.activeFinanceBranchId] : auth.accessibleFinanceBranchIds; }
export function financeWriteBranchId(auth: AuthenticatedUserContext) { requireFinanceBranchAccess(auth); if(auth.activeFinanceBranchId) return auth.activeFinanceBranchId; if(auth.accessibleFinanceBranchIds.length===1) return auth.accessibleFinanceBranchIds[0]; throw new Error("Select a specific finance depot before creating or posting a financial transaction."); }
