import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MachinePassport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();
  const admin = createSupabaseAdmin();
  const passport = await admin.from("machine_public_passports")
    .select("machine_id,company_id").eq("token", token).eq("enabled", true).maybeSingle();
  if (passport.error || !passport.data) notFound();
  const machine = await admin.from("machines")
    .select("id,company_id,make,model,machine_type,year")
    .eq("id", passport.data.machine_id).eq("company_id", passport.data.company_id).maybeSingle();
  if (machine.error || !machine.data) notFound();
  const company = await admin.from("companies").select("company_name,is_active")
    .eq("id", passport.data.company_id).eq("is_active", true).maybeSingle();
  if (company.error || !company.data) notFound();
  const m = machine.data;
  const label = `${m.make || ""} ${m.model || ""}`.trim() || "Machine";
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900">
      <article className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-emerald-950 px-7 py-7 text-white">
          <p className="text-sm font-medium opacity-80">Digital Machine Passport</p>
          <h1 className="mt-2 text-2xl font-bold">{company.data.company_name}</h1>
        </header>
        <div className="space-y-5 p-7">
          <p className="text-sm text-slate-600">Machine identification • Public view</p>
          <h2 className="text-3xl font-bold">{label}</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-500">Make</dt><dd className="font-semibold">{m.make || "Not recorded"}</dd></div>
            <div><dt className="text-slate-500">Model</dt><dd className="font-semibold">{m.model || "Not recorded"}</dd></div>
            <div><dt className="text-slate-500">Machine type</dt><dd className="font-semibold">{m.machine_type || "Not recorded"}</dd></div>
            <div><dt className="text-slate-500">Year</dt><dd className="font-semibold">{m.year ?? "Not recorded"}</dd></div>
          </dl>
          <p className="rounded-lg bg-slate-100 p-4 text-sm text-slate-700">This public passport does not disclose owner details, internal service history, jobs, invoices or private notes.</p>
          <Link className="inline-block rounded-lg bg-emerald-900 px-5 py-3 font-semibold text-white" href="/login">AgriCore staff sign in</Link>
        </div>
      </article>
    </main>
  );
}
