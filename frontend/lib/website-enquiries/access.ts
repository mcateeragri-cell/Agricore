import type { AuthenticatedUserContext } from "@/lib/auth/require-permission";

export function canViewWebsiteEnquiries(auth: AuthenticatedUserContext) {
  if (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.role === "service_manager" ||
    auth.role === "office"
  ) {
    return true;
  }

  return (
    auth.permissions.includes("jobs.view_all") ||
    auth.permissions.includes("jobs.edit") ||
    auth.permissions.includes("jobs.assign")
  );
}

export function canManageWebsiteIntegrations(auth: AuthenticatedUserContext) {
  return (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("settings.manage")
  );
}
