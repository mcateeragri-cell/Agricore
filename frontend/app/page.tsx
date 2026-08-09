import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CloudOff,
  FileText,
  Gauge,
  MapPin,
  PackageSearch,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tractor,
  Users,
  Wrench,
} from "lucide-react";

import MarketingShell from "@/Components/marketing/marketing-shell";
import ProductPreview from "@/Components/marketing/product-preview";

export const metadata: Metadata = {
  title: "Agricultural engineering management software",
  description:
    "AgriCore connects customers, machines, jobs, technicians, service programmes, stock, quotes and invoices in one agricultural engineering platform.",
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
] as const;

const sectors = [
  "Agricultural engineers",
  "Machinery dealers",
  "Dairy service teams",
  "Groundcare specialists",
  "Plant & field service",
  "Independent workshops",
];

const faqs = [
  ["Does AgriCore work on phones?", "Yes. The technician workflow is designed to be used from a phone in the workshop or out in the field."],
  ["Can I keep machine service history?", "Yes. Customers, machines, jobs and service history stay connected so technicians can see the context of previous work."],
  ["What happens when there is poor signal?", "AgriCore includes offline-ready field workflows so technicians can keep working in areas with unreliable mobile coverage."],
  ["Can I try it before paying?", "Yes. AgriCore Professional includes a 14-day free trial. Your paid subscription starts after the trial unless you cancel beforehand."],
];

export default function MarketingHomePage() {
  return (
    <MarketingShell>
      <main>
        <section className="relative overflow-hidden border-b border-emerald-950/10 bg-[radial-gradient(circle_at_10%_5%,rgba(52,211,153,.25),transparent_26rem),radial-gradient(circle_at_92%_16%,rgba(163,230,53,.16),transparent_28rem)] dark:border-white/10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.17em] text-emerald-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Built for agricultural engineers
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 sm:text-6xl lg:text-[4.55rem] dark:text-white">
                Run the whole service business from one place.
              </h1>
              <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">
                AgriCore brings customers, machines, workshop jobs and field engineers together in one platform designed around the way agricultural service businesses actually work.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-base font-black text-white shadow-xl shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-800">
                  Start 14-day free trial <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/features" className="inline-flex items-center justify-center rounded-2xl border border-emerald-950/10 bg-white/80 px-6 py-4 text-base font-black text-slate-900 shadow-sm backdrop-blur transition hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                  Explore the platform
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                <span>✓ £0 charged today</span><span>✓ 14 days free</span><span>✓ Cancel anytime</span>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section className="border-b border-emerald-950/10 bg-white/65 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
            <p className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Designed for service businesses around machinery</p>
            <div className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3">
              {sectors.map((sector) => <span key={sector} className="text-sm font-black text-slate-700 dark:text-slate-200">{sector}</span>)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">One operating system</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Less paperwork. Better visibility. More time on the tools.</h2>
            </div>
            <p className="max-w-2xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">Generic CRMs know contacts. AgriCore understands customers, machines, service history, field engineers, workshop jobs and the information that needs to move between them.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map(([Icon, title, description]) => (
              <article key={title} className="group rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/10 dark:border-white/10 dark:bg-white/5">
                <span className="inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-800 transition group-hover:bg-emerald-700 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-emerald-950 text-white dark:border-white/10">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-24">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">From callout to invoice</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Keep the whole job connected.</h2>
              <p className="mt-5 text-lg font-medium leading-8 text-emerald-50/80">The office sees what is happening while the technician has the information they need in the field. When the work is finished, the job record is already there for review and invoicing.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="h-5 w-5 text-emerald-300"/><p className="mt-3 text-sm font-black">Company-isolated data</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Gauge className="h-5 w-5 text-emerald-300"/><p className="mt-3 text-sm font-black">Live business visibility</p></div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[[Users,"Customer & machine","Keep history together from the first call."],[CalendarDays,"Schedule & dispatch","See workload and assign the right engineer."],[MapPin,"Field technician","Capture labour, parts, photos and sign-off."],[FileText,"Complete & invoice","Review completed work and invoice from the same record."]].map(([Icon,label,copy], index) => {
                const StepIcon = Icon as typeof Users;
                return <div key={String(label)} className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 transition hover:bg-white/[0.1]"><div className="flex items-center justify-between"><StepIcon className="h-6 w-6 text-emerald-300"/><span className="text-xs font-black text-emerald-300">0{index+1}</span></div><p className="mt-8 text-xl font-black">{String(label)}</p><p className="mt-2 text-sm font-medium leading-6 text-emerald-50/70">{String(copy)}</p></div>;
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Built for the real world</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">The office and the field finally work from the same information.</h2>
              <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">No more chasing paper job cards, retyping machine details or wondering what happened on a callout. AgriCore keeps the operational record in one place.</p>
              <Link href="/features" className="mt-7 inline-flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300">See every feature <ArrowRight className="h-4 w-4"/></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[[Smartphone,"Mobile-first","Designed around engineers using a phone while working."],[CloudOff,"Offline-ready","Built with rural connectivity in mind."],[Tractor,"Machine-centred","Service history stays attached to the equipment."],[Sparkles,"Made for agriculture","Purpose-built workflows rather than a generic CRM skin."]].map(([Icon,title,copy])=>{const I=Icon as typeof Smartphone;return <div key={String(title)} className="rounded-3xl border border-emerald-950/10 bg-white p-6 dark:border-white/10 dark:bg-white/5"><I className="h-6 w-6 text-emerald-700"/><h3 className="mt-5 text-lg font-black">{String(title)}</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{String(copy)}</p></div>})}
            </div>
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Straight answers</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Common questions before you start.</h2></div>
            <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">{faqs.map(([q,a])=><article key={q} className="rounded-3xl border border-emerald-950/10 bg-white p-6 dark:border-white/10 dark:bg-slate-900"><h3 className="text-base font-black">{q}</h3><p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{a}</p></article>)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="grid gap-8 overflow-hidden rounded-[2.25rem] border border-emerald-950/10 bg-[radial-gradient(circle_at_15%_20%,rgba(52,211,153,.18),transparent_20rem),white] p-7 shadow-2xl shadow-emerald-950/10 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center dark:border-white/10 dark:bg-[radial-gradient(circle_at_15%_20%,rgba(52,211,153,.12),transparent_20rem),rgba(255,255,255,.04)]">
            <div><p className="text-sm font-black uppercase tracking-[0.17em] text-emerald-700">AgriCore Professional</p><h2 className="mt-3 text-4xl font-black tracking-[-0.045em]">14 days to see how it fits your business.</h2><p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300">Set it up around your own customers, machines and technicians. £0 is charged today and you can cancel before the trial ends.</p></div>
            <div className="min-w-64 rounded-3xl border border-emerald-950/10 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-white/5"><p className="text-sm font-bold text-slate-500">Professional</p><p className="mt-1 text-4xl font-black">£89<span className="text-base font-bold text-slate-500"> / month + VAT</span></p><Link href="/signup" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 font-black text-white transition hover:bg-emerald-800">Start free trial <ArrowRight className="h-4 w-4"/></Link></div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
