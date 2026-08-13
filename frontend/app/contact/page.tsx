import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquareText, ShieldCheck, Wrench } from "lucide-react";

import ContactForm from "@/Components/marketing/contact-form";
import MarketingShell from "@/Components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Contact & Demo",
  description: "Request an AgriCore demo or talk to us about your agricultural engineering business.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Talk to AgriCore</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.05em] sm:text-6xl">See how AgriCore fits the way your team actually works.</h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">
              Tell us about your workshop, field engineers and machinery workflow. We can focus a demo on the parts of AgriCore that matter to your business instead of showing you a generic software tour.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {[
                [Wrench, "Built around service work", "Workshop jobs, callouts, machine history, technicians, stock and invoicing are connected."],
                [MessageSquareText, "Practical onboarding", "Start with the workflows your team needs now and expand as the business adopts more of AgriCore."],
                [ShieldCheck, "Company-separated data", "Each business operates in its own company workspace with company-scoped permissions."],
              ].map(([Icon, title, copy]) => {
                const I = Icon as typeof Wrench;
                return (
                  <div key={String(title)} className="rounded-3xl border border-emerald-950/10 bg-white p-6 dark:border-white/10 dark:bg-white/5">
                    <I className="h-6 w-6 text-emerald-700" />
                    <h2 className="mt-4 font-black">{String(title)}</h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{String(copy)}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-3xl bg-emerald-950 p-7 text-white">
              <p className="text-xs font-black uppercase tracking-[0.17em] text-emerald-300">Prefer to explore first?</p>
              <h2 className="mt-2 text-2xl font-black">Try AgriCore before you speak to anyone.</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-emerald-50/75">The interactive demo uses synthetic data, or you can create your own 14-day trial workspace and test the real workflow.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/demo" className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-emerald-950">View product demo</Link>
                <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-black text-white">Start free trial <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </main>
    </MarketingShell>
  );
}
