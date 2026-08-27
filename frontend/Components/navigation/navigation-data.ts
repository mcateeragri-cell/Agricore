import type {
  AdministrationItem,
  NavigationItem,
} from "./navigation-types";

export const primaryNavigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Jobs", href: "/jobs", icon: "jobs" },
  { name: "Enquiries", href: "/enquiries", icon: "communications" },
  { name: "Customers", href: "/customers", icon: "customers" },
  { name: "Machines", href: "/machines", icon: "machines" },
  { name: "Calendar", href: "/calendar", icon: "calendar" },
];

export const operationsNavigationItems: NavigationItem[] = [
  { name: "Workshop", href: "/workshop", icon: "jobs" },
  { name: "Dispatch", href: "/dispatch", icon: "calendar" },
  { name: "Service Programmes", href: "/service-programmes", icon: "service" },
  { name: "AI Diagnostics", href: "/ai-diagnostics", icon: "diagnostics" },
  { name: "Stock", href: "/stock", icon: "stock" },
];

export const commercialNavigationItems: NavigationItem[] = [
  { name: "Quotes", href: "/quotes", icon: "quotes" },
  { name: "Invoices", href: "/invoices", icon: "invoices" },
  { name: "Sales", href: "/sales", icon: "sales" },
];

export const insightsNavigationItems: NavigationItem[] = [
  { name: "Intelligence", href: "/intelligence", icon: "diagnostics" },
  { name: "Reports", href: "/reports", icon: "reports" },
];

export const financeNavigationItems: NavigationItem[] = [
  { name: "Overview", href: "/administration/finance/dashboard", icon: "dashboard" },
  { name: "Purchase Ledger", href: "/administration/finance/purchases", icon: "billing" },
  { name: "Bank Reconciliation", href: "/administration/finance/bank", icon: "billing" },
  { name: "Financial Reports", href: "/administration/finance/reports", icon: "reports" },
  { name: "Accountant Workspace", href: "/administration/finance/accountant", icon: "reports" },
  { name: "Finance Setup", href: "/administration/finance", icon: "settings" },
];

export const administrationItems: AdministrationItem[] = [
  {
    name: "Users",
    href: "/administration/users",
    icon: "users",
    permissions: [
      "users.view",
      "users.manage_all",
      "users.manage_technicians",
    ],
  },
  {
    name: "Roles & Permissions",
    href: "/administration/roles",
    icon: "roles",
    permissions: ["roles.manage"],
  },
  {
    name: "Modules",
    href: "/settings/modules",
    icon: "settings",
    permissions: ["settings.manage"],
  },
  {
    name: "Dashboard Layouts",
    href: "/settings/dashboard",
    icon: "dashboard",
    permissions: ["settings.manage"],
  },
  {
    name: "Workshop Workflow",
    href: "/settings/workshop",
    icon: "settings",
    permissions: ["settings.manage", "jobs.assign", "jobs.edit"],
  },
  {
    name: "Manufacturers",
    href: "/administration/manufacturers",
    icon: "manufacturers",
    permissions: [
      "service_templates.view",
      "service_templates.manage",
    ],
  },
  {
    name: "Service Templates",
    href: "/administration/service-templates",
    icon: "templates",
    permissions: [
      "service_templates.view",
      "service_templates.manage",
      "service_templates.approve",
    ],
  },
  {
    name: "Branches & Depots",
    href: "/settings/branches",
    icon: "settings",
    permissions: ["settings.manage"],
  },
  {
    name: "Depot Overview",
    href: "/enterprise/depots",
    icon: "reports",
    permissions: ["settings.manage", "jobs.view_all", "finance.reports"],
  },
  {
    name: "Transfer Centre",
    href: "/enterprise/transfers",
    icon: "calendar",
    permissions: ["settings.manage", "jobs.assign"],
  },
  {
    name: "Website Integrations",
    href: "/settings/website-integrations",
    icon: "communications",
    permissions: ["settings.manage"],
  },
  {
    name: "AgriCore Network",
    href: "/network-provider",
    icon: "sales",
    permissions: ["settings.manage"],
  },
  {
    name: "Company Settings",
    href: "/settings/company",
    icon: "settings",
    permissions: ["settings.manage"],
  },
  {
    name: "Billing & Subscription",
    href: "/settings/billing",
    icon: "billing",
    permissions: ["settings.manage"],
  },
  {
    name: "Communications",
    href: "/administration/communications",
    icon: "communications",
    permissions: ["settings.manage"],
  },
  {
    name: "Data Management",
    href: "/administration/data-management",
    icon: "settings",
    permissions: ["settings.manage"],
  },
  {
    name: "Audit Log",
    href: "/administration/audit-log",
    icon: "settings",
    permissions: ["settings.manage"],
  },
  {
    name: "Atlas Health",
    href: "/administration/atlas",
    icon: "settings",
    permissions: ["settings.manage"],
  },
];

export const mobilePrimaryItems: NavigationItem[] = [
  { name: "Home", href: "/dashboard", icon: "dashboard" },
  { name: "Jobs", href: "/jobs", icon: "jobs" },
  { name: "Invoices", href: "/invoices", icon: "invoices" },
  { name: "Customers", href: "/customers", icon: "customers" },
];
