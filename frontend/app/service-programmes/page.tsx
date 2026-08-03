"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigationUser } from "@/Components/navigation/use-navigation-user";
import { supabase } from "@/lib/supabase";
import Button from "../../Components/ui/Button";
import Card from "../../Components/ui/Card";

type Programme = {
  id: string;
  name: string;
  manufacturer: string | null;
  model_pattern: string | null;
  description: string | null;
  interval_hours: number | null;
  interval_months: number | null;
  estimated_labour_hours: number | null;
  version: number;
  active: boolean;
};

const emptyForm = {
  name: "",
  manufacturer: "",
  modelPattern: "",
  description: "",
  intervalHours: "600",
  intervalMonths: "",
  estimatedLabourHours: "",
};

export default function ServiceProgrammesPage() {
  const { userState, loading: companyLoading } = useNavigationUser();
  const companyId = userState.activeCompany?.id ?? "";
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (companyLoading) return;
    if (!companyId) {
      setProgrammes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("service_programmes")
      .select("*")
      .eq("company_id", companyId)
      .order("active", { ascending: false })
      .order("name");

    if (queryError) {
      setError(queryError.message);
      setProgrammes([]);
    } else {
      setProgrammes((data ?? []) as Programme[]);
    }
    setLoading(false);
  }, [companyId, companyLoading]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !form.name.trim()) return;

    const intervalHours = form.intervalHours.trim() ? Number(form.intervalHours) : null;
    const intervalMonths = form.intervalMonths.trim() ? Number(form.intervalMonths) : null;
    const labour = form.estimatedLabourHours.trim() ? Number(form.estimatedLabourHours) : null;

    if (intervalHours === null && intervalMonths === null) {
      setError("Enter an hour interval, a month interval, or both.");
      return;
    }

    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("service_programmes").insert({
      company_id: companyId,
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim() || null,
      model_pattern: form.modelPattern.trim() || null,
      description: form.description.trim() || null,
      interval_hours: intervalHours,
      interval_months: intervalMonths,
      estimated_labour_hours: labour,
      active: true,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function toggle(programme: Programme) {
    const { error: updateError } = await supabase
      .from("service_programmes")
      .update({ active: !programme.active, updated_at: new Date().toISOString() })
      .eq("id", programme.id)
      .eq("company_id", companyId);
    if (updateError) setError(updateError.message);
    else await load();
  }

  return (
    <main className="space-y-6 p-5 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Preventative maintenance</p>
          <h1 className="mt-1 text-3xl font-bold">Service programmes</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Create reusable hour- and date-based maintenance schedules, then assign them to customer machines.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ New programme</Button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Card className="p-10 text-center text-slate-500">Loading service programmes…</Card>
      ) : programmes.length === 0 ? (
        <Card className="p-10 text-center">
          <h2 className="font-bold">No programmes created</h2>
          <p className="mt-2 text-sm text-slate-500">Start with a common service such as a 600-hour engine service.</p>
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {programmes.map((programme) => (
            <Card key={programme.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{programme.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">Version {programme.version}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${programme.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {programme.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{[programme.manufacturer, programme.model_pattern].filter(Boolean).join(" • ") || "All machines"}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">Hours</p><p className="mt-1 font-bold">{programme.interval_hours ? `${programme.interval_hours} hrs` : "—"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">Time</p><p className="mt-1 font-bold">{programme.interval_months ? `${programme.interval_months} months` : "—"}</p></div>
              </div>
              {programme.description && <p className="mt-4 text-sm text-slate-500">{programme.description}</p>}
              <button type="button" onClick={() => void toggle(programme)} className="mt-5 text-sm font-bold text-emerald-700 hover:underline">
                {programme.active ? "Deactivate" : "Reactivate"}
              </button>
            </Card>
          ))}
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 md:items-center" onMouseDown={(event) => event.target === event.currentTarget && setShowForm(false)}>
          <Card className="my-4 w-full max-w-2xl overflow-hidden">
            <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-bold">New service programme</h2></div>
            <form onSubmit={submit} className="grid gap-5 p-6 md:grid-cols-2">
              <Field label="Programme name *"><input required value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} className={inputClass} placeholder="600 Hour Service" /></Field>
              <Field label="Manufacturer"><input value={form.manufacturer} onChange={(e) => setForm({...form,manufacturer:e.target.value})} className={inputClass} placeholder="New Holland" /></Field>
              <Field label="Model or range"><input value={form.modelPattern} onChange={(e) => setForm({...form,modelPattern:e.target.value})} className={inputClass} placeholder="T7" /></Field>
              <Field label="Hour interval"><input type="number" min="1" step="0.1" value={form.intervalHours} onChange={(e) => setForm({...form,intervalHours:e.target.value})} className={inputClass} /></Field>
              <Field label="Month interval"><input type="number" min="1" value={form.intervalMonths} onChange={(e) => setForm({...form,intervalMonths:e.target.value})} className={inputClass} placeholder="12" /></Field>
              <Field label="Estimated labour hours"><input type="number" min="0" step="0.1" value={form.estimatedLabourHours} onChange={(e) => setForm({...form,estimatedLabourHours:e.target.value})} className={inputClass} /></Field>
              <label className="text-sm font-semibold md:col-span-2">Description<textarea rows={4} value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} className={`${inputClass} resize-none`} /></label>
              <div className="flex gap-3 md:col-span-2 md:justify-end"><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create programme"}</Button></div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );
}

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-semibold">{label}{children}</label>; }
