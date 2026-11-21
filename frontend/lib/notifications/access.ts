import type { AuthenticatedUserContext } from "@/lib/auth/require-permission";
import { canViewWebsiteEnquiries } from "@/lib/website-enquiries/access";
export function canSeeNotification(auth: AuthenticatedUserContext, category: string) {
  if (category === "website_enquiry") return canViewWebsiteEnquiries(auth);
  return auth.permissions.includes("machines.edit") || auth.permissions.includes("settings.manage");
}
export function allowedBranch(auth: AuthenticatedUserContext, branchId: string | null) {
  if (!branchId) return true;
  if (auth.activeBranchId) return auth.activeBranchId === branchId;
  if (auth.operationsScope === "company") return true;
  return auth.accessibleOperationalBranchIds.includes(branchId);
}
