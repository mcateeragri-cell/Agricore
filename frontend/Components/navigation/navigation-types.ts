export type UserRole =
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
  | "settings"
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

export type UserNavigationState = {
  fullName: string;
  email: string;
  role: UserRole | null;
  permissions: string[];
};

export const roleLabels: Record<UserRole, string> = {
  administrator: "Administrator",
  service_manager: "Service Manager",
  office: "Office",
  parts_manager: "Parts Manager",
  technician: "Technician",
  apprentice: "Apprentice",
  read_only: "Read Only",
};

export const initialUserState: UserNavigationState = {
  fullName: "",
  email: "",
  role: null,
  permissions: [],
};

export function isUserRole(value: unknown): value is UserRole {
  return (
    value === "administrator" ||
    value === "service_manager" ||
    value === "office" ||
    value === "parts_manager" ||
    value === "technician" ||
    value === "apprentice" ||
    value === "read_only"
  );
}