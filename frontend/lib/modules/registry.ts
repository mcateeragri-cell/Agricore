export type ModuleCategory = "core" | "operations" | "commercial" | "intelligence" | "enterprise" | "administration";

export type AgriCoreModule = {
  key: string;
  name: string;
  description: string;
  category: ModuleCategory;
  locked?: boolean;
  dependencies?: string[];
};

export const AGRICORE_MODULES: AgriCoreModule[] = [
  { key: "customers", name: "Customers", description: "Customer CRM and account history.", category: "core", locked: true },
  { key: "machines", name: "Machines", description: "Machine records, ownership and service history.", category: "core", locked: true, dependencies: ["customers"] },
  { key: "jobs", name: "Jobs & Workshop", description: "Workshop and field jobs, labour, parts, completion and technician workflows.", category: "core", locked: true, dependencies: ["customers", "machines"] },
  { key: "calendar", name: "Calendar", description: "Workshop and field scheduling.", category: "operations", dependencies: ["jobs"] },
  { key: "dispatch", name: "Dispatch", description: "Engineer dispatch and live operational planning.", category: "operations", dependencies: ["jobs"] },
  { key: "service_programmes", name: "Service Programmes", description: "Planned servicing and preventative maintenance.", category: "operations", dependencies: ["machines"] },
  { key: "stock", name: "Stock & Parts", description: "Parts catalogue, stock control, movements and depot inventory.", category: "operations" },
  { key: "quotes", name: "Quotes", description: "Customer quotations and quote-to-job workflow.", category: "commercial", dependencies: ["customers"] },
  { key: "invoices", name: "Invoices", description: "Invoices, PDFs, email delivery and payment workflow.", category: "commercial", dependencies: ["customers", "jobs"] },
  { key: "machinery_sales_crm", name: "Machinery Sales", description: "Wholegoods and machinery sales CRM.", category: "commercial", dependencies: ["customers", "machines"] },
  { key: "reports", name: "Reports", description: "Operational and commercial reporting.", category: "intelligence" },
  { key: "ai_diagnostics", name: "AI Diagnostics", description: "AI-assisted agricultural fault finding and diagnostic context.", category: "intelligence", dependencies: ["machines", "jobs"] },
  { key: "atlas_intelligence", name: "AgriCore Intelligence", description: "Management intelligence and Atlas insights.", category: "intelligence", dependencies: ["reports"] },
  { key: "financial_control", name: "Financial Control", description: "Enterprise ledger, reconciliation, reporting and accountant workspace.", category: "enterprise", dependencies: ["invoices"] },
  { key: "multi_branch", name: "Branches & Depots", description: "Enterprise multi-depot operations, branch scopes and consolidated management.", category: "enterprise" },
  { key: "communications", name: "Communications", description: "Transactional email settings, templates and delivery history.", category: "administration" },
  { key: "global_search", name: "Global Search", description: "Search customers, machines, jobs and commercial records from anywhere.", category: "administration" },
];

export const MODULE_BY_KEY = new Map(AGRICORE_MODULES.map((module) => [module.key, module]));

export function dependentModuleKeys(moduleKey: string, enabledKeys: Iterable<string>) {
  const enabled = new Set(enabledKeys);
  return AGRICORE_MODULES
    .filter((module) => enabled.has(module.key) && (module.dependencies ?? []).includes(moduleKey))
    .map((module) => module.key);
}
