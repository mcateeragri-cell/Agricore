"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useNavigationUser } from "@/Components/navigation/use-navigation-user";

const TOUR = [
  ["Dashboard", "Your live workload, revenue, service due work and technician status.", "/dashboard"],
  ["Customers", "Keep contacts, sites, machines, jobs, quotes and invoices together.", "/customers"],
  ["Machines", "Build a complete service and repair history around every machine.", "/machines"],
  ["Jobs", "Schedule, assign and complete office or field work from one workflow.", "/jobs"],
  ["Invoices", "Turn completed work into professional invoices and payment links.", "/invoices"],
  ["Reports", "Use KPI drill-downs and exports to understand the business.", "/reports"],
] as const;

export default function GuidedTour() {
  const { userState } = useNavigationUser();
  const companyId = userState.activeCompany?.id ?? "";
  const storageKey = useMemo(() => companyId ? `agricore-tour-complete:${companyId}` : "", [companyId]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!companyId || !storageKey) return;
    const requested = new URLSearchParams(window.location.search).get("tour") === "1";
    const completed = window.localStorage.getItem(storageKey) === "1";
    if (requested || !completed) setOpen(true);
  }, [companyId, storageKey]);

  function finish() {
    if (storageKey) window.localStorage.setItem(storageKey, "1");
    setOpen(false);
  }

  if (!open) return null;

  const [title, body, href] = TOUR[index];
  const last = index === TOUR.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="AgriCore guided tour">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl dark:bg-slate-900">
        <div className="bg-emerald-950 px-6 py-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Quick tour</p><p className="mt-1 text-sm font-bold text-emerald-100">{index + 1} of {TOUR.length}</p></div>
            <button type="button" onClick={finish} className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/10">Skip</button>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${((index + 1) / TOUR.length) * 100}%` }} /></div>
        </div>
        <div className="p-6 sm:p-7">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">{body}</p>
          <Link href={href} className="mt-5 inline-flex text-sm font-black text-emerald-700 hover:text-emerald-800 dark:text-emerald-400">Open {title} →</Link>
          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="rounded-xl border border-slate-300 px-5 py-3 font-bold disabled:opacity-40 dark:border-slate-700">Back</button>
            {last ? <button type="button" onClick={finish} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white hover:bg-emerald-800">Finish tour</button> : <button type="button" onClick={() => setIndex((value) => Math.min(TOUR.length - 1, value + 1))} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white hover:bg-emerald-800">Next</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
