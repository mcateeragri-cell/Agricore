"use client";

import { useCompanyRegionalSettings } from "@/lib/client/use-company-regional-settings";
import { formatCurrency } from "@/lib/regional-settings";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigationUser } from "@/Components/navigation/use-navigation-user";

type InvoiceRow = {
  status?: string | null;
  total?: number | string | null;
  amount_paid?: number | string | null;
  paid_at?: string | null;
  updated_at?: string | null;
};


function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export default function RevenueTrend() {
  const { userState, loading: companyLoading } = useNavigationUser();
  const { regionalSettings } = useCompanyRegionalSettings();
  const companyId = userState.activeCompany?.id ?? "";
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (companyLoading) return;
    if (!companyId) { setRows([]); setLoading(false); return; }

    setLoading(true);
    const from = new Date();
    from.setMonth(from.getMonth() - 5, 1);
    from.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("invoices")
      .select("status,total,amount_paid,paid_at,updated_at")
      .eq("company_id", companyId)
      .gte("updated_at", from.toISOString());

    if (error) {
      console.error("Unable to load revenue trend:", error);
      setRows([]);
    } else {
      setRows((data ?? []) as InvoiceRow[]);
    }
    setLoading(false);
  }, [companyId, companyLoading]);

  useEffect(() => { void load(); }, [load]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: new Intl.DateTimeFormat(regionalSettings.locale, { month: "short", timeZone: regionalSettings.timezone }).format(date),
        year: date.getFullYear(),
        month: date.getMonth(),
        value: 0,
      };
    });
  }, [regionalSettings.locale, regionalSettings.timezone]);

  const data = useMemo(() => {
    const result = months.map((month) => ({ ...month }));
    for (const row of rows) {
      const dateValue = row.paid_at || row.updated_at;
      if (!dateValue) continue;
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) continue;
      const item = result.find((month) => month.year === date.getFullYear() && month.month === date.getMonth());
      if (!item) continue;

      const status = normalise(row.status);
      const paid = Number(row.amount_paid ?? 0);
      const total = Number(row.total ?? 0);
      item.value += Number.isFinite(paid) && paid > 0 ? paid : ["paid", "settled", "completed"].includes(status) && Number.isFinite(total) ? total : 0;
    }
    return result;
  }, [months, rows]);

  const max = Math.max(1, ...data.map((item) => item.value));
  const current = data.at(-1)?.value ?? 0;
  const previous = data.at(-2)?.value ?? 0;
  const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Financial performance</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Revenue trend</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Paid invoice value across the last six months.</p>
        </div>
        <Link href="/reports" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
          Reports <ArrowUpRight size={15} />
        </Link>
      </div>

      {loading || companyLoading ? (
        <div className="mt-8 h-52 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
      ) : (
        <>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{formatCurrency(current, regionalSettings, { maximumFractionDigits: 0 })}</p>
              <p className={`mt-1 text-sm font-bold ${change >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                {change >= 0 ? "+" : ""}{change.toFixed(0)}% vs last month
              </p>
            </div>
          </div>

          <div className="mt-7 flex h-44 items-end gap-3 sm:gap-5">
            {data.map((item, index) => {
              const height = Math.max(item.value > 0 ? 8 : 2, (item.value / max) * 100);
              const currentMonth = index === data.length - 1;
              return (
                <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <div className="group relative flex h-36 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-14 rounded-t-xl transition-all ${currentMonth ? "bg-emerald-600" : "bg-emerald-200 dark:bg-emerald-900/70"}`}
                      style={{ height: `${height}%` }}
                      title={`${item.label}: ${formatCurrency(item.value, regionalSettings, { maximumFractionDigits: 0 })}`}
                    />
                  </div>
                  <span className={`text-xs font-bold ${currentMonth ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
