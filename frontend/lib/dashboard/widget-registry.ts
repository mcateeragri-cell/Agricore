export type DashboardSize = "small" | "medium" | "large" | "full";

export type DashboardLayoutItem = {
  id: string;
  visible: boolean;
  size: DashboardSize;
};

export type DashboardWidgetDefinition = {
  id: string;
  label: string;
  description: string;
  defaultSize: DashboardSize;
  financial?: boolean;
  requiredFeatures?: string[];
};

export type DashboardPresetScope =
  | "company_default"
  | "company_admin"
  | "administrator"
  | "service_manager"
  | "office"
  | "parts_manager"
  | "read_only";

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  { id: "executive_summary", label: "Executive summary", description: "Key workload and financial KPI cards.", defaultSize: "full" },
  { id: "revenue_trend", label: "Revenue trend", description: "Revenue performance over time.", defaultSize: "large", financial: true, requiredFeatures: ["invoices"] },
  { id: "team_status", label: "Team status", description: "Engineer availability and current workload.", defaultSize: "medium" },
  { id: "recent_jobs", label: "Recent jobs", description: "Latest work activity and job status.", defaultSize: "large" },
  { id: "recent_activity", label: "Recent activity", description: "Latest company activity and changes.", defaultSize: "medium" },
  { id: "service_due", label: "Service due", description: "Upcoming preventative maintenance and services.", defaultSize: "full", requiredFeatures: ["service_programmes"] },
  { id: "schedule", label: "Schedule", description: "Upcoming planned work and appointments.", defaultSize: "large", requiredFeatures: ["calendar"] },
  { id: "quick_actions", label: "Quick actions", description: "Shortcuts for frequently used actions.", defaultSize: "medium" },
  { id: "atlas_intelligence", label: "AgriCore Intelligence", description: "Service forecasts, recurring patterns and business advice.", defaultSize: "medium", financial: true, requiredFeatures: ["atlas_intelligence"] },
  { id: "dealer_principal_kpis", label: "Dealer principal KPIs", description: "Depot count, workshop pressure, active engineers and outstanding balances.", defaultSize: "large", requiredFeatures: ["multi_branch"] },
  { id: "service_manager_kpis", label: "Service manager KPIs", description: "Open and urgent jobs, waiting-parts pressure and engineer activity.", defaultSize: "large", requiredFeatures: ["jobs"] },
  { id: "parts_manager_kpis", label: "Parts manager KPIs", description: "Low stock, available units, open purchase orders and depot transfers.", defaultSize: "large", requiredFeatures: ["stock"] },
  { id: "office_kpis", label: "Office KPIs", description: "Outstanding balances, draft invoices, quotes and open jobs.", defaultSize: "large", requiredFeatures: ["invoices"] },
];

export const DASHBOARD_WIDGET_IDS = new Set(DASHBOARD_WIDGETS.map((widget) => widget.id));
export const DASHBOARD_SIZES = new Set<DashboardSize>(["small", "medium", "large", "full"]);

const DEFAULT_ORDER = DASHBOARD_WIDGETS.map((widget) => widget.id);

const ROLE_VISIBLE_ORDER: Record<DashboardPresetScope, string[]> = {
  company_default: DEFAULT_ORDER,
  company_admin: ["dealer_principal_kpis", ...DEFAULT_ORDER],
  administrator: ["dealer_principal_kpis", ...DEFAULT_ORDER],
  service_manager: [
    "service_manager_kpis",
    "executive_summary",
    "team_status",
    "recent_jobs",
    "schedule",
    "service_due",
    "recent_activity",
    "quick_actions",
    "revenue_trend",
    "atlas_intelligence",
  ],
  office: [
    "office_kpis",
    "executive_summary",
    "recent_jobs",
    "schedule",
    "recent_activity",
    "quick_actions",
    "revenue_trend",
    "service_due",
    "team_status",
    "atlas_intelligence",
  ],
  parts_manager: [
    "parts_manager_kpis",
    "executive_summary",
    "recent_activity",
    "recent_jobs",
    "quick_actions",
    "schedule",
    "service_due",
    "team_status",
    "revenue_trend",
    "atlas_intelligence",
  ],
  read_only: [
    "executive_summary",
    "recent_jobs",
    "schedule",
    "service_due",
    "recent_activity",
    "team_status",
    "quick_actions",
    "revenue_trend",
    "atlas_intelligence",
  ],
};

