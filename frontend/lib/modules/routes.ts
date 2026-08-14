export type ModuleRouteRule = {
  featureKey: string;
  prefixes: string[];
};

export const MODULE_ROUTE_RULES: ModuleRouteRule[] = [
  { featureKey: "customers", prefixes: ["/customers"] },
  { featureKey: "machines", prefixes: ["/machines"] },
  { featureKey: "jobs", prefixes: ["/jobs", "/technician", "/office"] },
  { featureKey: "calendar", prefixes: ["/calendar"] },
  { featureKey: "dispatch", prefixes: ["/dispatch"] },
  { featureKey: "workshop_operations", prefixes: ["/workshop"] },
  { featureKey: "service_programmes", prefixes: ["/service-programmes", "/administration/manufacturers", "/administration/service-templates"] },
  { featureKey: "stock", prefixes: ["/stock"] },
  { featureKey: "quotes", prefixes: ["/quotes"] },
  { featureKey: "invoices", prefixes: ["/invoices"] },
  { featureKey: "machinery_sales_crm", prefixes: ["/sales"] },
  { featureKey: "reports", prefixes: ["/reports"] },
  { featureKey: "ai_diagnostics", prefixes: ["/ai-diagnostics"] },
  { featureKey: "atlas_intelligence", prefixes: ["/intelligence", "/administration/atlas"] },
  { featureKey: "financial_control", prefixes: ["/administration/finance"] },
  { featureKey: "multi_branch", prefixes: ["/settings/branches", "/enterprise"] },
  { featureKey: "communications", prefixes: ["/administration/communications"] },
];

export function moduleKeyForPath(pathname: string) {
  const path = pathname || "/";
  for (const rule of MODULE_ROUTE_RULES) {
    if (rule.prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return rule.featureKey;
    }
  }
  return null;
}
