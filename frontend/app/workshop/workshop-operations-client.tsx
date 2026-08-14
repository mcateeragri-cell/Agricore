"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import WorkshopJobControls from "@/Components/workshop/WorkshopJobControls";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  MonitorPlay,
  PackageSearch,
  RefreshCw,
  Users,
  Wrench,
} from "lucide-react";

type Assignment = {
  id: string;
  jobId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  jobNumber: string;
  priority: string;
  customerName: string;
  machine: string;
};

type Technician = {
  userId: string;
  fullName: string;
  jobTitle: string;
  scheduledHours: number;
  capacityHours: number;
  loadPercent: number;
  assignments: Assignment[];
};

type Job = {
  id: string;
  jobNumber: string;
  status: string;
  priority: string;
  engineerName: string;
  faultReported: string;
  customerName: string;
  machine: string;
  registration: string;
  scheduled: boolean;
  workflowStage?: { id: string; name: string; slug: string; position: number; statusMapping: string; colour: string; isTerminal: boolean; gateType?: string; gateRequired?: boolean; enteredAt?: string | null } | null;
};

type Payload = {
  date: string;
  settings: {
    workdayHours: number;
    overloadPercent: number;
    tvRefreshSeconds: number;
  };
  workflow?: { id: string; name: string; slug: string; stages: Array<{ id: string; name: string; slug: string; position: number; statusMapping: string; colour: string; isTerminal: boolean; gateType?: string; gateRequired?: boolean }> } | null;
  technicians: Technician[];
  jobs: Job[];
  stats: {
    openJobs: number;
    urgentJobs: number;
    waitingParts: number;
    inProgress: number;
    readyForReview: number;
    completedToday: number;
    workshopLoadPercent: number;
  };
  error?: string;
};

const closed = new Set(["completed", "closed", "cancelled", "invoiced"]);

