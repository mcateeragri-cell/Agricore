import type { Metadata } from "next";

import BillingCentre from "@/Components/platform/billing-centre";
import { requirePermission } from "@/lib/auth/require-permission";

export const metadata: Metadata = {
  title: "Billing",
};

export default async function BillingPage() {
  await requirePermission(["settings.manage"]);

  return (
    <main className="min-h-dvh w-full min-w-0">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Administration</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Billing & subscription</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 dark:text-slate-300">Manage the AgriCore subscription for this company. This is separate from the payment methods your company offers on customer invoices.</p>
        </header>
        <BillingCentre />
      </div>
    </main>
  );
}
