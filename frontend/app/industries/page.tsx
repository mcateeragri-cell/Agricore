import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tractor, Truck, Warehouse, Wrench } from "lucide-react";
import MarketingShell from "@/Components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Industries",
  description: "AgriCore workflows for agricultural engineers, machinery dealers, mobile service engineers and dairy service teams.",
  alternates: { canonical: "/industries" },
};

const industries = [
  { href: "/industries/agricultural-engineers", icon: Wrench, title: "Agricultural engineers", copy: "Workshop jobs, field callouts, machine history, parts, service programmes and invoicing." },
  { href: "/industries/machinery-dealers", icon: Tractor, title: "Machinery dealers", copy: "Coordinate customer machines, service teams, workshop workload, stock and dealer operations." },
  { href: "/industries/mobile-service-engineers", icon: Truck, title: "Mobile service engineers", copy: "A field-first workflow for travel, labour, parts, photos, signatures and machine history." },
  { href: "/industries/dairy-service", icon: Warehouse, title: "Dairy service teams", copy: "Manage recurring service, emergency callouts, customer equipment, parts and field technicians." },
] as const;

export default function IndustriesPage() {
  return (
    <MarketingShell>
      <main>
        <section className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8 lg:px-10 lg:py-24">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Built around machinery service</p>
          <h1 className="mx-auto mt-4 max-w-5xl text-5xl font-black tracking-[-0.05em] sm:text-6xl">One platform, adapted to the way agricultural service teams work.</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">AgriCore keeps the customer, equipment, job, technician, parts and commercial workflow connected while role-based screens keep each team focused on what they need.</p>
        </section>
        <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-20 sm:px-8 md:grid-cols-2 lg:px-10 lg:pb-24">
          {industries.map(({ href, icon: Icon, title, copy }) => (
            <Link key={href} href={href} className="group rounded-[2rem] border border-emerald-950/10 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/10 dark:border-white/10 dark:bg-white/5">
              <span className="inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-800 transition group-hover:bg-emerald-700 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300"><Icon className="h-6 w-6" /></span>
              <h2 className="mt-5 text-2xl font-black">{title}</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{copy}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-800 dark:text-emerald-300">See how it fits <ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
