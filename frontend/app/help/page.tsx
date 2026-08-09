import Link from "next/link";

import { requireAuthenticatedUser } from "@/lib/auth/require-permission";

const sections = [
  ["Getting started", "Set up your company, branding, users and billing.", "/settings/company"],
  ["Customers & machines", "Create customers, add machinery and build a complete service history.", "/customers"],
  ["Jobs & dispatch", "Create jobs, assign engineers, plan the calendar and complete work in the field.", "/jobs"],
  ["Quotes & invoices", "Move from quotation to completed job and customer invoice.", "/quotes"],
  ["Technician workflow", "Use mobile job cards, photos, signatures, GPS and offline working.", "/technician"],
  ["Billing & subscription", "Review your AgriCore trial, payment method and subscription.", "/settings/billing"],
] as const;

export default async function HelpPage() {
  const user = await requireAuthenticatedUser();

  return (
    <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">AgriCore support</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Help centre</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">Quick guidance for {user.companyName}. This launch help centre points you directly to the workflows most businesses use every day.</p>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {sections.map(([title, description, href]) => (
            <Link key={title} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800">
              <h2 className="text-lg font-bold text-slate-950 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
              <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Open →</p>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
          <h2 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">Need help during onboarding?</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900/80 dark:text-emerald-200/80">For the closed-beta launch, contact the AgriCore team directly and include your company name, the page you were using and a screenshot of the issue. A full searchable knowledge base can be added as real customer questions come in.</p>
          <Link href="/contact" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Contact AgriCore</Link>
        </section>
      </div>
    </main>
  );
}
