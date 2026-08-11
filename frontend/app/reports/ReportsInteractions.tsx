"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CirclePoundSterling,
  Clock3,
  Download,
  FileClock,
  PackageSearch,
  ReceiptText,
  ExternalLink,
  X,
} from "lucide-react";

type Tone = "emerald" | "amber" | "rose" | "sky" | "violet" | "slate";
type IconName =
  | "revenue"
  | "payments"
  | "outstanding"
  | "vat"
  | "jobs"
  | "labour"
  | "quotes"
  | "stock";

export type KpiRecord = {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  meta?: string;
  href?: string;
};

export type KpiItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
  icon: IconName;
  description: string;
  rows: Array<{ label: string; value: string }>;
  records?: KpiRecord[];
  recordsLabel?: string;
};

const iconMap = {
  revenue: CirclePoundSterling,
  payments: Banknote,
  outstanding: FileClock,
  vat: ReceiptText,
  jobs: CheckCircle2,
  labour: Clock3,
  quotes: BriefcaseBusiness,
  stock: PackageSearch,
};

const tones: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function ReportsKpiGrid({ items }: { items: KpiItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => items.find((item) => item.id === activeId) ?? null, [activeId, items]);

  return (
    <>
      <section className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          const tone = item.tone ?? "emerald";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
              aria-label={`Open ${item.label} report detail`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{item.label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
                  <Icon size={18} strokeWidth={2.2} />
                </span>
              </div>
              <p className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{item.value}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{item.detail}</p>
                <ChevronRight size={17} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
              </div>
            </button>
          );
        })}
      </section>

      {active && (() => {
        const Icon = iconMap[active.icon];
        const tone = active.tone ?? "emerald";
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={() => setActiveId(null)}>
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="report-kpi-title"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8 dark:border-slate-700 dark:bg-slate-900"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>
                    <Icon size={23} strokeWidth={2.2} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Expanded KPI</p>
                    <h2 id="report-kpi-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{active.label}</h2>
                  </div>
                </div>
                <button type="button" onClick={() => setActiveId(null)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close report detail">
                  <X size={21} />
                </button>
              </div>

              <div className="mt-7 rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/70">
                <p className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">{active.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{active.detail}</p>
              </div>

              <p className="mt-6 text-sm leading-6 text-slate-600 dark:text-slate-300">{active.description}</p>

              <dl className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {active.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-5 bg-white px-5 py-4 dark:bg-slate-900">
                    <dt className="text-sm font-semibold text-slate-600 dark:text-slate-400">{row.label}</dt>
                    <dd className="text-right text-base font-black text-slate-950 dark:text-white">{row.value}</dd>
                  </div>
                ))}
              </dl>

              {active.records && active.records.length > 0 ? (
                <div className="mt-7">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Drill down</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{active.recordsLabel ?? "Related records"}</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Showing up to 12</span>
                  </div>

                  <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    {active.records.map((record) => {
                      const content = (
                        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950 dark:text-white">{record.title}</p>
                            <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400">{record.subtitle}</p>
                            {record.meta ? <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{record.meta}</p> : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-right text-sm font-black capitalize text-slate-900 dark:text-white">{record.value}</span>
                            {record.href ? <ExternalLink size={15} className="text-emerald-600" /> : null}
                          </div>
                        </div>
                      );

                      return record.href ? (
                        <Link
                          key={record.id}
                          href={record.href}
                          onClick={() => setActiveId(null)}
                          className="block bg-white transition hover:bg-emerald-50/60 dark:bg-slate-900 dark:hover:bg-emerald-950/20"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div key={record.id} className="bg-white dark:bg-slate-900">{content}</div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-7 rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No matching records for this reporting period.</p>
                </div>
              )}
            </section>
          </div>
        );
      })()}
    </>
  );
}

type ExportSection = "jobs" | "invoices" | "labour" | "stock";
const exportOptions: Array<{ id: ExportSection; label: string; description: string }> = [
  { id: "jobs", label: "Jobs", description: "Job number, status, engineer, dates and fault details." },
  { id: "invoices", label: "Invoices", description: "Invoice totals, VAT, payment status, dates and customers." },
  { id: "labour", label: "Labour", description: "Engineer hours, rates, labour values, dates and notes." },
  { id: "stock", label: "Stock", description: "Part details, quantities, values, suppliers and locations." },
];

export function ReportsExportButton({ range }: { range: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<ExportSection>>(new Set(exportOptions.map((item) => item.id)));

  const allSelected = selected.size === exportOptions.length;

  function toggle(id: ExportSection) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    if (selected.size === 0) return;
    const sections = exportOptions.filter((item) => selected.has(item.id)).map((item) => item.id).join(",");
    window.location.href = `/api/reports/export?range=${encodeURIComponent(range)}&sections=${encodeURIComponent(sections)}`;
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
      >
        <Download size={17} /> Export CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7 dark:border-slate-700 dark:bg-slate-900" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Company export</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Choose what to export</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Select one, several or all report datasets. Only data for the active company is included.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close export selector"><X size={21} /></button>
            </div>

            <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <span>
                <span className="block text-sm font-black text-slate-950 dark:text-white">Select all</span>
                <span className="mt-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Export every available dataset in one CSV file.</span>
              </span>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(exportOptions.map((item) => item.id)))}
                className="h-5 w-5 accent-emerald-700"
              />
            </label>

            <div className="mt-3 space-y-2">
              {exportOptions.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 dark:border-slate-800 dark:hover:border-emerald-700">
                  <span>
                    <span className="block text-sm font-black text-slate-900 dark:text-white">{item.label}</span>
                    <span className="mt-1 block text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{item.description}</span>
                  </span>
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} className="h-5 w-5 accent-emerald-700" />
                </label>
              ))}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
              <button type="button" disabled={selected.size === 0} onClick={exportCsv} className="min-h-11 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">Export {selected.size || ""} selected</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
