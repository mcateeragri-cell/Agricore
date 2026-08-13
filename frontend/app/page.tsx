import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CloudOff,
  FileSignature,
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
  description: "AgriCore connects customers, machines, jobs, technicians, service programmes, stock, quotes and invoices in one platform built for agricultural service businesses.",
  alternates: { canonical: "https://getagricore.com" },
};

const features = [
  [Tractor, "Machine history", "Serial numbers, hours, service history, faults and every job stay attached to the machine."],
  [Wrench, "Job management", "Plan workshop and field work, assign technicians and keep the complete digital job card together."],
  [Smartphone, "Technician Pro", "A mobile-first workflow for travel, labour, parts, photos, signatures and completion."],
  [CalendarDays, "Calendar & dispatch", "See workload, schedule work and coordinate field engineers from one place."],
  [ClipboardCheck, "Service programmes", "Create repeatable maintenance schedules and surface upcoming service work before it is missed."],
  [FileText, "Quotes & invoices", "Move from quotation to completed job and professional invoice without retyping the same information."],
  [PackageSearch, "Stock & purchasing", "Track workshop stock, suppliers, purchase orders, receipts and parts used on jobs."],
  [BarChart3, "Reports", "Understand revenue, outstanding invoices, labour, jobs, stock and service exposure with drill-down reporting."],
] as const;

const outcomes = [
  ["One record", "Keep the customer, machine, job, parts, labour and invoice connected."],
  ["Field ready", "Give engineers the information they need from a phone, including offline-ready workflows."],
  ["Built for machinery", "Machine history and service work are first-class records—not notes hidden inside a generic CRM."],
  ["Clearer control", "See workload, outstanding work, stock position and business performance without chasing paper."],
];

const sectors = [
  ["Agricultural engineers", "/industries/agricultural-engineers"],
  ["Machinery dealers", "/industries/machinery-dealers"],
  ["Mobile service engineers", "/industries/mobile-service-engineers"],
  ["Dairy service teams", "/industries/dairy-service"],
  ["Groundcare specialists", "/features"],
  ["Independent workshops", "/features"],
] as const;

const faqs = [
  ["Does AgriCore work on phones?", "Yes. Technician Pro is designed for engineers using a phone in the workshop or out in the field."],
  ["Can I keep machine service history?", "Yes. Customer, machine, job and service history stay connected so technicians can quickly understand previous work."],
  ["What happens when there is poor signal?", "AgriCore includes offline-ready technician workflows and a sync centre for queued field updates."],
  ["Can I manage stock and purchase orders?", "Yes. Stock Pro covers inventory, suppliers, purchase orders, receipts and movement history."],
  ["Is there a free trial?", "Yes. Starter, Professional and Enterprise can each begin with a 14-day free trial. £0 is charged today and the selected paid subscription starts after the trial unless cancelled beforehand."],
  ["Is company data separated?", "Yes. AgriCore is multi-company by design and company-scoped data and permissions are kept isolated between businesses."],
  ["Can AgriCore be used outside the UK?", "AgriCore includes company-level regional settings for country, currency, timezone, date formats and tax naming. Local accounting, tax and regulatory requirements should still be checked for the country where your business operates."],
];

