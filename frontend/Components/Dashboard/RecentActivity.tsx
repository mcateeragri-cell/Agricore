"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigationUser } from "@/Components/navigation/use-navigation-user";

type ActivityItem = { id: string; at: string; title: string; detail: string; href: string; tone: string };
type Row = Record<string, unknown>;

function dateValue(row: Row) {
  for (const key of ["paid_at", "completed_at", "updated_at", "created_at"]) {
    const value = row[key];
    if (typeof value === "string" && value) return value;
  }
  return new Date(0).toISOString();
}

function ago(value: string) {
  const delta = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentActivity() {
  const { userState, loading: companyLoading } = useNavigationUser();
  const companyId = userState.activeCompany?.id ?? "";
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (companyLoading) return;
    if (!companyId) { setItems([]); setLoading(false); return; }
    setLoading(true);

    const [jobs, customers, machines, invoices] = await Promise.all([
      supabase.from("jobs").select("id,job_number,status,engineer_name,updated_at,created_at").eq("company_id", companyId).order("updated_at", { ascending: false }).limit(5),
      supabase.from("customers").select("id,business_name,contact_name,created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(3),
      supabase.from("machines").select("id,make,model,created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(3),
      supabase.from("invoices").select("id,invoice_number,status,total,paid_at,updated_at,created_at").eq("company_id", companyId).order("updated_at", { ascending: false }).limit(4),
    ]);

    const next: ActivityItem[] = [];

    for (const row of (jobs.data ?? []) as Row[]) {
      const status = String(row.status ?? "").replaceAll("_", " ");
      next.push({
        id: `job-${row.id}`,
        at: dateValue(row),
        title: `Job ${String(row.job_number ?? "updated")}`,
        detail: `${status || "updated"}${row.engineer_name ? ` · ${String(row.engineer_name)}` : ""}`,
        href: `/jobs/${String(row.id)}`,
        tone: "bg-sky-500",
      });
    }

    for (const row of (customers.data ?? []) as Row[]) {
      next.push({ id: `customer-${row.id}`, at: dateValue(row), title: "Customer added", detail: String(row.business_name || row.contact_name || "New customer"), href: `/customers/${String(row.id)}`, tone: "bg-violet-500" });
    }

    for (const row of (machines.data ?? []) as Row[]) {
      next.push({ id: `machine-${row.id}`, at: dateValue(row), title: "Machine added", detail: [row.make, row.model].filter(Boolean).join(" ") || "New machine", href: "/machines", tone: "bg-amber-500" });
    }

    for (const row of (invoices.data ?? []) as Row[]) {
      const paid = String(row.status ?? "").toLowerCase() === "paid" || Boolean(row.paid_at);
      next.push({ id: `invoice-${row.id}`, at: dateValue(row), title: paid ? "Invoice paid" : "Invoice updated", detail: String(row.invoice_number ?? "Invoice"), href: `/invoices/${String(row.id)}`, tone: paid ? "bg-emerald-500" : "bg-slate-500" });
    }

    setItems(next.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8));
    setLoading(false);
  }, [companyId, companyLoading]);

  useEffect(() => { void load(); }, [load]);

  const display = useMemo(() => items, [items]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><Activity size={17} /><p className="text-xs font-black uppercase tracking-[0.14em]">Live activity</p></div>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">What is happening</h2>
        </div>
        <Link href="/jobs" className="text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-400">All jobs</Link>
      </header>

      {loading || companyLoading ? (
        <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />)}</div>
      ) : display.length === 0 ? (
        <div className="p-6 text-sm font-medium text-slate-500 dark:text-slate-400">Activity will appear here as your team uses AgriCore.</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-900">
          {display.map((item) => (
            <Link key={item.id} href={item.href} className="flex gap-3 px-5 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-900/60">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-950 dark:text-white">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs font-medium capitalize text-slate-500 dark:text-slate-400">{item.detail}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-slate-400">{ago(item.at)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
