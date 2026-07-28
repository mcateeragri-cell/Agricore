"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  TechnicianDashboardJob,
  TechnicianDashboardResponse,
} from "@/types/technician";

export default function TechnicianDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(today());
  const [data, setData] = useState<TechnicianDashboardResponse | null>(null);
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

  const summary = useMemo(() => {
    const jobs = data?.jobs ?? [];
    return {
      total: jobs.length,
      active: jobs.filter((job) =>
        ["travelling", "confirmed", "in_progress"].includes(
          normalise(job.assignmentStatus),
        ),
      ).length,
      completed: jobs.filter(
        (job) =>
          normalise(job.assignmentStatus) === "completed" ||
          normalise(job.status) === "completed",
      ).length,
    };
  }, [data?.jobs]);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <header className="rounded-3xl bg-[#103d2e] p-6 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
            AgriCore technician
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            {data?.technician.fullName
              ? `${data.technician.fullName}'s jobs`
              : "My jobs"}
          </h1>
          <p className="mt-2 text-sm text-emerald-100">
            View today&apos;s work, record labour and complete job cards.
          </p>
        </header>

        <section className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Jobs" value={summary.total} />
          <Stat label="Active" value={summary.active} />
          <Stat label="Done" value={summary.completed} />
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-end gap-3">
            <label className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Schedule date
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-sm font-semibold"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadJobs()}
              className="min-h-12 rounded-xl bg-[#103d2e] px-5 text-sm font-bold text-white"
            >
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mt-4 space-y-3">
          {loading ? (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
              Loading jobs…
            </div>
          ) : null}

          {!loading && (data?.jobs.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="font-bold text-slate-900">No jobs scheduled</h2>
              <p className="mt-2 text-sm text-slate-500">
                There are no active assignments for this date.
              </p>
            </div>
          ) : null}

          {(data?.jobs ?? []).map((job) => (
            <JobCard key={job.assignmentId} job={job} />
          ))}
        </section>
      </div>
    </main>
  );
}

function JobCard({ job }: { job: TechnicianDashboardJob }) {
  return (
    <Link
      href={`/technician/jobs/${job.jobId}`}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {job.jobNumber}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">
            {job.customer?.name ?? "Customer not recorded"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {job.machine?.displayName ?? "Machine not recorded"}
          </p>
        </div>
        <StatusBadge value={job.assignmentStatus} />
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Scheduled
        </p>
        <p className="mt-1 text-sm font-bold text-slate-800">
          {formatRange(job.scheduledStart, job.scheduledEnd)}
        </p>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
        {job.faultReported || "No reported fault has been recorded."}
      </p>
    </Link>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      {formatValue(value)}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </article>
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