export default function MarketingHomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AgriCore",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://getagricore.com",
    description: "Agricultural engineering management software for customers, machines, jobs, technicians, stock, service programmes, quotes and invoices.",
    offers: [
      { "@type": "Offer", name: "Starter", price: "49", priceCurrency: "GBP" },
      { "@type": "Offer", name: "Professional", price: "89", priceCurrency: "GBP" },
      { "@type": "Offer", name: "Enterprise", price: "225", priceCurrency: "GBP" },
    ],
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main>
        <section className="relative overflow-hidden border-b border-emerald-950/10 bg-[radial-gradient(circle_at_10%_5%,rgba(52,211,153,.25),transparent_26rem),radial-gradient(circle_at_92%_16%,rgba(163,230,53,.16),transparent_28rem)] dark:border-white/10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.17em] text-emerald-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Built by agricultural engineers
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 sm:text-6xl lg:text-[4.55rem] dark:text-white">Run the whole service business from one place.</h1>
              <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">AgriCore brings customers, machines, workshop jobs, field engineers, stock, service programmes and invoicing together in one platform designed around agricultural engineering.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-base font-black text-white shadow-xl shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-800">Start 14-day free trial <ArrowRight className="h-5 w-5" /></Link>
                <Link href="/demo" className="inline-flex items-center justify-center rounded-2xl border border-emerald-950/10 bg-white/80 px-6 py-4 text-base font-black text-slate-900 shadow-sm backdrop-blur transition hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">See the product</Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-600 dark:text-slate-300"><span>✓ £0 charged today</span><span>✓ 14 days free</span><span>✓ Cancel anytime</span></div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section className="border-b border-emerald-950/10 bg-white/65 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
            <p className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Designed for service businesses around machinery</p>
            <div className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3">{sectors.map(([sector, href]) => <Link key={sector} href={href} className="text-sm font-black text-slate-700 transition hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-300">{sector}</Link>)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div><p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">One operating system</p><h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Less paperwork. Better visibility. More time on the tools.</h2></div>
            <p className="max-w-2xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">Generic CRMs know contacts. AgriCore understands customers, machines, service history, technicians, workshop jobs, stock and the information that needs to move between them.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map(([Icon, title, description]) => <article key={title} className="group rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/10 dark:border-white/10 dark:bg-white/5"><span className="inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-800 transition group-hover:bg-emerald-700 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300"><Icon className="h-6 w-6" /></span><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{description}</p></article>)}
          </div>
          <div className="mt-8 text-center"><Link href="/features" className="inline-flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300">Explore all features <ArrowRight className="h-4 w-4"/></Link></div>
        </section>

        <section className="border-y border-emerald-950/10 bg-emerald-950 text-white dark:border-white/10">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-24">
            <div><p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">From callout to invoice</p><h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Keep the whole job connected.</h2><p className="mt-5 text-lg font-medium leading-8 text-emerald-50/80">The office sees what is happening while the technician has the information they need in the field. When the work is finished, the job record is already there for review and invoicing.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="h-5 w-5 text-emerald-300"/><p className="mt-3 text-sm font-black">Company-isolated data</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Gauge className="h-5 w-5 text-emerald-300"/><p className="mt-3 text-sm font-black">Live business visibility</p></div></div></div>
            <div className="grid gap-3 sm:grid-cols-2">{[[Users,"Customer & machine","Keep history together from the first call."],[CalendarDays,"Schedule & dispatch","See workload and assign the right engineer."],[MapPin,"Field technician","Capture travel, labour, parts, photos and sign-off."],[FileText,"Complete & invoice","Review completed work and invoice from the same record."]].map(([Icon,label,copy], index) => {const StepIcon = Icon as typeof Users; return <div key={String(label)} className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 transition hover:bg-white/[0.1]"><div className="flex items-center justify-between"><StepIcon className="h-6 w-6 text-emerald-300"/><span className="text-xs font-black text-emerald-300">0{index+1}</span></div><p className="mt-8 text-xl font-black">{String(label)}</p><p className="mt-2 text-sm font-medium leading-6 text-emerald-50/70">{String(copy)}</p></div>;})}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Why AgriCore</p><h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Software that understands the machine is part of the customer relationship.</h2></div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{outcomes.map(([title, copy]) => <article key={title} className="rounded-3xl border border-emerald-950/10 bg-white p-6 dark:border-white/10 dark:bg-white/5"><CheckCircle2 className="h-6 w-6 text-emerald-700"/><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{copy}</p></article>)}</div>
        </section>


        <section className="border-y border-emerald-950/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Sparkles className="h-4 w-4" /> AI Workshop Assistant</div>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Fault-finding help with your own machine history in context.</h2>
              <p className="mt-5 text-base font-medium leading-7 text-slate-600 dark:text-slate-300">Select the machine, describe the complaint and let AgriCore combine the current symptoms with recorded jobs, repairs and service history. The assistant is advisory and keeps manufacturer verification explicit for specifications and safety-critical decisions.</p>
              <Link href="/features" className="mt-7 inline-flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300">Explore AI and Intelligence <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Machine-aware context", "Previous jobs, faults, parts and service history can travel with the diagnostic request."],
                ["Checks in a useful order", "Use AI reasoning to structure likely causes and practical checks instead of starting from a blank page."],
                ["Workshop knowledge grows", "Recorded repairs give future technicians more company-specific context on repeat issues."],
                ["Advisory, not a manual", "AgriCore does not pretend AI-generated specifications replace authorised manufacturer information."],
              ].map(([title, copy]) => <article key={title} className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900"><h3 className="font-black">{title}</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{copy}</p></article>)}
            </div>
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_.8fr] lg:px-10">
            <div><p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Security by design</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Your company workspace stays your company workspace.</h2><p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">AgriCore is built as a multi-company platform with company-scoped access, role permissions, secure authentication and payments handled through specialist providers.</p><Link href="/security" className="mt-7 inline-flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300">Read about security <ArrowRight className="h-4 w-4"/></Link></div>
            <div className="grid gap-4 sm:grid-cols-2">{[[ShieldCheck,"Tenant isolation"],[Users,"Role permissions"],[FileSignature,"Secure sign-off"],[CloudOff,"Offline sync controls"]].map(([Icon,label])=>{const I=Icon as typeof ShieldCheck; return <div key={String(label)} className="rounded-3xl border border-emerald-950/10 bg-white p-6 dark:border-white/10 dark:bg-slate-900"><I className="h-7 w-7 text-emerald-700"/><p className="mt-5 font-black">{String(label)}</p></div>;})}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="grid gap-8 overflow-hidden rounded-[2.25rem] border border-emerald-950/10 bg-[radial-gradient(circle_at_15%_20%,rgba(52,211,153,.18),transparent_20rem),white] p-7 shadow-2xl shadow-emerald-950/10 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center dark:border-white/10 dark:bg-[radial-gradient(circle_at_15%_20%,rgba(52,211,153,.12),transparent_20rem),rgba(255,255,255,.04)]">
            <div><p className="text-sm font-black uppercase tracking-[0.17em] text-emerald-700">Start with the plan that fits</p><h2 className="mt-3 text-4xl font-black tracking-[-0.045em]">14 days to see how AgriCore fits your business.</h2><p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300">Choose Starter, Professional or Enterprise, set it up around your own customers, machines and technicians, and cancel before the trial ends if it is not the right fit.</p></div>
            <div className="min-w-64 rounded-3xl border border-emerald-950/10 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-white/5"><p className="text-sm font-bold text-slate-500">Professional</p><p className="mt-1 text-4xl font-black">£89<span className="text-base font-bold text-slate-500"> / month + VAT</span></p><Link href="/signup" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 font-black text-white transition hover:bg-emerald-800">Start free trial <ArrowRight className="h-4 w-4"/></Link><Link href="/pricing" className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-emerald-950/10 px-5 py-3 text-sm font-black dark:border-white/10">Compare plans</Link></div>
          </div>
        </section>

        <section className="border-t border-emerald-950/10 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Straight answers</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Common questions before you start.</h2></div><div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">{faqs.map(([q,a])=><article key={q} className="rounded-3xl border border-emerald-950/10 bg-white p-6 dark:border-white/10 dark:bg-slate-900"><h3 className="text-base font-black">{q}</h3><p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{a}</p></article>)}</div></div>
        </section>
      </main>
    </MarketingShell>
  );
}
