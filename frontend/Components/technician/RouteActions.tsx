"use client";

import type { TechnicianDashboardCustomer } from "@/types/technician";

export default function RouteActions({ customer }: { customer: TechnicianDashboardCustomer | null }) {
  if (!customer) return null;

  const destination = customer.latitude != null && customer.longitude != null
    ? `${customer.latitude},${customer.longitude}`
    : [customer.address, customer.postcode].filter(Boolean).join(", ");

  if (!destination) return null;

  const encoded = encodeURIComponent(destination);
  const google = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  const apple = `https://maps.apple.com/?daddr=${encoded}`;

  return (
    <section className="mt-4 rounded-3xl border border-white/50 bg-white/90 p-5 shadow-sm backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/85">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Route</p>
      <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Navigate to customer</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{destination}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a href={google} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-xl bg-[#0c4a3a] px-4 text-sm font-black text-white">Google Maps</a>
        <a href={apple} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">Apple Maps</a>
      </div>
    </section>
  );
}
