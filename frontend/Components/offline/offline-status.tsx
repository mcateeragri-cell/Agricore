"use client";

import { useEffect, useState } from "react";
import {
  flushOfflineQueue,
  getOfflineSnapshot,
  subscribeOfflineStatus,
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

export default function OfflineStatus() {
  const [state, setState] = useState(INITIAL);

  useEffect(() => {
    const unsubscribe = subscribeOfflineStatus(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    void getOfflineSnapshot().then(setState);
  }, []);

  if (state.online && state.pending === 0 && !state.syncing) return null;

  const label = state.syncing
    ? `Syncing ${state.pending} change${state.pending === 1 ? "" : "s"}…`
    : !state.online
      ? state.pending > 0
        ? `Offline · ${state.pending} change${state.pending === 1 ? "" : "s"} saved on device`
        : "Offline · showing saved job data"
      : state.failed > 0
        ? `${state.pending} change${state.pending === 1 ? "" : "s"} waiting · ${state.failed} need retry`
        : `${state.pending} change${state.pending === 1 ? "" : "s"} waiting to sync`;

  return (
    <div className="sticky top-0 z-40 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-black text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <span>{label}</span>

      {state.online && state.pending > 0 && !state.syncing ? (
        <button
          type="button"
          onClick={() => void flushOfflineQueue(token, { force: true })}
          className="ml-3 rounded-lg border border-amber-500 px-2 py-1 transition hover:bg-amber-200 dark:hover:bg-amber-900"
        >
          Retry now
        </button>
      ) : null}

      {state.lastError ? (
        <span className="ml-2 font-semibold opacity-80" title={state.lastError}>
          Last error: {state.lastError}
        </span>
      ) : null}
    </div>
  );
}
