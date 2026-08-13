import type { Metadata } from "next";
import MarketingShell from "@/Components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How AgriCore uses essential storage and optional analytics cookies on the public website and application.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-24">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Legal</p>
        <h1 className="mt-4 text-5xl font-black tracking-tight">Cookie policy</h1>
        <div className="mt-10 space-y-8 text-base font-medium leading-7 text-slate-650 dark:text-slate-300">
          <p>AgriCore uses browser storage and cookies where needed to operate account sessions, remember preferences and support the reliable operation of the website and application.</p>

          <section>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Essential storage</h2>
            <p className="mt-2">Essential cookies or browser storage may be used for authentication, session security, company selection, theme preferences, consent choices and other functionality required for the service to work. These do not require optional analytics consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Optional analytics and advertising measurement</h2>
            <p className="mt-2">Where configured by AgriCore, optional analytics technologies may include Google Analytics, Meta Pixel, LinkedIn Insight Tag and Microsoft Clarity. They are loaded on public marketing pages only after the visitor accepts analytics cookies. They may help measure page visits, free-trial actions, demo requests and the advertising campaign that led a visitor to AgriCore.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Your choice</h2>
            <p className="mt-2">When optional analytics are configured, the website offers a choice between essential-only storage and accepting analytics. Your preference is remembered in your browser. You can clear local site data or browser cookies to reset that choice.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Managing cookies</h2>
            <p className="mt-2">Most browsers allow you to inspect, block or delete cookies and site storage. Blocking essential storage may prevent sign-in or other application features from working correctly.</p>
          </section>

          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <strong>Launch note:</strong> This page describes the consent-aware tracking support built into AgriCore. Before broad paid advertising, review the final configuration, third-party provider settings and policy wording with appropriate privacy/legal advice for the markets you target.
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
