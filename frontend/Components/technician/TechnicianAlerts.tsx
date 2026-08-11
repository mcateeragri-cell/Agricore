"use client";

import { useEffect, useMemo, useState } from "react";
import type { TechnicianDashboardJob } from "@/types/technician";

const STORAGE_KEY = "agricore-technician-known-assignments-v1";

export default function TechnicianAlerts({ jobs }: { jobs: TechnicianDashboardJob[] }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [newIds, setNewIds] = useState<string[]>([]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);

    const previous = new Set<string>(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"));
    const current = jobs.map((job) => job.assignmentId);
    const fresh = current.filter((id) => !previous.has(id));
    setNewIds(fresh);

    if (previous.size > 0 && fresh.length > 0 && Notification.permission === "granted") {
      const job = jobs.find((row) => row.assignmentId === fresh[0]);
      if (job) {
        new Notification("New AgriCore job", {
          body: `${job.jobNumber} · ${job.customer?.name ?? "Customer"}${job.machine?.displayName ? ` · ${job.machine.displayName}` : ""}`,
          icon: "/icons/icon-192.png",
        });
      }
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }, [jobs]);

  const urgent = useMemo(() => jobs.filter((job) => ["urgent", "emergency", "high"].includes(normalise(job.priority))), [jobs]);

  if (jobs.length === 0) return null;

  return (
    <section className="mt-4 rounded-3xl border border-white/50 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Notifications</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Job alerts</h2>
        </div>
        {newIds.length > 0 ? <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">{newIds.length} new</span> : null}
      </div>

      {urgent.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-black text-amber-900 dark:text-amber-100">{urgent.length} priority job{urgent.length === 1 ? "" : "s"}</p>
          <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Check your schedule before travelling.</p>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">No priority alerts for this workday.</p>
      )}

      {permission === "default" ? (
        <button
          type="button"
          onClick={async () => setPermission(await Notification.requestPermission())}
          className="mt-3 min-h-11 w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-black text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          Enable device job alerts
        </button>
      ) : null}
      {permission === "granted" ? <p className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">✓ Device alerts enabled while AgriCore is running.</p> : null}
    </section>
  );
}

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}
