"use client";

import { useEffect, useState } from "react";
import {
  discardOfflineQueueItem,
  flushOfflineQueue,
  getOfflineQueueItems,
  getOfflineSnapshot,
  subscribeOfflineStatus,
  type OfflineQueueItem,
  type OfflineSnapshot,
} from "@/lib/offline/technician-offline";
import { supabase } from "@/lib/supabase";

const INITIAL: OfflineSnapshot = {
  online: true,
  pending: 0,
  failed: 0,
  syncing: false,
  lastSyncedAt: null,
  lastError: null,
};

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function SyncCentre({ compact = false }: { compact?: boolean }) {
  const [snapshot, setSnapshot] = useState(INITIAL);
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [open, setOpen] = useState(false);

  async function refresh() {
    const [nextSnapshot, nextItems] = await Promise.all([
      getOfflineSnapshot(),
      getOfflineQueueItems(),
    ]);
    setSnapshot(nextSnapshot);
    setItems(nextItems);
  }

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeOfflineStatus((next) => {
      setSnapshot(next);
      void getOfflineQueueItems().then(setItems);
    });
    return () => unsubscribe();
  }, []);

  const stateLabel = snapshot.syncing
    ? "Syncing"
    : !snapshot.online
      ? "Offline"
      : snapshot.pending > 0
        ? "Waiting to sync"
        : "Synced";

  const badgeClass = !snapshot.online
    ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    : snapshot.failed > 0
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
      : snapshot.pending > 0
        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";

  return (
    <section className={compact ? "" : "rounded-3xl border border-white/50 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/85"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Offline & sync</p>
          <p className="mt-1 font-black text-slate-950 dark:text-white">{stateLabel}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {snapshot.pending > 0
              ? `${snapshot.pending} saved change${snapshot.pending === 1 ? "" : "s"} on this device`
              : snapshot.lastSyncedAt
                ? `Last synced ${formatDateTime(snapshot.lastSyncedAt)}`
                : "No changes waiting"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass}`}>
          {snapshot.failed > 0 ? `${snapshot.failed} failed` : snapshot.pending > 0 ? snapshot.pending : "✓"}
        </span>
      </button>

      {open ? (
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          {items.length === 0 ? (
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              Everything on this device is synced.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">{friendlyRequest(item)}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Saved {formatDateTime(item.createdAt)}</p>
                      {item.lastError ? <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-300">{item.lastError}</p> : null}
                    </div>
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {item.attempts > 0 ? "Retry" : "Pending"}
                    </span>
                  </div>
                  {item.attempts > 0 ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm("Discard this failed offline change? Only do this if you no longer need it.")) return;
                        await discardOfflineQueueItem(item.id);
                        await refresh();
                      }}
                      className="mt-2 text-xs font-black text-red-700 dark:text-red-300"
                    >
                      Discard failed change
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {snapshot.online && snapshot.pending > 0 ? (
            <button
              type="button"
              disabled={snapshot.syncing}
              onClick={async () => {
                await flushOfflineQueue(token, { force: true });
                await refresh();
              }}
              className="mt-3 min-h-12 w-full rounded-xl bg-[#0c4a3a] px-4 text-sm font-black text-white disabled:opacity-50"
            >
              {snapshot.syncing ? "Syncing…" : "Sync now"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function friendlyRequest(item: OfflineQueueItem) {
  if (item.url.includes("/complete")) return "Job completion";
  if (item.url.includes("/travel")) return "Travel update";
  if (item.url.includes("/parts")) return "Parts update";
  if (item.url.includes("/photos")) return "Photo update";
  if (item.url.includes("/technician/jobs/")) return "Job workflow update";
  return `${item.method} update`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
