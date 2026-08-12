import type { Metadata } from "next";

import BillingCentre from "@/Components/platform/billing-centre";
import { requirePermission } from "@/lib/auth/require-permission";

export const metadata: Metadata = {
  title: "Billing",
};

type BillingPageProps = {
  searchParams: Promise<{ upgrade?: string }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  await requirePermission(["settings.manage"]);
  const params = await searchParams;
  const financialControlUpgrade = params.upgrade === "financial-control";

  return (
    <main className="min-h-dvh w-full min-w-0">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
            Billing & subscription
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 dark:text-slate-300">
            Manage the AgriCore subscription for this company. This is separate from the payment methods your company offers on customer invoices.
          </p>
        </header>

        {financialControlUpgrade ? (
          <section className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6 dark:border-emerald-900/70 dark:bg-emerald-950/30">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
              Enterprise capability
            </p>
            <h2 className="mt-2 text-xl font-black text-emerald-950 dark:text-emerald-100">
              Financial Control is available with AgriCore Enterprise
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-emerald-900/80 dark:text-emerald-100/75">
              Professional keeps the full day-to-day workflow — customers, machines, jobs, dispatch, quotes, invoices, stock, service programmes, field tools and reports. Enterprise adds the deeper accounting workspace including purchase ledger, bank reconciliation, accountant tools and financial statements.
            </p>
          </section>
        ) : null}

        <BillingCentre />
      </div>
    </main>
  );
}
