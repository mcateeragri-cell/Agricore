import Link from "next/link";

import { requirePlatformRole } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const dynamic = "force-dynamic";

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function PlatformLeadsPage() {
  await requirePlatformRole(["super_admin", "platform_admin"]);
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_leads")
    .select("id,enquiry_type,full_name,company_name,email,phone,country,team_size,message,status,utm_source,utm_campaign,created_at")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) throw new Error(error.message);
  const leads = data ?? [];

  return (
    <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/platform" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">← Platform dashboard</Link>
            <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">Launch leads</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Demo and sales requests captured from the public AgriCore website.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Captured</p>
            <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{leads.length}</p>
          </div>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {leads.length === 0 ? (
            <div className="p-10 text-center"><p className="font-bold text-slate-800 dark:text-slate-100">No enquiries yet.</p><p className="mt-2 text-sm text-slate-500">New demo requests will appear here automatically.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                  <tr><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Business</th><th className="px-4 py-3">Request</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Received</th></tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-slate-200 align-top dark:border-slate-800">
                      <td className="px-4 py-4"><p className="font-bold text-slate-950 dark:text-white">{lead.full_name}</p><a href={`mailto:${lead.email}`} className="mt-1 block text-sm font-semibold text-emerald-700 dark:text-emerald-400">{lead.email}</a>{lead.phone ? <a href={`tel:${lead.phone}`} className="mt-1 block text-xs text-slate-500">{lead.phone}</a> : null}</td>
                      <td className="px-4 py-4 text-sm"><p className="font-semibold text-slate-800 dark:text-slate-200">{lead.company_name || "—"}</p><p className="mt-1 text-xs text-slate-500">{[lead.country, lead.team_size].filter(Boolean).join(" · ") || "Details not supplied"}</p></td>
                      <td className="max-w-md px-4 py-4 text-sm"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">{lead.enquiry_type}</span><p className="mt-3 whitespace-pre-wrap leading-6 text-slate-600 dark:text-slate-300">{lead.message}</p></td>
                      <td className="px-4 py-4 text-xs text-slate-500">{lead.utm_source || "Direct"}{lead.utm_campaign ? <><br />{lead.utm_campaign}</> : null}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-500">{date(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
