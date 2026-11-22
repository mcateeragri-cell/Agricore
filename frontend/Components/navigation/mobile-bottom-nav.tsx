"use client";

import Link from "next/link";

import { isLinkActive } from "./navigation-menu";
import SidebarIcon from "./sidebar-icon";
import {
  canViewFinancialInformation,
  isFieldRole,
} from "./navigation-types";
import type { UserNavigationState } from "./navigation-types";

type MobileBottomNavProps = {
  pathname: string;
  userState: UserNavigationState;
  onOpenMore: () => void;
};

export default function MobileBottomNav({
  pathname,
  userState,
  onOpenMore,
}: MobileBottomNavProps) {
  const features = userState.enabledFeatures;
  const role = userState.role;
  const canViewMoney = canViewFinancialInformation(userState);
  const fieldRole = isFieldRole(role);
  const has = (feature: string) => features.includes(feature);
  const shortcuts: Array<{ name: string; href: string; icon: "dashboard" | "jobs" | "customers" | "machines" | "calendar" | "invoices" | "stock" | "sales" | "communications" }> = [
    { name: "Home", href: "/dashboard", icon: "dashboard" },
  ];
  if (fieldRole) {
    shortcuts.push({ name: "My Jobs", href: "/technician", icon: "jobs" });
  } else if (role === "parts_manager" || role === "parts_advisor") {
    if (has("stock")) {
      shortcuts.push({ name: "Stock", href: "/stock", icon: "stock" });
      shortcuts.push({ name: "Counter", href: "/stock/counter-sale", icon: "invoices" });
      shortcuts.push({ name: "Orders", href: "/stock/purchase-orders", icon: "stock" });
    }
  } else if (role === "sales_manager" || role === "salesperson") {
    if (has("machinery_sales_crm")) shortcuts.push({ name: "Sales", href: "/sales", icon: "sales" });
    if (has("customers")) shortcuts.push({ name: "Customers", href: "/customers", icon: "customers" });
    if (canViewMoney && has("invoices")) shortcuts.push({ name: "Invoices", href: "/invoices", icon: "invoices" });
  } else if (role === "service_manager") {
    if (has("jobs")) shortcuts.push({ name: "Jobs", href: "/jobs", icon: "jobs" });
    if (has("dispatch")) shortcuts.push({ name: "Dispatch", href: "/dispatch", icon: "calendar" });
    if (has("calendar")) shortcuts.push({ name: "Calendar", href: "/calendar", icon: "calendar" });
  } else {
    if (has("jobs")) shortcuts.push({ name: "Jobs", href: "/jobs", icon: "jobs" });
    if (has("customers")) shortcuts.push({ name: "Customers", href: "/customers", icon: "customers" });
    if (canViewMoney && has("invoices")) shortcuts.push({ name: "Invoices", href: "/invoices", icon: "invoices" });
  }
  const visibleItems = shortcuts.slice(0, 4);
  return (
    <nav
      className="agricore-glass fixed inset-x-2 bottom-2 z-40 overflow-hidden rounded-2xl border pb-[env(safe-area-inset-bottom)] shadow-2xl lg:hidden"
      aria-label="Primary navigation"
    >
      <div
        className="grid h-16"
        style={{
          gridTemplateColumns: `repeat(${visibleItems.length + 1}, minmax(0, 1fr))`,
        }}
      >
        {visibleItems.map((item) => {
          const active = isLinkActive(pathname, item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition ${
                active
                  ? "text-[var(--brand)]"
                  : "text-[var(--text-muted)] active:bg-[var(--surface-strong)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[var(--brand)]" />
              )}
              <SidebarIcon name={item.icon} className="h-5 w-5" />
              <span className="max-w-full truncate">{item.name}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold text-[var(--text-muted)] transition active:bg-[var(--surface-strong)]"
        >
          <SidebarIcon name="more" className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
