"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  Gauge,
  PackageSearch,
  Tractor,
  Users,
  Wrench,
} from "lucide-react";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "customers", label: "Customers", icon: Users },
  { id: "machines", label: "Machines", icon: Tractor },
  { id: "jobs", label: "Jobs", icon: Wrench },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "reports", label: "Reports", icon: BarChart3 },
] as const;

type TabId = (typeof tabs)[number]["id"];

const customers = [
  ["Northfield Demo Farming Ltd", "3 machines", "2 open jobs"],
  ["Moorbank Demo Contractors", "5 machines", "1 open job"],
  ["Willowridge Demo Dairy Ltd", "4 machines", "Service due"],
  ["Oakview Demo Agri Ltd", "2 machines", "No open jobs"],
];

const machines = [
  ["New Holland T7.270", "DEMO-NH-7A41", "7,820 hrs"],
  ["John Deere 6250R", "DEMO-JD-91K2", "5,460 hrs"],
  ["JCB 435S", "DEMO-JCB-4P18", "6,110 hrs"],
  ["Massey Ferguson 7726", "DEMO-MF-88Q3", "7,350 hrs"],
];

const jobs = [
  ["T7.270 hydraulic fault", "In progress", "Demo Engineer A"],
  ["6250R 1,500 hr service", "Scheduled", "Demo Engineer B"],
  ["435S A/C diagnosis", "Awaiting parts", "Demo Engineer C"],
  ["7726 PTO inspection", "Complete", "Demo Engineer A"],
];

const invoices = [
  ["INV-DEMO-1048", "Northfield Demo Farming Ltd", "£1,248.60", "Paid"],
  ["INV-DEMO-1049", "Moorbank Demo Contractors", "£684.00", "Outstanding"],
  ["INV-DEMO-1050", "Willowridge Demo Dairy Ltd", "£2,118.40", "Paid"],
  ["INV-DEMO-1051", "Oakview Demo Agri Ltd", "£396.00", "Draft"],
];

function Status({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
      {children}
    </span>
  );
}

export default function PublicDemo() {
  const [active, setActive] = useState<TabId>("dashboard");

  const activeLabel = useMemo(
    () => tabs.find((tab) => tab.id === active)?.label ?? "Dashboard",
    [active],
  );

  return (
    <div className="overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[#f4faf6] shadow-2xl shadow-emerald-950/10">
      <div className="border-b border-emerald-950/10 bg-emerald-950 px-5 py-4 text-white sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              Live read-only product demo
            </div>
            <div className="mt-1 text-lg font-black">Oakridge Demo Agricultural Services</div>
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            Synthetic data only
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[230px_1fr]">
        <aside className="border-b border-emerald-950/10 bg-white p-3 lg:border-b-0 lg:border-r lg:p-4">
          <div className="flex gap-2 overflow-x-auto lg:flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(tab.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black transition lg:w-full ${
                    selected
                      ? "bg-emerald-700 text-white"
                      : "text-slate-700 hover:bg-emerald-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 hidden rounded-2xl bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-950 lg:block">
            This preview never connects to customer data and cannot create, edit, delete or send anything.
          </div>
        </aside>

        <section className="min-h-[520px] p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Product preview
              </div>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                {activeLabel}
              </h2>
            </div>
            <Status>Read only</Status>
          </div>

          {active === "dashboard" && (
            <div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Open jobs", "18", "6 scheduled today"],
                  ["Due services", "7", "3 due this week"],
                  ["Outstanding", "£8,416", "5 invoices"],
                  ["Stock alerts", "3", "At or below minimum"],
                ].map(([label, value, copy]) => (
                  <div key={label} className="rounded-2xl border border-emerald-950/10 bg-white p-5">
                    <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</div>
                    <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
                    <div className="mt-2 text-xs font-bold text-slate-500">{copy}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
                <div className="rounded-2xl border border-emerald-950/10 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Today</div>
                      <div className="mt-1 text-xl font-black">Workshop & field jobs</div>
                    </div>
                    <CalendarDays className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {jobs.slice(0, 3).map(([title, status, engineer]) => (
                      <div key={title} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
                        <div>
                          <div className="font-black text-slate-900">{title}</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">{engineer}</div>
                        </div>
                        <Status>{status}</Status>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-950/10 bg-emerald-950 p-5 text-white">
                  <div className="text-xs font-black uppercase tracking-[0.15em] text-emerald-300">Technician mobile</div>
                  <div className="mt-3 text-2xl font-black">Job information in the field.</div>
                  <div className="mt-5 space-y-3 text-sm font-bold text-emerald-50/85">
                    <div>✓ Travel & labour</div>
                    <div>✓ Parts used</div>
                    <div>✓ Photos & signatures</div>
                    <div>✓ Offline workflow</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {active === "customers" && <DemoTable headings={["Customer", "Fleet", "Status"]} rows={customers} />}
          {active === "machines" && <DemoTable headings={["Machine", "Demo serial", "Hours"]} rows={machines} />}
          {active === "jobs" && <DemoTable headings={["Job", "Status", "Engineer"]} rows={jobs} />}
          {active === "invoices" && <DemoTable headings={["Invoice", "Customer", "Value", "Status"]} rows={invoices} />}
          {active === "reports" && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-950/10 bg-white p-5">
                <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">6-month trend</div>
                <div className="mt-1 text-xl font-black">Invoice revenue</div>
                <div className="mt-8 flex h-44 items-end gap-3">
                  {[42, 58, 49, 76, 64, 89].map((height, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center gap-2">
                      <div className="w-full rounded-t-xl bg-emerald-200" style={{ height: `${height}%` }} />
                      <span className="text-[10px] font-black text-slate-500">{["Mar","Apr","May","Jun","Jul","Aug"][index]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-950/10 bg-white p-5">
                <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Field team</div>
                <div className="mt-1 text-xl font-black">Labour by engineer</div>
                <div className="mt-6 space-y-5">
                  {[["Demo Engineer A", "31.5 hrs", 82],["Demo Engineer B","27 hrs",70],["Demo Engineer C","19.5 hrs",52]].map(([name, hours, width]) => (
                    <div key={String(name)}>
                      <div className="flex justify-between text-sm font-black"><span>{name}</span><span>{hours}</span></div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${width}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DemoTable({ headings, rows }: { headings: string[]; rows: readonly (readonly string[])[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left">
          <thead className="bg-emerald-50">
            <tr>{headings.map((heading) => <th key={heading} className="px-5 py-4 text-xs font-black uppercase tracking-[0.12em] text-emerald-950">{heading}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-emerald-950/10">
                {row.map((cell, cellIndex) => <td key={cellIndex} className={`px-5 py-4 text-sm ${cellIndex === 0 ? "font-black text-slate-950" : "font-bold text-slate-600"}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
