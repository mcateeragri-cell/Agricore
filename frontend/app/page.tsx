import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, CloudOff, FileText, MapPin, PackageSearch, Smartphone, Tractor, Users, Wrench } from "lucide-react";

import MarketingShell from "@/Components/marketing/marketing-shell";
import ProductPreview from "@/Components/marketing/product-preview";

export const metadata: Metadata = {
  title: "Agricultural service management software",
  description: "AgriCore brings customers, machines, jobs, technicians, service programmes, stock, quotes and invoices into one agricultural engineering platform.",
};

const features = [
  [Tractor, "Machine history", "Keep serial numbers, service history, hours, faults and every job against the machine."],
  [Wrench, "Job management", "Plan workshop and field work, assign technicians and keep the complete job card together."],
  [Smartphone, "Technician workflow", "Give engineers a mobile-first job view for labour, parts, photos, signatures and completion."],
  [CalendarDays, "Calendar & dispatch", "See who is available, schedule work and coordinate field engineers from one place."],
  [ClipboardCheck, "Service programmes", "Build repeatable maintenance schedules and see upcoming service work before it is missed."],
  [FileText, "Quotes & invoices", "Move from quotation to completed job and professional invoice without retyping the same information."],
  [PackageSearch, "Stock control", "Track parts used on jobs and keep a clearer view of workshop stock."],
  [CloudOff, "Offline-ready field work", "Keep technicians productive where rural coverage is poor and sync work when connectivity returns."],
];

export default function MarketingHomePage() {
  return (
    <MarketingShell>
      <main>
        <section className="overflow-hidden border-b border-emerald-950/10 bg-[radial-gradient(circle_at_10%_10%,rgba(52,211,153,.22),transparent_26rem),radial-gradient(circle_at_90%_20%,rgba(163,230,53,.12),transparent_24rem)] dark:border-white/10">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.17em] text-emerald-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Built for agricultural engineers</div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl dark:text-white">Run the whole service business from one place.</h1>
              <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">AgriCore brings customers, machines, jobs, technicians, service programmes, stock, quotes and invoices together in a platform designed around agricultural field service.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-base font-black text-white shadow-xl shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-800">Start 14-day free trial <ArrowRight className="h-5 w-5" /></Link>
                <Link href="/features" className="inline-flex items-center justify-center rounded-2xl border border-emerald-950/10 bg-white px-6 py-4 text-base font-black text-slate-900 shadow-sm transition hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">Explore the platform</Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-600 dark:text-slate-300"><span>✓ £0 charged today</span><span>✓ 14 days free</span><span>✓ Cancel anytime</span></div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">One operating system</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Less paperwork. Better visibility. More time on the tools.</h2><p className="mt-5 text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">Generic CRMs know contacts. AgriCore understands customers, machines, service history, field engineers and workshop jobs.</p></div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof Tractor;
              return <article key={String(title)} className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5"><span className="inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><FeatureIcon className="h-6 w-6" /></span><h3 className="mt-5 text-lg font-black">{String(title)}</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{String(description)}</p></article>;
            })}
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-emerald-950 text-white dark:border-white/10">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-10 lg:py-24">
            <div><p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">From callout to invoice</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Keep the whole job connected.</h2><p className="mt-5 text-lg font-medium leading-8 text-emerald-50/80">The office can see what is happening while the technician has the information they need in the field. When the work is finished, the job record is already there for review and invoicing.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{[[Users,"Customer & machine"],[CalendarDays,"Schedule & dispatch"],[MapPin,"Field technician"],[FileText,"Complete & invoice"]].map(([Icon,label], index) => { const StepIcon = Icon as typeof Users; return <div key={String(label)} className="rounded-3xl border border-white/10 bg-white/7 p-6"><div className="flex items-center justify-between"><StepIcon className="h-6 w-6 text-emerald-300"/><span className="text-xs font-black text-emerald-300">0{index+1}</span></div><p className="mt-8 text-xl font-black">{String(label)}</p></div>; })}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="grid gap-8 rounded-[2rem] border border-emerald-950/10 bg-white p-7 shadow-xl shadow-emerald-950/5 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center dark:border-white/10 dark:bg-white/5"><div><p className="text-sm font-black uppercase tracking-[0.17em] text-emerald-700">Professional plan</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">14 days to see if it fits your business.</h2><p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300">Start on AgriCore Professional with the core workshop and field-service tools available during the trial.</p></div><div className="min-w-56"><p className="text-sm font-bold text-slate-500">Professional</p><p className="mt-1 text-4xl font-black">£89<span className="text-base font-bold text-slate-500"> / month + VAT</span></p><Link href="/signup" className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3.5 font-black text-white hover:bg-emerald-800">Start free trial</Link></div></div>
        </section>
      </main>
    </MarketingShell>
  );
}
