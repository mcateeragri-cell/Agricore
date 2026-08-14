"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  ClipboardCheck,
  FileClock,
  PackageSearch,
  Wrench,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useNavigationUser } from "@/Components/navigation/use-navigation-user";
import { useCompanyRegionalSettings } from "@/lib/client/use-company-regional-settings";
import { formatCurrency } from "@/lib/regional-settings";

type Row = Record<string, unknown>;

type Summary = {
  jobsToday: number;
  jobsThisWeek: number;
  completedThisMonth: number;
  outstandingInvoices: number;
  revenueThisMonth: number;
  quotesAwaiting: number;
  stockAlerts: number;
};

const COMPLETE = new Set(["completed", "complete", "closed"]);
const PAID = new Set(["paid", "settled", "completed"]);
const QUOTE_WAITING = new Set(["sent", "viewed", "draft"]);

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function numberFrom(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    const number = typeof value === "number" ? value : Number(value ?? NaN);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function dateFrom(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value !== "string" || !value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function invoiceTotal(row: Row) {
  const total = numberFrom(row, ["total", "grand_total", "total_amount", "invoice_total"]);
  if (total) return total;
  return numberFrom(row, ["subtotal", "net_total"]) + numberFrom(row, ["vat_amount", "vat_total", "tax_amount"]);
}

function amountPaid(row: Row) {
  const paid = numberFrom(row, ["amount_paid", "paid_amount"]);
  if (paid) return paid;
  return PAID.has(normalise(row.status)) ? invoiceTotal(row) : 0;
}

function startOfDay(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfWeek(date = new Date()) {
  const result = startOfDay(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}

function sameMonth(date: Date, reference = new Date()) {
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}


export default function ExecutiveSummary({
  showFinancialCards = true,
  enabledFeatures = [],
}: {
  showFinancialCards?: boolean;
  enabledFeatures?: string[];
}) {
  const { userState, loading: companyLoading } = useNavigationUser();
  const { regionalSettings } = useCompanyRegionalSettings();
  const companyId = userState.activeCompany?.id ?? "";
  const [jobs, setJobs] = useState<Row[]>([]);
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [quotes, setQuotes] = useState<Row[]>([]);
  const [stock, setStock] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (companyLoading) return;
    if (!companyId) {
      setJobs([]); setInvoices([]); setQuotes([]); setStock([]); setLoading(false); return;
    }

    setLoading(true);
    setError("");

    const [jobsResult, invoiceResult, quoteResult, stockResult] = await Promise.all([
      supabase.from("jobs").select("*").eq("company_id", companyId),
      showFinancialCards && enabledFeatures.includes("invoices")
        ? supabase.from("invoices").select("*").eq("company_id", companyId)
        : Promise.resolve({ data: [], error: null }),
      showFinancialCards && enabledFeatures.includes("quotes")
        ? supabase.from("quotes").select("id,status,created_at,quote_date,total").eq("company_id", companyId)
        : Promise.resolve({ data: [], error: null }),
      enabledFeatures.includes("stock")
        ? supabase.from("stock_items").select("id,quantity_in_stock,minimum_stock,active").eq("company_id", companyId).eq("active", true)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const firstError = jobsResult.error || invoiceResult.error || quoteResult.error || stockResult.error;
    if (firstError) {
      console.error("Unable to load executive dashboard:", firstError);
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setJobs((jobsResult.data ?? []) as Row[]);
    setInvoices((invoiceResult.data ?? []) as Row[]);
    setQuotes((quoteResult.data ?? []) as Row[]);
    setStock((stockResult.data ?? []) as Row[]);
    setLoading(false);
  }, [companyId, companyLoading, enabledFeatures, showFinancialCards]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo<Summary>(() => {
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekStart = startOfWeek(now);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);

    let jobsToday = 0;
    let jobsThisWeek = 0;
    let completedThisMonth = 0;

    for (const job of jobs) {
      const scheduled = dateFrom(job, ["scheduled_date", "scheduled_at", "start_date", "appointment_date", "due_date", "opened_date"]);
      if (scheduled && scheduled >= today && scheduled < tomorrow) jobsToday += 1;
      if (scheduled && scheduled >= weekStart && scheduled < weekEnd) jobsThisWeek += 1;

      if (COMPLETE.has(normalise(job.status))) {
        const completed = dateFrom(job, ["completed_at", "closed_at", "updated_at", "opened_date", "created_at"]);
        if (completed && sameMonth(completed, now)) completedThisMonth += 1;
      }
    }

    let outstandingInvoices = 0;
    let revenueThisMonth = 0;

    for (const invoice of invoices) {
      const total = invoiceTotal(invoice);
      const paid = amountPaid(invoice);
      if (!PAID.has(normalise(invoice.status))) outstandingInvoices += Math.max(0, total - paid);

      const paidDate = dateFrom(invoice, ["paid_at", "payment_date", "settled_at", "updated_at"]);
      if (paidDate && sameMonth(paidDate, now)) revenueThisMonth += paid;
    }

    const quotesAwaiting = quotes.filter((quote) => QUOTE_WAITING.has(normalise(quote.status))).length;
    const stockAlerts = stock.filter((item) => Number(item.quantity_in_stock ?? 0) <= Number(item.minimum_stock ?? 0)).length;

    return {
      jobsToday,
      jobsThisWeek,
      completedThisMonth,
      outstandingInvoices,
      revenueThisMonth,
      quotesAwaiting,
      stockAlerts,
    };
  }, [jobs, invoices, quotes, stock]);

  const cards = [
    {
      label: "Jobs today",
      value: String(summary.jobsToday),
      detail: `${summary.jobsThisWeek} scheduled this week`,
      href: enabledFeatures.includes("calendar") ? "/calendar" : "/jobs",
      icon: CalendarDays,
      tone: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
      financial: false,
    },
    {
      label: "Completed this month",
      value: String(summary.completedThisMonth),
      detail: "Jobs marked complete",
      href: "/jobs",
      icon: ClipboardCheck,
      tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      financial: false,
    },
    {
      label: "Revenue this month",
      value: formatCurrency(summary.revenueThisMonth, regionalSettings, { maximumFractionDigits: 0 }),
      detail: "Paid invoices",
      href: "/reports",
      icon: Banknote,
      tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      financial: true,
      requiredFeature: "invoices",
    },
    {
      label: "Outstanding invoices",
      value: formatCurrency(summary.outstandingInvoices, regionalSettings, { maximumFractionDigits: 0 }),
      detail: "Balance still to collect",
      href: "/invoices",
      icon: FileClock,
      tone: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
      financial: true,
      requiredFeature: "invoices",
    },
    {
      label: "Quotes awaiting action",
      value: String(summary.quotesAwaiting),
      detail: "Draft, sent or viewed",
      href: "/quotes",
      icon: Wrench,
      tone: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
      financial: true,
      requiredFeature: "quotes",
    },
    {
      label: "Stock alerts",
      value: String(summary.stockAlerts),
      detail: summary.stockAlerts ? "At or below minimum stock" : "Stock levels healthy",
      href: "/stock",
      icon: PackageSearch,
      tone: summary.stockAlerts
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
      financial: false,
      requiredFeature: "stock",
    },
  ].filter(
    (card) =>
      (showFinancialCards || !card.financial) &&
      (!("requiredFeature" in card) || !card.requiredFeature || enabledFeatures.includes(card.requiredFeature)),
  );

  if (loading || companyLoading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: showFinancialCards ? 6 : 3 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-5 h-8 w-20 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/50 dark:bg-rose-950/30">
        <p className="font-bold text-rose-800 dark:text-rose-200">Dashboard totals could not be loaded.</p>
        <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">Try again</button>
      </section>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-900"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{card.label}</p>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon size={18} strokeWidth={2.2} />
              </span>
            </div>
            <p className="mt-4 truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white">{card.value}</p>
            <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{card.detail}</p>
          </Link>
        );
      })}
    </section>
  );
}
