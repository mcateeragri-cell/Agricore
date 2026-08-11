"use client";

import Link from "next/link";
import { useNavigationUser } from "@/Components/navigation/use-navigation-user";
import { getDemoPresentationIdentity } from "@/lib/demo-presentation";

function formatToday() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AC";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "AC";
}

export default function DashboardHeader() {
  const { userState, loading } = useNavigationUser();
  const demoIdentity = getDemoPresentationIdentity(userState.activeCompany);
  const displayName = demoIdentity?.name ?? userState.fullName;

  return (
    <header className="border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {formatToday()}
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl dark:text-white">
              Business dashboard
            </h1>
            {userState.activeCompany?.name ? (
              <span className="hidden truncate rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 sm:inline-flex dark:bg-emerald-950/50 dark:text-emerald-300">
                {userState.activeCompany.name}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/customers"
            className="hidden rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40"
          >
            + New customer
          </Link>

          <Link
            href="/jobs/new"
            className="inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            + New job
          </Link>

          <Link
            href="/account"
            title={loading ? "Account" : displayName}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white ring-2 ring-white transition hover:bg-emerald-800 dark:bg-emerald-700 dark:ring-slate-950"
          >
            {initials(displayName)}
          </Link>
        </div>
      </div>
    </header>
  );
}
