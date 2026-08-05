"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  administrationItems,
  mainNavigationItems,
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

export default function NavigationMenu({
  pathname,
  userState,
  loading,
  onNavigate,
}: NavigationMenuProps) {
  const isAdministrationRoute =
    pathname.startsWith("/administration") ||
    pathname.startsWith("/settings/");

  const [administrationOpen, setAdministrationOpen] =
    useState(isAdministrationRoute);

  const canViewMoney = canViewFinancialInformation(userState);
  const fieldRole = isFieldRole(userState.role);

  const visibleMainNavigationItems = useMemo(() => {
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
      hasFullAccess ||
      userState.permissions.includes("ai_diagnostics.use");

    if (fieldRole) {
      const items: NavigationItem[] = [
        { name: "Dashboard", href: "/", icon: "dashboard" },
        { name: "My Jobs", href: "/technician", icon: "jobs" },
      ];

      if (canViewServiceProgrammes) {
        items.push({
          name: "Service Programmes",
          href: "/service-programmes",
          icon: "service",
        });
      }

      if (canUseAiDiagnostics) {
        items.push({
          name: "AI Diagnostics",
          href: "/ai-diagnostics",
          icon: "diagnostics",
        });
      }

      return items;
    }

    return mainNavigationItems.filter((item) => {
      if (item.href === "/ai-diagnostics") {
        return canUseAiDiagnostics;
      }

      if (!canViewMoney && [
        "/quotes",
        "/invoices",
        "/stock",
        "/reports",
      ].includes(item.href)) {
        return false;
      }

      return true;
    });
  }, [
    canViewMoney,
    fieldRole,
    userState.permissions,
    userState.platformRole,
    userState.role,
  ]);

  useEffect(() => {
    if (isAdministrationRoute) {
      setAdministrationOpen(true);
    }
  }, [isAdministrationRoute]);

  const visibleAdministrationItems = useMemo(() => {
    const hasFullAdministrationAccess =
      userState.platformRole === "super_admin" ||
      userState.platformRole === "platform_admin" ||
      userState.role === "company_admin" ||
      userState.role === "administrator";

    if (hasFullAdministrationAccess) {
      return administrationItems;
    }

    return administrationItems.filter((item) =>
      item.permissions.some((permission) =>
        userState.permissions.includes(permission),
      ),
    );
  }, [
    userState.permissions,
    userState.platformRole,
    userState.role,
  ]);

  const canSeeAdministration =
    !fieldRole && visibleAdministrationItems.length > 0;

  return (
    <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-5">
      <div className="space-y-1">
        {visibleMainNavigationItems.map((item) => (
          <NavigationLink
            key={item.name}
            item={item}
            isActive={isLinkActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {!loading && canSeeAdministration && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={() => setAdministrationOpen((current) => !current)}
            className={`flex min-h-12 w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
              isAdministrationRoute
                ? "agricore-nav-item-active"
                : "agricore-nav-item"
            }`}
            aria-expanded={administrationOpen}
          >
            <span className="flex items-center gap-3">
              <SidebarIcon
                name="administration"
                className="h-5 w-5 shrink-0"
              />
              Administration
            </span>

            <SidebarIcon
              name="chevron"
              className={`h-4 w-4 shrink-0 transition-transform ${
                administrationOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {administrationOpen && (
            <div className="mt-1 space-y-1 pl-3">
              {visibleAdministrationItems.map((item) => (
                <NavigationLink
                  key={item.name}
                  item={item}
                  isActive={isLinkActive(pathname, item.href)}
                  isChild
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
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
      className={`flex min-h-12 items-center gap-3 rounded-xl py-3 text-sm font-semibold transition ${
        isChild ? "px-3" : "px-4"
      } ${
        isActive
          ? "agricore-nav-item-active"
          : "agricore-nav-item"
      }`}
    >
      <SidebarIcon
        name={item.icon}
        className="h-5 w-5 shrink-0"
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export function isLinkActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
