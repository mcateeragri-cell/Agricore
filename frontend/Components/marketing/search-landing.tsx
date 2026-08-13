import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PackageSearch,
  Smartphone,
  Tractor,
  Wrench,
} from "lucide-react";

import MarketingShell from "@/Components/marketing/marketing-shell";
import ProductPreview from "@/Components/marketing/product-preview";

type SearchLandingProps = {
  eyebrow: string;
  title: string;
  description: string;
  audience: string;
  pains: string[];
  benefits: Array<{ title: string; description: string }>;
  secondaryTitle: string;
  secondaryCopy: string;
};

const capabilityIcons = [Tractor, Wrench, Smartphone, ClipboardCheck, PackageSearch, FileText] as const;

const workflow = [
  ["Customer & machine", "Keep the customer, machine, serial number and service history connected from the first call."],
  ["Plan & dispatch", "Create the job, assign the engineer and keep the office aware of what is happening."],
  ["Complete in the field", "Capture labour, parts, notes, photos and completion information from the job itself."],
  ["Invoice from the record", "Turn completed work into a commercial record without retyping the job from scratch."],
] as const;

const faqs = [
  ["Is AgriCore only for large machinery dealerships?", "No. AgriCore is designed for independent agricultural engineers as well as larger service teams and dealerships. The same workflow scales from a small mobile team to a multi-user operation."],
  ["Can technicians use AgriCore away from the office?", "Yes. AgriCore is built around mobile field work so technicians can work from jobs, machine records and completion information without relying on paper job sheets."],
  ["Does AgriCore keep machine history against the customer?", "Yes. Customer and machine records are connected so previous jobs, faults, service history and commercial records can stay in context."],
  ["Can I try AgriCore before committing?", "Yes. You can explore the product demo or start a 14-day free trial before choosing a paid plan."],
] as const;

export default function SearchLanding({
  eyebrow,
  title,
  description,
  audience,
  pains,
  benefits,
  secondaryTitle,
  secondaryCopy,
}: SearchLandingProps) {
  return (
    <MarketingShell>
      <main>
        <section className="relative overflow-hidden border-b border-emerald-950/10 bg-[radial-gradient(circle_at_8%_8%,rgba(52,211,153,.22),transparent_30rem)] dark:border-white/10">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[.92fr_1.08fr] lg:px-10 lg:py-24">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">{eyebrow}</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[.97] tracking-[-0.055em] text-slate-950 sm:text-6xl dark:text-white">{title}</h1>
              <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">{description}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-800">
                  Start 14-day free trial <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/demo" className="inline-flex items-center justify-center rounded-2xl border border-emerald-950/10 bg-white px-6 py-4 font-black text-slate-950 shadow-sm transition hover:border-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
                  Explore product demo
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                <span>✓ £0 charged today</span><span>✓ 14 days free</span><span>✓ Built for machinery service work</span>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section className="border-b border-emerald-950/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">For {audience}</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Replace disconnected admin with one service workflow.</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pains.map((pain) => (
                  <div key={pain} className="flex gap-3 rounded-2xl border border-emerald-950/10 bg-white p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                    <span>{pain}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">What AgriCore connects</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">The operational records already used by your team.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = capabilityIcons[index % capabilityIcons.length];
              return (
                <article key={benefit.title} className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <span className="inline-flex rounded-xl border border-emerald-950/10 bg-emerald-50 p-2.5 text-emerald-800 dark:border-white/10 dark:bg-emerald-950 dark:text-emerald-300"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-lg font-black">{benefit.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{benefit.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-[#eef8f3] dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">One connected workflow</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">From the first phone call to the final invoice.</h2>
              <p className="mt-5 text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">AgriCore is designed around the real sequence of agricultural service work instead of making the team rebuild information between separate systems.</p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {workflow.map(([step, copy], index) => (
                <article key={step} className="rounded-3xl border border-emerald-950/10 bg-white p-6 dark:border-white/10 dark:bg-slate-950">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">0{index + 1}</div>
                  <h3 className="mt-3 text-xl font-black">{step}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Why specialist software matters</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Built around machines and service work, not generic contact management.</h2>
              <p className="mt-5 text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">Agricultural engineering businesses need the machine, its history and the work carried out to remain connected. AgriCore puts those records at the centre of the workflow.</p>
            </div>
            <div className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="grid grid-cols-[1fr_1fr] border-b border-emerald-950/10 bg-slate-50 text-sm font-black dark:border-white/10 dark:bg-white/5">
                <div className="p-4">Disconnected admin</div><div className="p-4 text-emerald-800 dark:text-emerald-300">AgriCore workflow</div>
              </div>
              {[
                ["Customer details separate from machine history", "Customer and machine records connected"],
                ["Paper or duplicate job notes", "One current job record for office and field"],
                ["Parts and labour retyped later", "Job completion feeds the commercial record"],
                ["Service history scattered across systems", "Previous work stays against the machine"],
              ].map(([before, after]) => (
                <div key={before} className="grid grid-cols-[1fr_1fr] border-b border-emerald-950/10 text-sm font-semibold leading-6 last:border-b-0 dark:border-white/10">
                  <div className="p-4 text-slate-500">{before}</div><div className="p-4 text-slate-800 dark:text-slate-100">{after}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Common questions</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Before you move the workshop onto AgriCore.</h2>
            </div>
            <div className="mt-10 grid gap-4">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group rounded-2xl border border-emerald-950/10 bg-white p-5 open:shadow-sm dark:border-white/10 dark:bg-slate-950">
                  <summary className="cursor-pointer list-none font-black text-slate-950 dark:text-white">{question}</summary>
                  <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-emerald-950/10 bg-emerald-950 text-white dark:border-white/10">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">See the workflow before you commit</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">{secondaryTitle}</h2>
              <p className="mt-4 max-w-3xl font-medium leading-7 text-emerald-50/80">{secondaryCopy}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/demo" className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 font-black text-emerald-950">Explore demo</Link>
              <Link href="/contact" className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-6 py-4 font-black text-white">Book a tailored demo</Link>
              <Link href="/signup?plan=professional" className="inline-flex items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-800 px-6 py-4 font-black text-white">Start free trial</Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
