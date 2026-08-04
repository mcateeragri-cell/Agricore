"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigationUser } from "@/Components/navigation/use-navigation-user";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  last_service_hours: number | null;
  last_service_date: string | null;
  machines:
    | {
        id: string;
        customer_id: string;
        hours: number | null;
        estimated_hours_per_week: number | null;
      }
    | Array<{
        id: string;
        customer_id: string;
        hours: number | null;
        estimated_hours_per_week: number | null;
      }>
    | null;
  service_programmes:
    | {
        interval_hours: number | null;
        interval_months: number | null;
      }
    | Array<{
        interval_hours: number | null;
        interval_months: number | null;
      }>
    | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date;
}

export default function ServiceDueSummary() {
  const { userState, loading: companyLoading } = useNavigationUser();
  const companyId = userState.activeCompany?.id;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (companyLoading) return;
    if (!companyId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("machine_service_programmes")
      .select(`
        id,
        last_service_hours,
        last_service_date,
        machines (
          id,
          customer_id,
          hours,
          estimated_hours_per_week
        ),
        service_programmes (
          interval_hours,
          interval_months
        )
      `)
      .eq("company_id", companyId)
      .eq("active", true);

    if (!error) setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [companyId, companyLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);

    let overdue = 0;
    let dueToday = 0;
    let dueThisWeek = 0;
    let within50Hours = 0;

    for (const row of rows) {
      const machine = one(row.machines);
      const programme = one(row.service_programmes);
      if (!machine || !programme) continue;

      const currentHours = Number(machine.hours ?? 0);
      const intervalHours =
        programme.interval_hours === null
          ? null
          : Number(programme.interval_hours);

      const remaining =
        intervalHours === null
          ? null
          : Number(row.last_service_hours ?? currentHours) +
              intervalHours -
              currentHours;

      if (remaining !== null) {
        if (remaining < 0) overdue += 1;
        else if (remaining <= 50) within50Hours += 1;
      }

      let dueDate: Date | null = null;

      if (
        programme.interval_months &&
        row.last_service_date
      ) {
        dueDate = addMonths(
          row.last_service_date,
          Number(programme.interval_months),
        );
      }

      if (
        remaining !== null &&
        Number(machine.estimated_hours_per_week ?? 0) > 0
      ) {
        const predicted = new Date(now);
        predicted.setDate(
          predicted.getDate() +
            Math.ceil(
              (Math.max(0, remaining) /
                Number(machine.estimated_hours_per_week)) *
                7,
            ),
        );

        if (!dueDate || predicted < dueDate) dueDate = predicted;
      }

      if (!dueDate) continue;

      const dayDelta = Math.floor(
        (dueDate.getTime() - now.getTime()) / 86_400_000,
      );

      if (dayDelta < 0) overdue += 1;
      else if (dayDelta === 0) dueToday += 1;
      else if (dueDate <= endOfWeek) dueThisWeek += 1;
    }

    return { overdue, dueToday, dueThisWeek, within50Hours };
  }, [rows]);

  const cards = [
    ["Overdue", counts.overdue, "text-red-700 bg-red-50"],
    ["Due today", counts.dueToday, "text-orange-700 bg-orange-50"],
    ["Due this week", counts.dueThisWeek, "text-amber-700 bg-amber-50"],
    ["Within 50 hours", counts.within50Hours, "text-emerald-700 bg-emerald-50"],
  ] as const;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Preventative maintenance
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            Services due
          </h2>
        </div>

        <Link
          href="/service-programmes"
          className="text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Manage
        </Link>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Loading service status…</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value, classes]) => (
            <div key={label} className={`rounded-xl p-4 ${classes}`}>
              <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
