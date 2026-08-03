"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  TechnicianDashboardJob,
  TechnicianDashboardResponse,
} from "@/types/technician";

export default function TechnicianDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(today());
  const [data, setData] =
    useState<TechnicianDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/technician/jobs?date=${encodeURIComponent(selectedDate)}`,
        { cache: "no-store" },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to load jobs.");
      }

      setData(result as TechnicianDashboardResponse);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load jobs.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const jobs = useMemo(
    () =>
      [...(data?.jobs ?? [])].sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime(),
      ),
    [data?.jobs],
  );

  const activeJob = jobs.find((job) =>
    ["travelling", "confirmed", "in_progress"].includes(
      normalise(job.assignmentStatus),
    ),
  );

  const upcomingJobs = jobs.filter(
    (job) =>
      job.assignmentId !== activeJob?.assignmentId &&
      !["completed", "closed", "cancelled"].includes(
        normalise(job.assignmentStatus || job.status),
      ),
  );

  const completedCount = jobs.filter(
    (job) =>
      normalise(job.assignmentStatus) === "completed" ||
      normalise(job.status) === "completed",
  ).length;

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="overflow-hidden rounded-[2rem] border border-emerald-900/20 bg-gradient-to-br from-[#0b4b38] via-[#0d5a43] to-[#103d2e] p-5 text-white shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
            AgriCore Technician
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {data?.technician.fullName
              ? `Good ${dayPart()}, ${firstName(data.technician.fullName)}`
              : "My workday"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100">
            Your jobs, travel, labour and completion steps in one place.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <HeroStat label="Jobs" value={jobs.length} />
            <HeroStat label="Active" value={activeJob ? 1 : 0} />
            <HeroStat label="Done" value={completedCount} />
          </div>
        </header>

        <section className="mt-4 rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Work date
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-2 min-h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadJobs()}
              className="min-h-14 rounded-xl border border-slate-300 bg-white px-6 text-base font-black text-slate-900 transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 rounded-2xl border border-white/50 bg-white/85 p-10 text-center font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Loading your jobs…
          </div>
        ) : null}

        {!loading && jobs.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">
              No jobs scheduled
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              There are no assignments for this date.
            </p>
          </div>
        ) : null}

        {!loading && activeJob ? (
          <section className="mt-5">
            <SectionLabel>Current job</SectionLabel>
            <ActiveJobCard job={activeJob} />
          </section>
        ) : null}

        {!loading && !activeJob && upcomingJobs[0] ? (
          <section className="mt-5">
            <SectionLabel>Next job</SectionLabel>
            <ActiveJobCard job={upcomingJobs[0]} />
          </section>
        ) : null}

        {!loading && upcomingJobs.length > (activeJob ? 0 : 1) ? (
          <section className="mt-6 space-y-3">
            <SectionLabel>Later today</SectionLabel>
            {upcomingJobs
              .slice(activeJob ? 0 : 1)
              .map((job) => (
                <CompactJobCard key={job.assignmentId} job={job} />
              ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function ActiveJobCard({ job }: { job: TechnicianDashboardJob }) {
  const status = normalise(job.assignmentStatus);
  const actionLabel =
    status === "travelling"
      ? "Record arrival"
      : status === "confirmed"
        ? "Start work"
        : status === "in_progress"
          ? "Continue job"
          : "Open job";

  return (
    <article className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-white shadow-xl dark:border-emerald-900 dark:bg-slate-900">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              {job.jobNumber}
            </p>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-white">
              {job.customer?.name ?? "Customer not recorded"}
            </h2>
            <p className="mt-1 text-base font-bold text-slate-600 dark:text-slate-300">
              {job.machine?.displayName ?? "Machine not recorded"}
            </p>
          </div>
          <StatusBadge value={job.assignmentStatus} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoTile label="Scheduled" value={formatRange(job.scheduledStart, job.scheduledEnd)} />
          <InfoTile label="Priority" value={formatValue(job.priority || "normal")} />
        </div>

        <div className="mt-3 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Reported fault
          </p>
          <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">
            {job.faultReported || "No fault description recorded."}
          </p>
        </div>

        {job.customer?.phone ? (
          <a
            href={`tel:${job.customer.phone}`}
            className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            Call customer
          </a>
        ) : null}
      </div>

      <Link
        href={`/technician/jobs/${job.jobId}`}
        className="flex min-h-16 items-center justify-center bg-[#0c4a3a] px-5 text-lg font-black text-white transition hover:bg-[#083c2f]"
      >
        {actionLabel}
      </Link>
    </article>
  );
}

function CompactJobCard({ job }: { job: TechnicianDashboardJob }) {
  return (
    <Link
      href={`/technician/jobs/${job.jobId}`}
      className="block rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm backdrop-blur-xl transition hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {formatTime(job.scheduledStart)} · {job.jobNumber}
          </p>
          <h3 className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">
            {job.customer?.name ?? "Customer not recorded"}
          </h3>
          <p className="mt-1 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
            {job.machine?.displayName ?? "Machine not recorded"}
          </p>
        </div>
        <StatusBadge value={job.assignmentStatus} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
        {job.faultReported || "No fault description recorded."}
      </p>
    </Link>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-emerald-100">
        {label}
      </p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const status = normalise(value);
  const classes =
    status === "in_progress"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
      : status === "travelling"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : status === "completed"
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";

  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${classes}`}>
      {formatValue(value || "assigned")}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
      {children}
    </p>
  );
}

function formatRange(startValue: string, endValue: string) {
  return `${formatTime(startValue)}–${formatTime(endValue)}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function formatValue(value: string) {
  return normalise(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayPart() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value;
}
