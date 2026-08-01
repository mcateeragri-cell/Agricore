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
import TravelCard from "@/Components/technician/TravelCard";

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
        throw new Error(
          result?.error ?? "Unable to load jobs.",
        );
      }

      setData(
        result as TechnicianDashboardResponse,
      );
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

  const jobs = data?.jobs ?? [];

  const summary = useMemo(() => {
    return {
      total: jobs.length,
      active: jobs.filter((job) =>
        [
          "travelling",
          "confirmed",
          "in_progress",
        ].includes(
          normalise(job.assignmentStatus),
        ),
      ).length,
      completed: jobs.filter(
        (job) =>
          normalise(job.assignmentStatus) ===
            "completed" ||
          normalise(job.status) === "completed",
      ).length,
    };
  }, [jobs]);

  const nextJob = useMemo(() => {
    return jobs
      .filter(
        (job) =>
          ![
            "completed",
            "closed",
            "cancelled",
          ].includes(
            normalise(
              job.assignmentStatus ||
                job.status,
            ),
          ),
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime(),
      )[0];
  }, [jobs]);

  const otherJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.assignmentId !==
          nextJob?.assignmentId,
      ),
    [jobs, nextJob?.assignmentId],
  );

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c4a3a]/95 p-5 text-white shadow-xl backdrop-blur-xl sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
            AgriCore Technician
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            {data?.technician.fullName
              ? `Good ${dayPart()}, ${firstName(
                  data.technician.fullName,
                )}`
              : "My jobs"}
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100">
            Open your next job, record travel and labour,
            then complete the job card from your phone.
          </p>
        </header>

        <section className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Jobs" value={summary.total} />
          <Stat label="Active" value={summary.active} />
          <Stat label="Done" value={summary.completed} />
        </section>

        <section className="mt-4 rounded-2xl border border-white/50 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Schedule date
              </span>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value,
                  )
                }
                className="mt-2 min-h-14 w-full rounded-xl border border-slate-300 bg-white/90 px-4 text-base font-semibold text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950/80 dark:text-white"
              />
            </label>

            <button
              type="button"
              onClick={() => void loadJobs()}
              className="min-h-14 rounded-xl bg-[#0c4a3a] px-6 text-base font-bold text-white shadow-sm transition hover:bg-[#0a3f31]"
            >
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm font-semibold text-red-700 backdrop-blur dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <section className="mt-4 rounded-2xl border border-white/50 bg-white/80 p-10 text-center text-sm font-semibold text-slate-500 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/75 dark:text-slate-300">
            Loading jobs…
          </section>
        ) : null}

        {!loading && jobs.length === 0 ? (
          <section className="mt-4 rounded-2xl border border-white/50 bg-white/80 p-10 text-center shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/75">
            <h2 className="font-bold text-slate-950 dark:text-white">
              No jobs scheduled
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              There are no active assignments for this date.
            </p>
          </section>
        ) : null}

        {!loading && nextJob ? (
          <section className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
              My next job
            </p>
            <NextJobCard job={nextJob} />
          </section>
        ) : null}

        {!loading && otherJobs.length > 0 ? (
          <section className="mt-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
              Other scheduled jobs
            </p>

            {otherJobs.map((job) => (
              <JobCard
                key={job.assignmentId}
                job={job}
              />
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function NextJobCard({
  job,
}: {
  job: TechnicianDashboardJob;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-emerald-200/80 bg-white/90 shadow-lg backdrop-blur-xl dark:border-emerald-900/70 dark:bg-slate-900/85">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {job.jobNumber}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {job.customer?.name ??
                "Customer not recorded"}
            </h2>

            <p className="mt-1 text-base font-semibold text-slate-600 dark:text-slate-300">
              {job.machine?.displayName ??
                "Machine not recorded"}
            </p>
          </div>

          <StatusBadge
            value={job.assignmentStatus}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoBlock
            label="Scheduled"
            value={formatRange(
              job.scheduledStart,
              job.scheduledEnd,
            )}
          />

          <InfoBlock
            label="Reported fault"
            value={
              job.faultReported ||
              "No fault recorded"
            }
          />
        </div>
      </div>

      <Link
        href={`/technician/jobs/${job.jobId}`}
        className="flex min-h-16 items-center justify-center bg-[#0c4a3a] px-5 text-lg font-bold text-white transition hover:bg-[#0a3f31]"
      >
        Open job
      </Link>
    </article>
  );
}

function JobCard({
  job,
}: {
  job: TechnicianDashboardJob;
}) {
  return (
    <Link
      href={`/technician/jobs/${job.jobId}`}
      className="block rounded-2xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition hover:border-emerald-300 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900/75 dark:hover:border-emerald-800"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {job.jobNumber}
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
            {job.customer?.name ??
              "Customer not recorded"}
          </h2>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {job.machine?.displayName ??
              "Machine not recorded"}
          </p>
        </div>

        <StatusBadge
          value={job.assignmentStatus}
        />
      </div>

      <div className="mt-4 rounded-xl bg-slate-100/80 p-3 dark:bg-slate-800/80">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Scheduled
        </p>

        <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
          {formatRange(
            job.scheduledStart,
            job.scheduledEnd,
          )}
        </p>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
        {job.faultReported ||
          "No reported fault has been recorded."}
      </p>
    </Link>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 line-clamp-3 text-sm font-bold leading-6 text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  value,
}: {
  value: string;
}) {
  return (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200">
      {formatValue(value)}
    </span>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-white/50 bg-white/80 p-4 text-center shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75">
      <p className="text-2xl font-bold text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {label}
      </p>
    </article>
  );
}

function formatRange(
  startValue: string,
  endValue: string,
) {
  return `${formatTime(startValue)}–${formatTime(
    endValue,
  )}`;
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function normalise(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatValue(value: string) {
  return normalise(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0",
  );

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