"use client";

import Link from "next/link";

type MachineInsightsLinksProps = {
  customerId: string;
  machineId: string;
};

export default function MachineInsightsLinks({
  customerId,
  machineId,
}: MachineInsightsLinksProps) {
  const items = [
    {
      title: "Diagnostics Centre",
      description:
        "Upload reports, parse machine data, review detected values and open diagnostic history.",
      href: `/customers/${customerId}/machines/${machineId}/diagnostics`,
      action: "Open diagnostics",
    },
    {
      title: "Machine Timeline",
      description:
        "View jobs, diagnostics, faults, hour readings, quotes and invoices in one chronological record.",
      href: `/customers/${customerId}/machines/${machineId}/timeline`,
      action: "Open timeline",
    },
    {
      title: "Machine Health",
      description:
        "Review confirmed faults, repeat issue signals, latest diagnostics and outstanding work.",
      href: `/customers/${customerId}/machines/${machineId}/health`,
      action: "Open health",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-700"
        >
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            {item.title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {item.description}
          </p>

          <span className="mt-4 inline-flex text-sm font-bold text-[#176b4d] group-hover:underline dark:text-emerald-400">
            {item.action} →
          </span>
        </Link>
      ))}
    </section>
  );
}