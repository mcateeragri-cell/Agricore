import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageSquareText, ShieldCheck, Users, Wrench } from "lucide-react";

import MarketingShell from "@/Components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Founding Customer Programme",
  description:
    "Join AgriCore as an early agricultural engineering customer with a 14-day trial, practical onboarding and direct product support.",
  alternates: { canonical: "/founding-customers" },
};

const benefits = [
  [Wrench, "Practical onboarding", "We help you get the first customers, machines, technicians and workflows set up around the way your business already operates."],
  [MessageSquareText, "Direct feedback route", "Early customers can share workflow friction directly with the AgriCore team so launch improvements are grounded in real service work."],
  [Users, "Team adoption support", "Start with the people and processes that matter most instead of trying to switch every workflow on day one."],
  [ShieldCheck, "No long commitment", "Use the 14-day trial to test AgriCore with your own company setup and cancel before the first subscription payment if it is not the right fit."],
] as const;

const steps = [
  ["01", "Choose a plan", "Start with Starter, Professional or Enterprise depending on the size and operating needs of your business."],
  ["02", "Set up the real workflow", "Add a small number of customers, machines and technicians so you can test AgriCore against real day-to-day work."],
  ["03", "Run jobs through it", "Use the technician, job, stock, quote and invoice workflows that are relevant to your business."],
  ["04", "Review together", "Tell us what worked, what slowed you down and what would make adoption easier for your team."],
] as const;

export default function FoundingCustomersPage() {
  return (
    <MarketingShell>
      <main>
        <section className="border-b border-emerald-950/10 bg-[radial-gradient(circle_at_12%_6%,rgba(52,211,153,.2),transparent_25rem)] dark:border-white/10">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_.8fr] lg:items-center lg:px-10 lg:py-24">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Founding Customer Programme</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-[-0.055em] sm:text-6xl">Help shape AgriCore around real agricultural service work.</h1>
              <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">
                We are inviting the first wave of agricultural engineering businesses to put AgriCore through real workshop and field-service workflows. You get the normal 14-day trial, practical setup support and a direct route to share what would make the platform better for your team.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white shadow-lg shadow-emerald-950/15 transition hover:bg-emerald-800">Start 14-day trial <ArrowRight className="h-5 w-5" /></Link>
                <Link href="/contact?source=founding-customer" className="inline-flex items-center justify-center rounded-2xl border border-emerald-950/15 bg-white px-6 py-4 font-black text-slate-900 dark:border-white/15 dark:bg-white/5 dark:text-white">Book a tailored demo</Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                <span>✓ £0 charged today</span><span>✓ 14 days free</span><span>✓ Cancel before billing</span>
              </div>
            </div>

            <aside className="rounded-[2rem] bg-emerald-950 p-7 text-white shadow-2xl sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Who this is for</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Businesses willing to test the real workflow, not a polished demo script.</h2>
              <div className="mt-7 grid gap-3">
                {["Independent agricultural engineering workshops", "Machinery dealerships and service departments", "Mobile field-service engineering teams", "Dairy and specialist machinery service businesses"].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-emerald-50/90">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">What you get</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">A launch experience built around adoption, not just account creation.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map(([Icon, title, copy]) => (
              <article key={title} className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                <Icon className="h-6 w-6 text-emerald-700" />
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-emerald-950 text-white dark:border-white/10">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">How it works</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Use AgriCore on real work before making a long-term decision.</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {steps.map(([number, title, copy]) => (
                <article key={number} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
                  <span className="text-xs font-black text-emerald-300">{number}</span>
                  <h3 className="mt-8 text-xl font-black">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-emerald-50/75">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="rounded-[2rem] border border-emerald-950/10 bg-white p-8 text-center shadow-lg dark:border-white/10 dark:bg-white/5 sm:p-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Ready to test it properly?</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Bring one real workflow and we will help you get started.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300">Start a trial yourself, explore the public demo first, or book a tailored walkthrough around the type of service work your business does every day.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white">Start free trial <ArrowRight className="h-5 w-5" /></Link>
              <Link href="/demo" className="inline-flex items-center justify-center rounded-2xl border border-emerald-950/15 px-6 py-4 font-black dark:border-white/15">Explore demo</Link>
              <Link href="/contact?source=founding-customer" className="inline-flex items-center justify-center rounded-2xl border border-emerald-950/15 px-6 py-4 font-black dark:border-white/15">Book demo</Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
