"use client";

import type { TechnicianServiceChecklistItem } from "@/types/technician";

type Props = {
  programmeName: string;
  items: TechnicianServiceChecklistItem[];
  readOnly: boolean;
  saving: boolean;
  onChange: (items: TechnicianServiceChecklistItem[]) => void;
  onSave: () => void;
};

export default function ServiceChecklistCard({
  programmeName,
  items,
  readOnly,
  saving,
  onChange,
  onSave,
}: Props) {
  const completed = items.filter((item) => item.completed).length;
  const allComplete = items.length > 0 && completed === items.length;

  function toggleItem(id: string) {
    if (readOnly) return;

    onChange(
      items.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed }
          : item,
      ),
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-900 dark:bg-slate-900">
      <header className="border-b border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
              Service checklist
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
              {programmeName || "Scheduled service"}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              This checklist appears only because the job is linked to a service programme.
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${allComplete ? "bg-emerald-700 text-white" : "bg-white text-emerald-800 dark:bg-slate-900 dark:text-emerald-200"}`}>
            {completed}/{items.length}
          </span>
        </div>
      </header>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex min-h-16 cursor-pointer items-center gap-4 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <input
              type="checkbox"
              checked={item.completed}
              disabled={readOnly}
              onChange={() => toggleItem(item.id)}
              className="h-6 w-6 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 disabled:opacity-60"
            />
            <span className={`text-base font-bold ${item.completed ? "text-slate-500 line-through" : "text-slate-900 dark:text-white"}`}>
              {item.description}
            </span>
          </label>
        ))}

        {items.length === 0 ? (
          <p className="p-5 text-sm font-semibold text-slate-500">
            This service programme has no checklist items yet.
          </p>
        ) : null}
      </div>

      {!readOnly && items.length > 0 ? (
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="min-h-14 w-full rounded-xl bg-[#0c4a3a] px-5 text-base font-black text-white transition hover:bg-[#083c2f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving checklist…" : "Save service checklist"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
