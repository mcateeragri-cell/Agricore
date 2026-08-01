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
  const [administrationOpen, setAdministrationOpen] =
    useState(pathname.startsWith("/administration"));

  useEffect(() => {
    if (pathname.startsWith("/administration")) {
      setAdministrationOpen(true);
    }
  }, [pathname]);

  const visibleAdministrationItems = useMemo(
    () =>
      administrationItems.filter((item) =>
        item.permissions.some((permission) =>
          userState.permissions.includes(permission),
        ),
      ),
    [userState.permissions],
  );

  const canSeeAdministration =
    visibleAdministrationItems.length > 0;

  return (
    <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-5">
      <div className="space-y-1">
        {mainNavigationItems.map((item) => (
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
              pathname.startsWith("/administration")
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
