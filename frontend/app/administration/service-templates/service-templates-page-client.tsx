"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Manufacturer = { id: string; name: string };
type ChecklistItem = { id: string; label: string; required: boolean };
type Template = {
  id: string; name: string; description: string | null; model_pattern: string | null;
  interval_hours: number | null; interval_months: number | null; status: "draft" | "approved" | "archived";
  is_active: boolean; manufacturer_id: string | null; checklist_items: ChecklistItem[];
  manufacturers?: { name: string } | null;
};

type FormState = Omit<Template, "id" | "manufacturers">;
const EMPTY: FormState = { name: "", description: "", model_pattern: "", interval_hours: null, interval_months: null, status: "draft", is_active: true, manufacturer_id: null, checklist_items: [] };

export default function ServiceTemplatesPageClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [templatesResponse, manufacturersResponse] = await Promise.all([
        fetch("/api/administration/service-templates", { cache: "no-store" }),
        fetch("/api/administration/manufacturers", { cache: "no-store" }),
      ]);
      const templatesResult = await templatesResponse.json();
      const manufacturersResult = await manufacturersResponse.json();
      if (!templatesResponse.ok) throw new Error(templatesResult.error || "Unable to load templates.");
      if (!manufacturersResponse.ok) throw new Error(manufacturersResult.error || "Unable to load manufacturers.");
      setTemplates(templatesResult.templates ?? []);
      setManufacturers((manufacturersResult.manufacturers ?? []).filter((item: { is_active: boolean }) => item.is_active));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load templates."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((item) => [item.name, item.description, item.model_pattern, item.manufacturers?.name].some((value) => value?.toLowerCase().includes(query)));
  }, [templates, search]);

  function addChecklistItem() {
    const label = newItem.trim(); if (!label) return;
    setForm({ ...form, checklist_items: [...form.checklist_items, { id: crypto.randomUUID(), label, required: true }] });
    setNewItem("");
  }

  function edit(item: Template) {
    setEditingId(item.id);
    setForm({ name: item.name, description: item.description ?? "", model_pattern: item.model_pattern ?? "", interval_hours: item.interval_hours, interval_months: item.interval_months, status: item.status, is_active: item.is_active, manufacturer_id: item.manufacturer_id, checklist_items: Array.isArray(item.checklist_items) ? item.checklist_items : [] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() { setEditingId(null); setForm(EMPTY); setNewItem(""); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(editingId ? `/api/administration/service-templates/${editingId}` : "/api/administration/service-templates", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save template.");
      setMessage(editingId ? "Service template updated." : "Service template created."); reset(); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save template."); }
    finally { setSaving(false); }
  }

  async function remove(item: Template) {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    const response = await fetch(`/api/administration/service-templates/${item.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to delete template."); return; }
    setMessage("Service template deleted."); await load();
  }

  return <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
    <header><p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Administration</p><h1 className="mt-1 text-3xl font-bold">Service Templates</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Create reusable inspection and service checklists for each manufacturer and model range.</p></header>
    <div className="mt-6 grid gap-6 xl:grid-cols-[440px_1fr]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">{editingId ? "Edit template" : "Create template"}</h2>
        <label className="mt-5 block text-sm font-semibold">Template name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="T7 600-hour service" /></label>
        <label className="mt-4 block text-sm font-semibold">Manufacturer<select value={form.manufacturer_id ?? ""} onChange={(e) => setForm({ ...form, manufacturer_id: e.target.value || null })} className={inputClass}><option value="">All manufacturers</option>{manufacturers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="mt-4 block text-sm font-semibold">Model pattern<input value={form.model_pattern ?? ""} onChange={(e) => setForm({ ...form, model_pattern: e.target.value })} className={inputClass} placeholder="T7.*" /></label>
        <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Hours<input type="number" min="0" value={form.interval_hours ?? ""} onChange={(e) => setForm({ ...form, interval_hours: e.target.value ? Number(e.target.value) : null })} className={inputClass} /></label><label className="text-sm font-semibold">Months<input type="number" min="0" value={form.interval_months ?? ""} onChange={(e) => setForm({ ...form, interval_months: e.target.value ? Number(e.target.value) : null })} className={inputClass} /></label></div>
        <label className="mt-4 block text-sm font-semibold">Description<textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} /></label>
        <div className="mt-5"><p className="text-sm font-bold">Checklist items</p><div className="mt-2 flex gap-2"><input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }} className={inputClassNoMargin} placeholder="Check engine oil level" /><button type="button" onClick={addChecklistItem} className="rounded-lg border border-slate-300 px-3 text-sm font-bold dark:border-slate-700">Add</button></div><div className="mt-3 space-y-2">{form.checklist_items.map((item, index) => <div key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700"><input type="checkbox" checked={item.required} onChange={(e) => setForm({ ...form, checklist_items: form.checklist_items.map((value, itemIndex) => itemIndex === index ? { ...value, required: e.target.checked } : value) })} /><input value={item.label} onChange={(e) => setForm({ ...form, checklist_items: form.checklist_items.map((value, itemIndex) => itemIndex === index ? { ...value, label: e.target.value } : value) })} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button type="button" onClick={() => setForm({ ...form, checklist_items: form.checklist_items.filter((_, itemIndex) => itemIndex !== index) })} className="text-sm font-bold text-red-700 dark:text-red-400">Remove</button></div>)}</div></div>
        <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })} className={inputClass}><option value="draft">Draft</option><option value="approved">Approved</option><option value="archived">Archived</option></select></label><label className="mt-7 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Active</label></div>
        <div className="mt-5 flex gap-3"><button disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save changes" : "Create template"}</button>{editingId && <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold dark:border-slate-700">Cancel</button>}</div>
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-bold">Template library</h2><input value={search} onChange={(e) => setSearch(e.target.value)} className={inputClassNoMargin} placeholder="Search templates" /></div>{(error || message) && <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${error ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"}`}>{error || message}</p>}<div className="mt-4 space-y-3">{loading ? <p className="py-8 text-center text-slate-500">Loading…</p> : filtered.length === 0 ? <p className="py-8 text-center text-slate-500">No service templates found.</p> : filtered.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{[item.manufacturers?.name, item.model_pattern].filter(Boolean).join(" • ") || "All machines"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize dark:bg-slate-800">{item.status}</span></div><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.description || "No description"}</p><p className="mt-3 text-xs font-semibold text-slate-500">{item.checklist_items?.length ?? 0} checklist items{item.interval_hours ? ` • ${item.interval_hours} hours` : ""}{item.interval_months ? ` • ${item.interval_months} months` : ""}</p><div className="mt-4"><button onClick={() => edit(item)} className="mr-4 text-sm font-bold text-emerald-700 dark:text-emerald-400">Edit</button><button onClick={() => void remove(item)} className="text-sm font-bold text-red-700 dark:text-red-400">Delete</button></div></article>)}</div></section>
    </div>
  </div></main>;
}

const inputClass = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const inputClassNoMargin = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
