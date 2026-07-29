import type {
  AdministrationItem,
  NavigationItem,
} from "./navigation-types";

export const mainNavigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: "dashboard" },
  { name: "Customers", href: "/customers", icon: "customers" },
  { name: "Machines", href: "/machines", icon: "machines" },
  { name: "Jobs", href: "/jobs", icon: "jobs" },
  { name: "Dispatch", href: "/dispatch", icon: "calendar" },
  { name: "Calendar", href: "/calendar", icon: "calendar" },
  { name: "Quotes", href: "/quotes", icon: "quotes" },
  { name: "Invoices", href: "/invoices", icon: "invoices" },
  { name: "Stock", href: "/stock", icon: "stock" },
  { name: "Reports", href: "/reports", icon: "reports" },
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
    name: "Company Settings",
    href: "/administration/settings",
    icon: "settings",
    permissions: ["settings.manage"],
  },
];

export const mobilePrimaryItems: NavigationItem[] = [
  { name: "Home", href: "/", icon: "dashboard" },
  { name: "Jobs", href: "/jobs", icon: "jobs" },
  { name: "Invoices", href: "/invoices", icon: "invoices" },
  { name: "Customers", href: "/customers", icon: "customers" },
];