const ROLE_HIDDEN: Partial<Record<DashboardPresetScope, string[]>> = {
  company_default: ["dealer_principal_kpis", "service_manager_kpis", "parts_manager_kpis", "office_kpis"],
  company_admin: ["service_manager_kpis", "parts_manager_kpis", "office_kpis"],
  administrator: ["service_manager_kpis", "parts_manager_kpis", "office_kpis"],
  service_manager: ["atlas_intelligence", "dealer_principal_kpis", "parts_manager_kpis", "office_kpis"],
  office: ["team_status", "atlas_intelligence", "dealer_principal_kpis", "service_manager_kpis", "parts_manager_kpis"],
  parts_manager: ["revenue_trend", "atlas_intelligence", "dealer_principal_kpis", "service_manager_kpis", "office_kpis"],
  read_only: ["quick_actions", "revenue_trend", "atlas_intelligence", "dealer_principal_kpis", "service_manager_kpis", "parts_manager_kpis", "office_kpis"],
};

export const DASHBOARD_PRESET_SCOPES: Array<{ key: DashboardPresetScope; label: string; description: string }> = [
  { key: "company_default", label: "Company default", description: "Fallback dashboard for office roles without a role-specific preset." },
  { key: "company_admin", label: "Company admin", description: "Company owner / top-level operational dashboard." },
  { key: "administrator", label: "Administrator", description: "Administration and company-wide operational dashboard." },
  { key: "service_manager", label: "Service manager", description: "Workshop load, technicians, jobs and service work." },
  { key: "office", label: "Office", description: "Scheduling, customer activity, jobs and commercial workflow." },
  { key: "parts_manager", label: "Parts manager", description: "Operational activity with a lighter management view." },
  { key: "read_only", label: "Read only", description: "A restrained dashboard without write-focused shortcuts." },
];

export function isDashboardPresetScope(value: unknown): value is DashboardPresetScope {
  return DASHBOARD_PRESET_SCOPES.some((scope) => scope.key === value);
}

export function normaliseDashboardLayout(value: unknown): DashboardLayoutItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: DashboardLayoutItem[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    if (!DASHBOARD_WIDGET_IDS.has(id) || seen.has(id)) continue;
    const size = typeof row.size === "string" && DASHBOARD_SIZES.has(row.size as DashboardSize)
      ? row.size as DashboardSize
      : DASHBOARD_WIDGETS.find((widget) => widget.id === id)?.defaultSize ?? "medium";
    seen.add(id);
    output.push({ id, visible: row.visible !== false, size });
  }

  return output;
}

export function mergeDashboardLayout(saved: DashboardLayoutItem[], fallback: DashboardLayoutItem[]) {
  const byId = new Map(saved.map((item) => [item.id, item]));
  const output = saved.filter((item) => DASHBOARD_WIDGET_IDS.has(item.id));
  for (const item of fallback) {
    if (!byId.has(item.id)) output.push(item);
  }
  return output;
}

export function systemDashboardLayout(scope: DashboardPresetScope): DashboardLayoutItem[] {
  const orderedIds = ROLE_VISIBLE_ORDER[scope] ?? DEFAULT_ORDER;
  const hidden = new Set(ROLE_HIDDEN[scope] ?? []);
  const used = new Set<string>();
  const output: DashboardLayoutItem[] = [];

  for (const id of [...orderedIds, ...DEFAULT_ORDER]) {
    if (used.has(id)) continue;
    const definition = DASHBOARD_WIDGETS.find((widget) => widget.id === id);
    if (!definition) continue;
    used.add(id);
    output.push({ id, visible: !hidden.has(id), size: definition.defaultSize });
  }

  return output;
}

export function dashboardScopeForCompanyRole(role: string | null | undefined): DashboardPresetScope {
  return isDashboardPresetScope(role) && role !== "company_default" ? role : "company_default";
}
