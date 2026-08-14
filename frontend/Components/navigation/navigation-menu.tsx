"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  administrationItems,
  commercialNavigationItems,
  financeNavigationItems,
  insightsNavigationItems,
  operationsNavigationItems,
  primaryNavigationItems,
} from "./navigation-data";
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

type SectionKey = "operations" | "commercial" | "insights" | "finance" | "administration";

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

  const primaryItems = useMemo(() => {
    if (fieldRole) {
      const items: NavigationItem[] = [
        { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
        { name: "My Jobs", href: "/technician", icon: "jobs" },
      ];

      if (canViewServiceProgrammes) {
        items.push({ name: "Service Programmes", href: "/service-programmes", icon: "service" });
      }

      if (canUseAiDiagnostics) {
        items.push({ name: "AI Diagnostics", href: "/ai-diagnostics", icon: "diagnostics" });
      }

      return items;
    }

    return primaryNavigationItems.filter((item) => {
      const featureByHref: Record<string, string> = {
        "/jobs": "jobs",
        "/customers": "customers",
        "/machines": "machines",
        "/calendar": "calendar",
      };
      const feature = featureByHref[item.href];
      return !feature || userState.enabledFeatures.includes(feature);
    });
  }, [canUseAiDiagnostics, canViewServiceProgrammes, fieldRole, userState.enabledFeatures]);

  const operationsItems = useMemo(
    () =>
      operationsNavigationItems.filter((item) => {
        if (item.href === "/dispatch") return userState.enabledFeatures.includes("dispatch");
        if (item.href === "/service-programmes") return userState.enabledFeatures.includes("service_programmes") && canViewServiceProgrammes;
        if (item.href === "/ai-diagnostics") return canUseAiDiagnostics;
        if (item.href === "/stock") return userState.enabledFeatures.includes("stock") && canViewMoney;
        return true;
      }),
    [canUseAiDiagnostics, canViewMoney, canViewServiceProgrammes, userState.enabledFeatures],
  );

  const commercialItems = useMemo(
    () =>
      commercialNavigationItems.filter((item) => {
        if (!canViewMoney) return false;
        if (item.href === "/quotes") return userState.enabledFeatures.includes("quotes");
        if (item.href === "/invoices") return userState.enabledFeatures.includes("invoices");
        if (item.href === "/sales") return canUseMachinerySales;
        return true;
      }),
    [canUseMachinerySales, canViewMoney, userState.enabledFeatures],
  );

  const insightItems = useMemo(
    () =>
      insightsNavigationItems.filter((item) => {
        if (!canViewMoney) return false;
        if (item.href === "/intelligence") return canUseAtlas;
        if (item.href === "/reports") return userState.enabledFeatures.includes("reports");
        return true;
      }),
    [canUseAtlas, canViewMoney, userState.enabledFeatures],
  );

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
    operations: sectionIsActive(operationsItems),
    commercial: sectionIsActive(commercialItems),
    insights: sectionIsActive(insightItems),
    finance: pathname.startsWith("/administration/finance"),
    administration:
      (pathname.startsWith("/administration") && !pathname.startsWith("/administration/finance")) ||
      pathname.startsWith("/settings/"),
  });

  useEffect(() => {
    setOpenSections((current) => ({
      ...current,
      operations: current.operations || sectionIsActive(operationsItems),
      commercial: current.commercial || sectionIsActive(commercialItems),
      insights: current.insights || sectionIsActive(insightItems),
      finance: current.finance || pathname.startsWith("/administration/finance"),
      administration:
        current.administration ||
        ((pathname.startsWith("/administration") && !pathname.startsWith("/administration/finance")) ||
          pathname.startsWith("/settings/")),
    }));
  }, [pathname, operationsItems, commercialItems, insightItems]);

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
        <NavigationSection
          label="Operations"
          icon="service"
          items={operationsItems}
          pathname={pathname}
          open={openSections.operations}
          onToggle={() => toggleSection("operations")}
          onNavigate={onNavigate}
        />

        {commercialItems.length > 0 ? (
          <NavigationSection
            label="Commercial"
            icon="quotes"
            items={commercialItems}
            pathname={pathname}
            open={openSections.commercial}
            onToggle={() => toggleSection("commercial")}
            onNavigate={onNavigate}
          />
        ) : null}

        {insightItems.length > 0 ? (
          <NavigationSection
            label="Insights"
            icon="reports"
            items={insightItems}
            pathname={pathname}
            open={openSections.insights}
            onToggle={() => toggleSection("insights")}
            onNavigate={onNavigate}
          />
        ) : null}

        {!loading && canUseFinancialControl && canViewMoney ? (
          <NavigationSection
            label="Finance"
            icon="billing"
            items={financeNavigationItems}
            pathname={pathname}
            open={openSections.finance}
            onToggle={() => toggleSection("finance")}
            onNavigate={onNavigate}
            badge="Enterprise"
          />
        ) : null}
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
