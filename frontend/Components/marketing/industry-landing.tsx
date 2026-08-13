import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import MarketingShell from "@/Components/marketing/marketing-shell";

type IndustryLandingProps = {
  eyebrow: string;
  title: string;
  description: string;
  pains: string[];
  capabilities: Array<{ title: string; description: string }>;
  outcomeTitle: string;
  outcomeCopy: string;
};

export default function IndustryLanding({
  eyebrow,
  title,
  description,
  pains,
  capabilities,
  outcomeTitle,
  outcomeCopy,
}: IndustryLandingProps) {
  return (
    <MarketingShell>
      <main>
        <section className="border-b border-emerald-950/10 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,.2),transparent_30rem)] dark:border-white/10">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_.8fr] lg:px-10 lg:py-24">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">{eyebrow}</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[.98] tracking-[-0.05em] sm:text-6xl">{title}</h1>
              <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">{description}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-800">
                  Start 14-day free trial <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/contact" className="inline-flex items-center justify-center rounded-2xl border border-emerald-950/10 bg-white px-6 py-4 font-black text-slate-950 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
                  Request a tailored demo
                </Link>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-emerald-950/10 bg-white p-7 shadow-xl shadow-emerald-950/5 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Replace the daily friction</p>
              <div className="mt-5 grid gap-4">
                {pains.map((pain) => (
                  <div key={pain} className="flex gap-3 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                    <span>{pain}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">One connected workflow</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Built around the work your team already does.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => (
              <article key={item.title} className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                <span className="inline-flex rounded-2xl bg-emerald-100 p-2.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Sparkles className="h-5 w-5" /></span>
                <h3 className="mt-4 text-lg font-black">{item.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-emerald-950 text-white dark:border-white/10">
          <div className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-8 lg:px-10 lg:py-20">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">Built for adoption</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{outcomeTitle}</h2>
            <p className="mx-auto mt-5 max-w-3xl text-base font-medium leading-7 text-emerald-50/80">{outcomeCopy}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup?plan=professional" className="rounded-2xl bg-white px-6 py-4 font-black text-emerald-950">Start free trial</Link>
              <Link href="/pricing" className="rounded-2xl border border-white/20 px-6 py-4 font-black text-white">Compare plans</Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
