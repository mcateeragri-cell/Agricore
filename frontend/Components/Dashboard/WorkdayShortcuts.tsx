"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, ClipboardList, FileText, Package, Tractor, Users } from "lucide-react";
import type { UserNavigationState } from "@/Components/navigation/navigation-types";

type Shortcut = { label: string; href: string; feature: string; permissions: string[]; icon: typeof Users };

const shortcuts: Shortcut[] = [
  { label: "Customers", href: "/customers", feature: "customers", permissions: ["customers.view", "customers.manage"], icon: Users },
  { label: "Jobs", href: "/jobs", feature: "jobs", permissions: ["jobs.view", "jobs.manage"], icon: ClipboardList },
  { label: "Schedule", href: "/calendar", feature: "calendar", permissions: ["calendar.view", "calendar.manage"], icon: CalendarDays },
  { label: "Machines", href: "/machines", feature: "machines", permissions: ["machines.view", "machines.manage"], icon: Tractor },
  { label: "Quotes", href: "/quotes", feature: "quotes", permissions: ["quotes.view", "quotes.manage"], icon: FileText },
  { label: "Stock", href: "/stock", feature: "stock", permissions: ["stock.view", "stock.manage"], icon: Package },
];

export default function WorkdayShortcuts({ userState, loading }: { userState: UserNavigationState; loading: boolean }) {
  if (loading || !userState.activeCompany) return null;
  const elevated = Boolean(userState.platformRole) || userState.role === "company_admin" || userState.role === "administrator";
  const visible = shortcuts.filter((item) =>
    userState.enabledFeatures.includes(item.feature) &&
    (elevated || item.permissions.some((permission) => userState.permissions.includes(permission)))
  );
  if (!visible.length) return null;
  return (
    <nav aria-label="Workday shortcuts" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Your workspace</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">Quick access</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {visible.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className="group flex min-h-12 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30">
            <span className="flex min-w-0 items-center gap-2"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400"/><span className="truncate">{label}</span></span>
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100"/>
          </Link>
        ))}
      </div>
    </nav>
  );
}
