"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Manufacturer = {
  id: string;
  name: string;
  website: string | null;
  notes: string | null;
  is_active: boolean;
};

type FormState = {
  name: string;
  website: string;
  notes: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = { name: "", website: "", notes: "", is_active: true };

export default function ManufacturersPageClient() {
  const [items, setItems] = useState<Manufacturer[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/administration/manufacturers", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load manufacturers.");
      setItems(result.manufacturers ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load manufacturers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => [item.name, item.website, item.notes].some((value) => value?.toLowerCase().includes(query)));
  }, [items, search]);

  function startEdit(item: Manufacturer) {
    setEditingId(item.id);
    setForm({ name: item.name, website: item.website ?? "", notes: item.notes ?? "", is_active: item.is_active });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(editingId ? `/api/administration/manufacturers/${editingId}` : "/api/administration/manufacturers", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save manufacturer.");
      setMessage(editingId ? "Manufacturer updated." : "Manufacturer created.");
      resetForm();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save manufacturer.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Manufacturer) {
    if (!window.confirm(`Delete ${item.name}? Existing templates will keep working but will no longer be linked to this manufacturer.`)) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/administration/manufacturers/${item.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to delete manufacturer."); return; }
    setMessage("Manufacturer deleted.");
    await load();
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Administration</p>
          <h1 className="mt-1 text-3xl font-bold">Manufacturers</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Maintain the machinery brands used by service templates, stock and machine records.</p>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold">{editingId ? "Edit manufacturer" : "Add manufacturer"}</h2>
            <label className="mt-5 block text-sm font-semibold">Name<input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="New Holland" /></label>
            <label className="mt-4 block text-sm font-semibold">Website<input maxLength={300} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputClass} placeholder="https://..." /></label>
            <label className="mt-4 block text-sm font-semibold">Notes<textarea rows={4} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} /></label>
            <label className="mt-4 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4" />Active</label>
            <div className="mt-5 flex gap-3"><button disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save changes" : "Add manufacturer"}</button>{editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold dark:border-slate-700">Cancel</button>}</div>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-bold">Manufacturer list</h2><input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Search manufacturers" /></div>
            {(error || message) && <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${error ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"}`}>{error || message}</p>}
            <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400"><tr><th className="px-3 py-3">Name</th><th className="px-3 py-3">Website</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">Loading…</td></tr> : filtered.length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No manufacturers found.</td></tr> : filtered.map((item) => <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800"><td className="px-3 py-3 font-semibold">{item.name}</td><td className="px-3 py-3">{item.website ? <a href={item.website} target="_blank" rel="noreferrer" className="text-emerald-700 underline dark:text-emerald-400">Open</a> : "—"}</td><td className="px-3 py-3">{item.is_active ? "Active" : "Inactive"}</td><td className="px-3 py-3 text-right"><button onClick={() => startEdit(item)} className="mr-3 font-semibold text-emerald-700 dark:text-emerald-400">Edit</button><button onClick={() => void remove(item)} className="font-semibold text-red-700 dark:text-red-400">Delete</button></td></tr>)}</tbody></table></div>
          </section>
        </div>
      </div>
    </main>
  );
}

const inputClass = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
