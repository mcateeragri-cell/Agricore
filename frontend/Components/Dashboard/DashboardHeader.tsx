"use client";

import Link from "next/link";
import { CalendarDays, Plus, UserRound } from "lucide-react";

import { useNavigationUser } from "@/Components/navigation/use-navigation-user";
import { getDemoPresentationIdentity } from "@/lib/demo-presentation";

function formatToday() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AC";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "AC";
}

export default function DashboardHeader() {
  const { userState, loading } = useNavigationUser();
  const demoIdentity = getDemoPresentationIdentity(userState.activeCompany);
  const displayName = demoIdentity?.name ?? userState.fullName;

  return (
    <header className="border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">{formatToday()}</span>
          {userState.activeCompany?.name ? (
            <>
              <span className="hidden text-slate-300 sm:inline dark:text-slate-700">•</span>
              <span className="hidden truncate text-slate-700 sm:inline dark:text-slate-200">
                {userState.activeCompany.name}
              </span>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/customers"
            className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-black text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <UserRound className="h-4 w-4" />
            Customer
          </Link>

          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            New job
          </Link>

          <Link
            href="/account"
            title={loading ? "Account" : displayName}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white ring-2 ring-white transition hover:bg-emerald-800 dark:bg-emerald-700 dark:ring-slate-950"
          >
            {initials(displayName)}
          </Link>
        </div>
      </div>
    </header>
  );
}
