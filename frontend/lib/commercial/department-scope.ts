export type CommercialType = "service" | "machinery_sale" | "parts" | "general";

export type DepartmentRole =
  | "company_admin"
  | "administrator"
  | "service_manager"
  | "office"
  | "parts_manager"
  | "parts_advisor"
  | "sales_manager"
  | "salesperson"
  | "technician"
  | "apprentice"
  | "read_only"
  | "";

export function roleCommercialScope(role: DepartmentRole): CommercialType | "all" | "none" {
  if (role === "service_manager") return "service";
  if (role === "sales_manager" || role === "salesperson") return "machinery_sale";
  if (role === "parts_manager" || role === "parts_advisor") return "parts";
  if (role === "company_admin" || role === "administrator" || role === "office" || role === "read_only") return "all";
  return "none";
}

export function normaliseCommercialType(value: unknown): CommercialType {
  return value === "machinery_sale" || value === "parts" || value === "general" ? value : "service";
}
