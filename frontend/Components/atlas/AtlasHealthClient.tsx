"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Database, Play, RefreshCw } from "lucide-react";

type Health = {
  queue: { queued: number; running: number; completed: number; failed: number };
  recentRuns: Array<{ id: string; status: string; started_at: string; completed_at: string | null; tasks_processed: number; tasks_failed: number; companies_processed: number; last_error: string | null }>;
  snapshot: { generated_at: string; updated_at: string } | null;
  recentEvents: Array<{ id: string; processed_at: string | null; processing_error: string | null; occurred_at: string }>;
  eventCount: number;
  contextCacheCount: number;
  cronConfigured: boolean;
};

export default function AtlasHealthClient() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/atlas/health", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load Atlas health.");
      setHealth(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Atlas health.");
    } finally {
      setLoading(false);
    }
  }

  async function runWorker() {
    setRunning(true);
    setError("");
    try {
      const response = await fetch("/api/atlas/worker", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to run Atlas worker.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to run Atlas worker.");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading && !health) return <div className="rounded-2xl border border-slate-200 bg-white p-6 font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950">Loading Atlas health…</div>;

  return <div className="space-y-6">
    {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div> : null}

    <div className="flex flex-wrap gap-2">
      <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black dark:border-slate-700 dark:bg-slate-900"><RefreshCw className="h-4 w-4"/>Refresh</button>
      <button disabled={running} onClick={() => void runWorker()} className="inline-flex items-center gap-2 rounded-xl bg-[#103d2e] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"><Play className="h-4 w-4"/>{running ? "Processing…" : "Run Atlas now"}</button>
    </div>

    {health ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<Clock3/>} label="Queued" value={health.queue.queued} />
        <Metric icon={<Activity/>} label="Running" value={health.queue.running} />
        <Metric icon={<AlertTriangle/>} label="Failed" value={health.queue.failed} danger={health.queue.failed > 0} />
        <Metric icon={<Database/>} label="Events captured" value={health.eventCount} />
        <Metric icon={<CheckCircle2/>} label="AI contexts cached" value={health.contextCacheCount} />
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Background status">
          <Row label="Scheduled worker" value={health.cronConfigured ? "Configured" : "CRON_SECRET missing"} warn={!health.cronConfigured}/>
          <Row label="Latest intelligence snapshot" value={health.snapshot?.generated_at ? new Date(health.snapshot.generated_at).toLocaleString() : "Not generated yet"}/>
          <Row label="Completed queue tasks" value={String(health.queue.completed)}/>
          <Row label="Recent failed tasks" value={String(health.queue.failed)} warn={health.queue.failed > 0}/>
        </Panel>

        <Panel title="Recent processing runs">
          {health.recentRuns.length ? health.recentRuns.map((run) => <div key={run.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="flex items-center justify-between gap-3"><span className="font-black capitalize text-slate-950 dark:text-white">{run.status.replaceAll("_", " ")}</span><span className="text-xs font-semibold text-slate-500">{new Date(run.started_at).toLocaleString()}</span></div><p className="mt-1 text-xs font-semibold text-slate-500">{run.tasks_processed || 0} processed · {run.tasks_failed || 0} failed · {run.companies_processed || 0} companies</p>{run.last_error ? <p className="mt-2 text-xs font-bold text-rose-700 dark:text-rose-300">{run.last_error}</p> : null}</div>) : <p className="text-sm font-semibold text-slate-500">No Atlas runs recorded yet.</p>}
        </Panel>
      </section>
    </> : null}
  </div>;
}

function Metric({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value: number; danger?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className={danger ? "text-rose-600" : "text-emerald-700"}>{icon}</div><p className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{label}</p></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h2 className="font-black text-slate-950 dark:text-white">{title}</h2><div className="mt-4 space-y-3">{children}</div></section>; }
function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) { return <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><span className={`text-right text-sm font-black ${warn ? "text-amber-700 dark:text-amber-300" : "text-slate-950 dark:text-white"}`}>{value}</span></div>; }
