"use client";

import Link from "next/link";

import { moduleKeyForPath } from "@/lib/modules/routes";
import { MODULE_BY_KEY } from "@/lib/modules/registry";

export default function ModuleAccessGate({
  pathname,
  enabledFeatures,
  loading,
  children,
}: {
  pathname: string;
  enabledFeatures: string[];
  loading: boolean;
  children: React.ReactNode;
}) {
  const featureKey = moduleKeyForPath(pathname);

  if (loading || !featureKey || enabledFeatures.includes(featureKey)) {
    return <>{children}</>;
  }

  const module = MODULE_BY_KEY.get(featureKey);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-20">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
          Module disabled
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          {module?.name || "This module"} is not active
        </h1>
        <p className="mt-4 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
          This company has chosen not to use this AgriCore module. Your subscription and existing
          role permissions are unchanged.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-xl bg-[#103D2E] px-5 py-3 text-sm font-black text-white">
            Back to dashboard
          </Link>
          <Link href="/settings/modules" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:text-slate-100">
            Manage modules
          </Link>
        </div>
      </div>
    </section>
  );
}
