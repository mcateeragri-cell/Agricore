"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { administrationItems, financeNavigationItems } from "./navigation-data";
import SidebarIcon from "./sidebar-icon";
import type {
  AdministrationItem,
  NavigationItem,
  UserNavigationState,
} from "./navigation-types";
import {
  canViewFinancialInformation,
  isFieldRole,
} from "./navigation-types";

type NavigationMenuProps = {
  pathname: string;
  userState: UserNavigationState;
  loading: boolean;
  onNavigate?: () => void;
};

type SectionKey = "work" | "customers" | "sales" | "parts" | "reporting" | "finance" | "administration";

export default function NavigationMenu({
  pathname,
  userState,
  loading,
  onNavigate,
}: NavigationMenuProps) {
  const canViewMoney = canViewFinancialInformation(userState);
  const fieldRole = isFieldRole(userState.role);

  const hasFullAccess =
    userState.platformRole === "super_admin" ||
    userState.platformRole === "platform_admin" ||
    userState.role === "company_admin" ||
    userState.role === "administrator";

  const canViewServiceProgrammes =
    hasFullAccess ||
    userState.permissions.includes("service_programmes.view") ||
    userState.permissions.includes("service_programmes.manage");

  const canUseAiDiagnostics =
    userState.enabledFeatures.includes("ai_diagnostics") &&
    (hasFullAccess || userState.permissions.includes("ai_diagnostics.use"));

  const canUseMachinerySales =
    userState.enabledFeatures.includes("machinery_sales_crm") &&
    (hasFullAccess ||
      userState.permissions.includes("sales.view") ||
      userState.permissions.includes("sales.manage"));

  const canUseAtlas =
    userState.enabledFeatures.includes("atlas_intelligence") && !fieldRole;

  const canUseFinancialControl =
    userState.platformRole === "super_admin" ||
    userState.platformRole === "platform_admin" ||
    userState.enabledFeatures.includes("financial_control");

  const role = userState.role;
  const isAdmin = hasFullAccess;
  const isService = role === "service_manager";
  const isSales = role === "sales_manager" || role === "salesperson";
  const isParts = role === "parts_manager" || role === "parts_advisor";
  const isOffice = role === "office";
  const isReadOnly = role === "read_only";

  const primaryItems = useMemo<NavigationItem[]>(
    () => [{ name: "Dashboard", href: "/dashboard", icon: "dashboard" }],
    [],
  );

  const workItems = useMemo<NavigationItem[]>(() => {
    if (isSales || isParts) return [];
    const items: NavigationItem[] = [];
    if (userState.enabledFeatures.includes("jobs")) items.push({ name: "Jobs", href: "/jobs", icon: "jobs" });
    if (userState.enabledFeatures.includes("dispatch") && (isAdmin || isService || isOffice)) items.push({ name: "Dispatch", href: "/dispatch", icon: "calendar" });
    if (userState.enabledFeatures.includes("calendar")) items.push({ name: "Calendar", href: "/calendar", icon: "calendar" });
    if (userState.enabledFeatures.includes("service_programmes") && canViewServiceProgrammes) items.push({ name: "Service Programmes", href: "/service-programmes", icon: "service" });
    if (canUseAiDiagnostics) items.push({ name: "AI Diagnostics", href: "/ai-diagnostics", icon: "diagnostics" });
    if (isAdmin || isService || isOffice) items.push({ name: "Quotes", href: "/quotes?scope=service", icon: "quotes" }, { name: "Invoices", href: "/invoices?scope=service", icon: "invoices" });
    return items;
  }, [canUseAiDiagnostics, canViewServiceProgrammes, isAdmin, isOffice, isParts, isSales, isService, userState.enabledFeatures]);

  const customerItems = useMemo<NavigationItem[]>(() => {
    if (fieldRole) return [];
    return [
      { name: "Customers", href: "/customers", icon: "customers" },
      { name: "Machines", href: "/machines", icon: "machines" },
    ];
  }, [fieldRole]);

  const salesItems = useMemo<NavigationItem[]>(() => {
    if (!(isAdmin || isOffice || isSales) || !canUseMachinerySales) return [];
    const items: NavigationItem[] = [{ name: "Machinery Sales", href: "/sales", icon: "sales" }];
    if (isSales) items.push({ name: "Quotes", href: "/quotes?scope=machinery_sale", icon: "quotes" }, { name: "Invoices", href: "/invoices?scope=machinery_sale", icon: "invoices" });
    return items;
  }, [canUseMachinerySales, isAdmin, isOffice, isSales]);

  const partsItems = useMemo<NavigationItem[]>(() => {
    // Dealership principle:
    // Service management can see operational stock availability for workshop planning,
    // but Parts commercial, purchasing and stock-control actions remain with Parts/Office/Admin.
    if (!(isAdmin || isOffice || isParts || isService)) return [];

    const items: NavigationItem[] = [];
    if (userState.enabledFeatures.includes("stock")) {
      if (isService) {
        items.push({ name: "Stock", href: "/stock", icon: "stock" });
      } else {
        items.push(
          { name: "Counter Sale", href: "/stock/counter-sale", icon: "invoices" },
          { name: "Stock", href: "/stock", icon: "stock" },
          { name: "Suppliers", href: "/stock/suppliers", icon: "stock" },
          { name: "Purchase Orders", href: "/stock/purchase-orders", icon: "stock" },
        );
      }
    }

    if (isParts) {
      items.push(
        { name: "Quotes", href: "/quotes?scope=parts", icon: "quotes" },
        { name: "Invoices", href: "/invoices?scope=parts", icon: "invoices" },
      );
    }

    return items;
  }, [isAdmin, isOffice, isParts, isService, userState.enabledFeatures]);

  const reportingItems = useMemo<NavigationItem[]>(() => {
    if (fieldRole) return [];
    const items: NavigationItem[] = [];
    if (userState.enabledFeatures.includes("reports") && (isAdmin || isOffice || isService || isSales || isParts || isReadOnly)) items.push({ name: "Reports", href: "/reports", icon: "reports" });
    if (canUseAtlas && (isAdmin || isOffice)) items.push({ name: "Intelligence", href: "/intelligence", icon: "diagnostics" });
    if (isAdmin || isOffice || isReadOnly) items.unshift({ name: "Quotes", href: "/quotes", icon: "quotes" }, { name: "Invoices", href: "/invoices", icon: "invoices" });
    return items;
  }, [canUseAtlas, fieldRole, isAdmin, isOffice, isParts, isReadOnly, isSales, isService, userState.enabledFeatures]);

  const visibleAdministrationItems = useMemo(() => {
    const multiBranchEnabled = userState.enabledFeatures.includes("multi_branch");
    return administrationItems.filter((item) => {
      const branchFeatureItem = item.href === "/settings/branches" || item.href.startsWith("/enterprise/");
      if (branchFeatureItem && !multiBranchEnabled) return false;
      if (
        (item.href === "/administration/manufacturers" ||
          item.href === "/administration/service-templates") &&
        !userState.enabledFeatures.includes("service_programmes")
      ) return false;
      if (item.href === "/settings/dashboard" && !userState.enabledFeatures.includes("dashboard_builder")) return false;
      if (item.href === "/administration/communications" && !userState.enabledFeatures.includes("communications")) return false;
      if (item.href === "/administration/atlas" && !userState.enabledFeatures.includes("atlas_intelligence")) return false;
      if (hasFullAccess) return true;
      return item.permissions.some((permission) => userState.permissions.includes(permission));
    });
  }, [hasFullAccess, userState.enabledFeatures, userState.permissions]);

  const sectionIsActive = (items: NavigationItem[]) =>
    items.some((item) => isLinkActive(pathname, item.href));

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    work: sectionIsActive(workItems),
    customers: sectionIsActive(customerItems),
    sales: sectionIsActive(salesItems),
    parts: sectionIsActive(partsItems),
    reporting: sectionIsActive(reportingItems),
    finance: pathname.startsWith("/administration/finance"),
    administration: (pathname.startsWith("/administration") && !pathname.startsWith("/administration/finance")) || pathname.startsWith("/settings/"),
  });

  useEffect(() => {
    setOpenSections((current) => ({
      ...current,
      work: current.work || sectionIsActive(workItems),
      customers: current.customers || sectionIsActive(customerItems),
      sales: current.sales || sectionIsActive(salesItems),
      parts: current.parts || sectionIsActive(partsItems),
      reporting: current.reporting || sectionIsActive(reportingItems),
      finance: current.finance || pathname.startsWith("/administration/finance"),
      administration: current.administration || ((pathname.startsWith("/administration") && !pathname.startsWith("/administration/finance")) || pathname.startsWith("/settings/")),
    }));
  }, [pathname, workItems, customerItems, salesItems, partsItems, reportingItems]);

  function toggleSection(section: SectionKey) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  }

  if (fieldRole) {
    return (
      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-5">
        <div className="space-y-1">
          {primaryItems.map((item) => (
            <NavigationLink
              key={item.name}
              item={item}
              isActive={isLinkActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-5">
      <div className="space-y-1">
        {primaryItems.map((item) => (
          <NavigationLink
            key={item.name}
            item={item}
            isActive={isLinkActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
        {workItems.length > 0 ? <NavigationSection label="Work" icon="jobs" items={workItems} pathname={pathname} open={openSections.work} onToggle={() => toggleSection("work")} onNavigate={onNavigate} /> : null}
        {customerItems.length > 0 ? <NavigationSection label="Customers & Machinery" icon="machines" items={customerItems} pathname={pathname} open={openSections.customers} onToggle={() => toggleSection("customers")} onNavigate={onNavigate} /> : null}
        {salesItems.length > 0 ? <NavigationSection label="Machinery Sales" icon="sales" items={salesItems} pathname={pathname} open={openSections.sales} onToggle={() => toggleSection("sales")} onNavigate={onNavigate} badge="Enterprise" /> : null}
        {partsItems.length > 0 ? <NavigationSection label="Parts & Purchasing" icon="stock" items={partsItems} pathname={pathname} open={openSections.parts} onToggle={() => toggleSection("parts")} onNavigate={onNavigate} /> : null}
        {reportingItems.length > 0 ? <NavigationSection label="Commercial & Reporting" icon="reports" items={reportingItems} pathname={pathname} open={openSections.reporting} onToggle={() => toggleSection("reporting")} onNavigate={onNavigate} /> : null}
        {!loading && canUseFinancialControl && canViewMoney ? <NavigationSection label="Finance" icon="billing" items={financeNavigationItems} pathname={pathname} open={openSections.finance} onToggle={() => toggleSection("finance")} onNavigate={onNavigate} badge="Enterprise" /> : null}
      </div>

      {!loading &&
        (userState.platformRole === "super_admin" || userState.platformRole === "platform_admin") ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <NavigationLink
              item={{ name: "Platform", href: "/platform", icon: "platform" }}
              isActive={pathname.startsWith("/platform")}
              onNavigate={onNavigate}
            />
          </div>
        ) : null}

      {!loading && visibleAdministrationItems.length > 0 ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          <NavigationSection
            label="Administration"
            icon="administration"
            items={visibleAdministrationItems}
            pathname={pathname}
            open={openSections.administration}
            onToggle={() => toggleSection("administration")}
            onNavigate={onNavigate}
          />
        </div>
      ) : null}
    </nav>
  );
}

function NavigationSection({
  label,
  icon,
  items,
  pathname,
  open,
  onToggle,
  onNavigate,
  badge,
}: {
  label: string;
  icon: NavigationItem["icon"];
  items: Array<NavigationItem | AdministrationItem>;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  badge?: string;
}) {
  const active = items.some((item) => isLinkActive(pathname, item.href));

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex min-h-11 w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
          active ? "agricore-nav-item-active" : "agricore-nav-item"
        }`}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <SidebarIcon name={icon} className="h-5 w-5 shrink-0" />
          <span className="truncate">{label}</span>
          {badge ? (
            <span className="rounded-full border border-emerald-300/30 bg-emerald-300/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-100">
              {badge}
            </span>
          ) : null}
        </span>

        <SidebarIcon
          name="chevron"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="mt-1 space-y-1 pl-3">
          {items.map((item) => (
            <NavigationLink
              key={item.name}
              item={item}
              isActive={isLinkActive(pathname, item.href)}
              isChild
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavigationLink({
  item,
  isActive,
  isChild = false,
  onNavigate,
}: {
  item: NavigationItem | AdministrationItem;
  isActive: boolean;
  isChild?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex min-h-11 items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition ${
        isChild ? "px-3" : "px-4"
      } ${isActive ? "agricore-nav-item-active" : "agricore-nav-item"}`}
    >
      <SidebarIcon name={item.icon} className="h-5 w-5 shrink-0" />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export function isLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/administration/finance") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
