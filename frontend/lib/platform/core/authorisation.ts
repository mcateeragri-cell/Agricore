import type { AuthenticatedUserContext } from "@/lib/auth/require-permission";

export function canManageCompany(auth: AuthenticatedUserContext | null | undefined) {
  if (!auth) return false;
  return (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("settings.manage")
  );
}

export function isPlatformAdministrator(auth: AuthenticatedUserContext | null | undefined) {
  return Boolean(
    auth &&
      (auth.platformRole === "super_admin" || auth.platformRole === "platform_admin"),
  );
}

export function canUseFinancialInformation(auth: AuthenticatedUserContext | null | undefined) {
  if (!auth) return false;
  if (auth.platformRole === "super_admin" || auth.platformRole === "platform_admin") return true;
  return !["technician", "apprentice"].includes(auth.role);
}
