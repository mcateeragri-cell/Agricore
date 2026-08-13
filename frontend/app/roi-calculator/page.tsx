import type { Metadata } from "next";

import MarketingShell from "@/Components/marketing/marketing-shell";
import RoiCalculator from "@/Components/marketing/roi-calculator";

export const metadata: Metadata = {
  title: "Agricultural Engineering Software ROI Calculator",
  description: "Estimate the admin time and technician capacity represented by your current agricultural engineering workflow.",
  alternates: { canonical: "/roi-calculator" },
};

export default function RoiCalculatorPage() {
  return (
    <MarketingShell>
      <main>
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Business case calculator</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.05em] sm:text-6xl">Put your workshop numbers against the workflow.</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">Use your engineer count, weekly workload and labour rate to create a simple illustration of the time and productive capacity involved in your current process.</p>
          </div>

          <div className="mt-12">
            <RoiCalculator />
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
