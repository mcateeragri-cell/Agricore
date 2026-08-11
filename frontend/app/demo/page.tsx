import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import MarketingShell from "@/Components/marketing/marketing-shell";
import PublicDemo from "@/Components/marketing/public-demo";

export const metadata: Metadata = {
  title: "Live Product Demo",
  description: "Explore a safe, read-only AgriCore workspace with completely synthetic agricultural engineering data.",
};

export default function DemoPage() {
  return (
    <MarketingShell>
      <main>
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Interactive product demo</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl dark:text-white">Explore AgriCore without signing in.</h1>
            <p className="mt-6 text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">Click through a realistic agricultural service business using completely synthetic, read-only data. Nothing in this demo is connected to a real customer, machine or company.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-black text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700"/>No account required</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700"/>Read-only & isolated</span>
            </div>
          </div>

          <div className="mt-10">
            <PublicDemo />
          </div>

          <div className="mt-10 rounded-[2rem] bg-emerald-950 p-8 text-white sm:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Ready to use your own workflow?</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">Start your 14-day Professional trial.</h2>
                <p className="mt-3 max-w-2xl font-medium leading-7 text-emerald-50/80">Create your own company workspace and start adding customers, machines, jobs and invoices. £0 is charged today.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-emerald-950">Start free trial <ArrowRight className="h-5 w-5"/></Link>
                <Link href="/contact" className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-6 py-4 font-black text-white">Book a demo</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
