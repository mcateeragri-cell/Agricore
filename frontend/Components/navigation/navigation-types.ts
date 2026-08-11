export type PlatformRole =
  | "super_admin"
  | "platform_admin"
  | "support";

export type UserRole =
  | "company_admin"
  | "administrator"
  | "service_manager"
  | "office"
  | "parts_manager"
  | "technician"
  | "apprentice"
  | "read_only";

export type IconName =
  | "dashboard"
  | "customers"
  | "machines"
  | "jobs"
  | "calendar"
  | "quotes"
  | "invoices"
  | "stock"
  | "reports"
  | "administration"
  | "users"
  | "roles"
  | "manufacturers"
  | "templates"
  | "service"
  | "diagnostics"
  | "settings"
  | "billing"
  | "communications"
  | "platform"
  | "chevron"
  | "logout"
  | "menu"
  | "close"
  | "more";

export type NavigationItem = {
  name: string;
  href: string;
  icon: IconName;
};

export type AdministrationItem = NavigationItem & {
  permissions: string[];
};

export type CompanyOption = {
  id: string;
  name: string;
  slug: string;
};

export type UserNavigationState = {
  fullName: string;
  email: string;
  platformRole: PlatformRole | null;
  role: UserRole | null;
  permissions: string[];
  activeCompany: CompanyOption | null;
  companies: CompanyOption[];
};

export type CompanyContextResponse = {
  user?: {
    id: string;
    email: string;
    fullName: string;
    platformRole: PlatformRole | null;
    role: UserRole | null;
    permissions: string[];
  };
  activeCompany?: CompanyOption;
  companies?: CompanyOption[];
  error?: string;
};

export const roleLabels: Record<UserRole, string> = {
  company_admin: "Company Administrator",
  administrator: "Administrator",
  service_manager: "Service Manager",
  office: "Office",
  parts_manager: "Parts Manager",
  technician: "Technician",
  apprentice: "Apprentice",
  read_only: "Read Only",
};

export const platformRoleLabels: Record<
  PlatformRole,
  string
> = {
  super_admin: "AgriCore Super Administrator",
  platform_admin: "AgriCore Administrator",
  support: "AgriCore Support",
};

export const initialUserState: UserNavigationState = {
  fullName: "",
  email: "",
  platformRole: null,
  role: null,
  permissions: [],
  activeCompany: null,
  companies: [],
};

export function isPlatformRole(
  value: unknown,
): value is PlatformRole {
  return (
    value === "super_admin" ||
    value === "platform_admin" ||
    value === "support"
  );
}

export function isUserRole(value: unknown): value is UserRole {
  return (
    value === "company_admin" ||
    value === "administrator" ||
    value === "service_manager" ||
    value === "office" ||
    value === "parts_manager" ||
    value === "technician" ||
    value === "apprentice" ||
    value === "read_only"
  );
}
export function isFieldRole(
  role: UserRole | null,
) {
  return role === "technician" || role === "apprentice";
}

export function isFinanciallyRestrictedRole(
  role: UserRole | null,
) {
  return isFieldRole(role);
}

export function canViewFinancialInformation(
  userState: Pick<
    UserNavigationState,
    "platformRole" | "role" | "permissions"
  >,
) {
  if (
    userState.platformRole === "super_admin" ||
    userState.platformRole === "platform_admin" ||
    userState.role === "company_admin" ||
    userState.role === "administrator"
  ) {
    return true;
  }

  if (isFinanciallyRestrictedRole(userState.role)) {
    return false;
  }

  return (
    userState.permissions.includes("invoices.view") ||
    userState.permissions.includes("invoices.manage")
  );
}