function norm(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function today() {
  const now = new Date();
  const adjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
}

function time(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function WorkshopOperationsClient() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);
  const [dragged, setDragged] = useState<Assignment | null>(null);
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [stageMoving, setStageMoving] = useState<string | null>(null);
  const [controlsJob, setControlsJob] = useState<Job | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/workshop/overview?date=${date}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as Payload;
      if (!response.ok) throw new Error(body.error || "Unable to load workshop.");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load workshop.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moveAssignment(assignment: Assignment, technician: Technician) {
    if (moving || technician.assignments.some((row) => row.id === assignment.id)) return;
    setMoving(assignment.id);
    setError("");
    try {
      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: assignment.jobId,
          userId: technician.userId,
          scheduledStart: assignment.scheduledStart,
          scheduledEnd: assignment.scheduledEnd,
          notes: "Moved from Workshop Operations",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to move job.");
      await load(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to move job.");
    } finally {
      setMoving(null);
      setDragged(null);
    }
  }

  async function moveJobStage(job: Job, stageId: string) {
    if (stageMoving) return;
    setStageMoving(job.id); setError("");
    try {
      const response = await fetch("/api/workshop/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: job.id, stageId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to move workflow stage.");
      await load(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to move workflow stage."); }
    finally { setStageMoving(null); setDraggedJob(null); }
  }

  const workflow = useMemo(() => {
    const jobs = data?.jobs ?? [];
    return {
      urgent: jobs.filter(
        (job) =>
          !closed.has(norm(job.status)) &&
          ["urgent", "critical", "emergency", "high"].includes(norm(job.priority)),
      ),
      waiting: jobs.filter((job) =>
        ["waiting_parts", "awaiting_parts", "parts_required"].includes(norm(job.status)),
      ),
      working: jobs.filter((job) =>
        ["in_progress", "working", "on_site", "travelling"].includes(norm(job.status)),
      ),
      unscheduled: jobs.filter(
        (job) => !job.scheduled && !closed.has(norm(job.status)),
      ),
    };
  }, [data]);

  if (loading && !data) {
    return <div className="p-8 text-sm font-bold text-slate-500">Loading workshop…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm dark:border-emerald-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
              Workshop Operations
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Control the workshop from one screen.
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              Technician loading, urgent work, waiting parts and live job movement use the same Dispatch,
              Calendar and Technician data already running AgriCore.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black dark:border-slate-700 dark:bg-slate-900"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link href="/dispatch" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black dark:border-slate-700">
              Open Dispatch
            </Link>
            <Link
              href={`/workshop/tv?date=${date}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#103D2E] px-4 py-2.5 text-sm font-black text-white"
            >
              <MonitorPlay className="h-4 w-4" />
              Live screen
            </Link>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Metric icon={Wrench} label="Open jobs" value={data.stats.openJobs} />
            <Metric icon={AlertTriangle} label="Urgent" value={data.stats.urgentJobs} />
            <Metric icon={PackageSearch} label="Waiting parts" value={data.stats.waitingParts} />
            <Metric icon={Clock3} label="In progress" value={data.stats.inProgress} />
            <Metric icon={ClipboardCheck} label="Awaiting review" value={data.stats.readyForReview} />
            <Metric
              icon={Users}
              label="Workshop load"
              value={`${data.stats.workshopLoadPercent}%`}
              accent={data.stats.workshopLoadPercent > data.settings.overloadPercent}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Technician loading</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Today&apos;s workshop capacity</h2>
              </div>
              <p className="text-xs font-bold text-slate-500">Drag a scheduled card between technicians to reassign it.</p>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {data.technicians.map((tech) => (
                <div
                  key={tech.userId}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragged) void moveAssignment(dragged, tech);
                  }}
                  className={`rounded-2xl border p-4 transition ${
                    dragged
                      ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950 dark:text-white">{tech.fullName}</p>
                      <p className="text-xs font-semibold text-slate-500">{tech.jobTitle || "Engineer"}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black ${tech.loadPercent > data.settings.overloadPercent ? "text-red-600" : "text-emerald-700"}`}>
                        {tech.loadPercent}%
                      </p>
                      <p className="text-[11px] font-bold text-slate-500">
                        {tech.scheduledHours} / {tech.capacityHours} hrs
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${tech.loadPercent > data.settings.overloadPercent ? "bg-red-500" : "bg-emerald-600"}`}
                      style={{ width: `${Math.min(100, tech.loadPercent)}%` }}
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    {tech.assignments.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs font-bold text-slate-400 dark:border-slate-800">
                        Available capacity
                      </p>
                    ) : (
                      tech.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          draggable={!moving}
                          onDragStart={() => setDragged(assignment)}
                          onDragEnd={() => setDragged(null)}
                          className="cursor-grab rounded-xl border border-slate-200 bg-slate-50 p-3 active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-950 dark:text-white">
                                {assignment.jobNumber || "Job"}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {assignment.customerName}
                              </p>
                              <p className="text-xs text-slate-500">{assignment.machine || "Machine not recorded"}</p>
                            </div>
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {time(assignment.scheduledStart)}–{time(assignment.scheduledEnd)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Workflow board</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{data.workflow?.name || "Workshop workflow"}</h2></div>
              <Link href="/settings/workshop" className="rounded-xl border px-3 py-2 text-xs font-black">Configure stages</Link>
            </div>
            <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
              {(data.workflow?.stages ?? []).map((stage) => {
                const stageJobs = data.jobs.filter((job) => job.workflowStage?.id === stage.id);
                return <div key={stage.id} onDragOver={(e)=>e.preventDefault()} onDrop={()=>{ if(draggedJob && draggedJob.workflowStage?.id!==stage.id) void moveJobStage(draggedJob, stage.id); }} className={`min-w-[285px] flex-1 rounded-2xl border p-4 transition ${draggedJob ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800"}`}>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{backgroundColor:stage.colour}}/><div><h3 className="font-black">{stage.name}</h3>{stage.gateRequired && stage.gateType && stage.gateType!=="none"?<p className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Controlled stage</p>:null}</div><span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black dark:bg-slate-800">{stageJobs.length}</span></div>
                  <div className="mt-4 space-y-2">{stageJobs.length===0?<p className="rounded-xl border border-dashed p-5 text-center text-xs font-bold text-slate-400">Drop a job here</p>:stageJobs.slice(0,20).map((job)=><div key={job.id} draggable={!stageMoving} onDragStart={()=>setDraggedJob(job)} onDragEnd={()=>setDraggedJob(null)} className="cursor-grab rounded-xl border border-slate-200 bg-slate-50 p-3 active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900"><Link href={`/jobs/${job.id}`} className="block"><p className="text-sm font-black">{job.jobNumber || "Job"}</p><p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{job.customerName}</p><p className="text-xs text-slate-500">{job.machine || "Machine not recorded"}</p>{job.faultReported?<p className="mt-2 line-clamp-2 text-xs text-slate-500">{job.faultReported}</p>:null}</Link><button type="button" onClick={()=>setControlsJob(job)} className="mt-3 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-black text-slate-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300">Parts · QC · Approval · Warranty</button></div>)}</div>
                </div>;
              })}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            <Lane title="Urgent / emergency" icon={AlertTriangle} jobs={workflow.urgent} empty="No urgent work." />
            <Lane title="Waiting parts" icon={PackageSearch} jobs={workflow.waiting} empty="No jobs waiting parts." />
            <Lane title="In progress" icon={Wrench} jobs={workflow.working} empty="No live repairs." />
            <Lane title="Unscheduled" icon={CalendarDays} jobs={workflow.unscheduled} empty="Everything is scheduled." />
          </section>
        </>
      ) : null}
      {controlsJob ? <WorkshopJobControls jobId={controlsJob.id} jobLabel={controlsJob.jobNumber || controlsJob.customerName || "Job"} onClose={()=>setControlsJob(null)} onChanged={()=>void load(false)} /> : null}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof Wrench;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Icon className={`h-4 w-4 ${accent ? "text-red-600" : "text-emerald-700"}`} />
      <p className={`mt-3 text-2xl font-black ${accent ? "text-red-600" : "text-slate-950 dark:text-white"}`}>{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function Lane({
  title,
  icon: Icon,
  jobs,
  empty,
}: {
  title: string;
  icon: typeof Wrench;
  jobs: Job[];
  empty: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-700" />
        <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {jobs.length}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {jobs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs font-bold text-slate-400 dark:border-slate-800">
            {empty}
          </p>
        ) : (
          jobs.slice(0, 12).map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="group block rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    {job.jobNumber || "Job"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{job.customerName}</p>
                  <p className="text-xs text-slate-500">{job.machine || "Machine not recorded"}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-emerald-600" />
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
