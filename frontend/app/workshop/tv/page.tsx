"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Clock3, PackageSearch, Users, Wrench, X } from "lucide-react";

type Payload = {
  date: string;
  settings: { tvRefreshSeconds: number };
  technicians: Array<{
    userId: string;
    fullName: string;
    scheduledHours: number;
    capacityHours: number;
    loadPercent: number;
    assignments: Array<{
      id: string;
      jobNumber: string;
      customerName: string;
      machine: string;
      scheduledStart: string;
      scheduledEnd: string;
      status: string;
    }>;
  }>;
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

export default function WorkshopTvPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const params = new URLSearchParams(window.location.search);
        const date = params.get("date") || "";
        const response = await fetch(`/api/workshop/overview${date ? `?date=${date}` : ""}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as Payload;
        if (!response.ok) throw new Error(body.error || "Unable to load workshop screen.");
        if (!cancelled) {
          setData(body);
          setError("");
          timer = setTimeout(load, Math.max(10, body.settings?.tvRefreshSeconds ?? 30) * 1000);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load workshop screen.");
          timer = setTimeout(load, 30_000);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-[#071d18] text-white">
      <div className="mx-auto max-w-[1900px] p-5 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              AgriCore · Live Workshop
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">
              Workshop status {data?.date ? `· ${data.date}` : ""}
            </h1>
            <p className="mt-2 text-sm font-semibold text-emerald-100/70">
              Auto-refreshing operations screen.
            </p>
          </div>
          <Link href="/workshop" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-black">
            <X className="h-4 w-4" />
            Exit
          </Link>
        </header>

        {error ? <div className="mt-6 rounded-2xl bg-red-500/15 p-4 font-bold text-red-100">{error}</div> : null}

        {data ? (
          <>
            <section className="mt-7 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <TvMetric icon={Wrench} label="Open jobs" value={data.stats.openJobs} />
              <TvMetric icon={AlertTriangle} label="Urgent" value={data.stats.urgentJobs} />
              <TvMetric icon={PackageSearch} label="Waiting parts" value={data.stats.waitingParts} />
              <TvMetric icon={Clock3} label="In progress" value={data.stats.inProgress} />
              <TvMetric icon={Users} label="Load" value={`${data.stats.workshopLoadPercent}%`} />
              <TvMetric icon={Wrench} label="Completed" value={data.stats.completedToday} />
            </section>

            <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {data.technicians.map((tech) => (
                <article key={tech.userId} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black">{tech.fullName}</h2>
                      <p className="text-xs font-bold text-emerald-100/60">
                        {tech.scheduledHours} / {tech.capacityHours} hrs
                      </p>
                    </div>
                    <span className={`text-2xl font-black ${tech.loadPercent > 100 ? "text-red-300" : "text-emerald-300"}`}>
                      {tech.loadPercent}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full ${tech.loadPercent > 100 ? "bg-red-400" : "bg-emerald-400"}`}
                      style={{ width: `${Math.min(100, tech.loadPercent)}%` }}
                    />
                  </div>
                  <div className="mt-5 space-y-2">
                    {tech.assignments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm font-bold text-white/35">
                        Available
                      </div>
                    ) : (
                      tech.assignments.map((job) => (
                        <div key={job.id} className="rounded-2xl bg-black/20 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black">{job.jobNumber || "Job"}</p>
                              <p className="mt-1 text-sm font-semibold text-white/70">{job.customerName}</p>
                              <p className="text-xs text-white/45">{job.machine || "Machine not recorded"}</p>
                            </div>
                            <span className="text-xs font-black text-emerald-200">
                              {displayTime(job.scheduledStart)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : (
          <p className="mt-12 text-lg font-black text-white/50">Loading workshop…</p>
        )}
      </div>
    </div>
  );
}

function TvMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <Icon className="h-5 w-5 text-emerald-300" />
      <p className="mt-4 text-4xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-white/50">{label}</p>
    </div>
  );
}

function displayTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
