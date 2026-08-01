"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type TimelineItem = {
  id: string;
  type: "diagnostic" | "fault" | "hours" | "job";
  date: string;
  title: string;
  description: string;
  href?: string;
};

type DiagnosticRow = {
  id: string;
  original_filename: string;
  report_date: string | null;
  created_at: string;
  import_status: string;
  reported_hours: number | null;
};

type FaultRow = {
  id: string;
  fault_code: string;
  description: string | null;
  status: string;
  created_at: string;
  report_id: string;
};

type HoursRow = {
  id: string;
  hours: number;
  reading_date: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
};

type JobRow = {
  id: string;
  job_number: string | null;
  status: string | null;
  fault_reported: string | null;
  opened_date: string | null;
  created_at: string;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function badgeClasses(type: TimelineItem["type"]) {
  switch (type) {
    case "diagnostic":
      return "bg-blue-100 text-blue-800";
    case "fault":
      return "bg-amber-100 text-amber-800";
    case "hours":
      return "bg-emerald-100 text-emerald-800";
    case "job":
      return "bg-slate-100 text-slate-800";
  }
}

export default function MachineTimelinePage() {
  const params = useParams<{
    id: string;
    machineId: string;
  }>();

  const customerId = params.id;
  const machineId = params.machineId;

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [diagnostics, setDiagnostics] = useState<DiagnosticRow[]>([]);
  const [faults, setFaults] = useState<FaultRow[]>([]);
  const [hours, setHours] = useState<HoursRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    async function loadTimeline() {
      setLoading(true);
      setErrorMessage("");

      const [
        diagnosticsResult,
        faultsResult,
        hoursResult,
        jobsResult,
      ] = await Promise.all([
        supabase
          .from("machine_diagnostic_reports")
          .select(
            "id, original_filename, report_date, created_at, import_status, reported_hours",
          )
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),
        supabase
          .from("machine_diagnostic_faults")
          .select(
            "id, fault_code, description, status, created_at, report_id",
          )
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),
        supabase
          .from("machine_hour_readings")
          .select(
            "id, hours, reading_date, source, notes, created_at",
          )
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select(
            "id, job_number, status, fault_reported, opened_date, created_at",
          )
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),
      ]);

      const firstError =
        diagnosticsResult.error ||
        faultsResult.error ||
        hoursResult.error ||
        jobsResult.error;

      if (firstError) {
        console.error(
          "Unable to load machine timeline:",
          firstError,
        );
        setErrorMessage(firstError.message);
        setLoading(false);
        return;
      }

      setDiagnostics(
        (diagnosticsResult.data ?? []) as DiagnosticRow[],
      );
      setFaults((faultsResult.data ?? []) as FaultRow[]);
      setHours((hoursResult.data ?? []) as HoursRow[]);
      setJobs((jobsResult.data ?? []) as JobRow[]);
      setLoading(false);
    }

    void loadTimeline();
  }, [machineId]);

  const items = useMemo<TimelineItem[]>(() => {
    const diagnosticItems = diagnostics.map((report) => ({
      id: `diagnostic-${report.id}`,
      type: "diagnostic" as const,
      date: report.report_date || report.created_at,
      title: "Diagnostic report",
      description: [
        report.original_filename,
        report.reported_hours !== null
          ? `${Number(report.reported_hours).toLocaleString()} hrs`
          : "",
        report.import_status.replaceAll("_", " "),
      ]
        .filter(Boolean)
        .join(" · "),
    }));

    const faultItems = faults.map((fault) => ({
      id: `fault-${fault.id}`,
      type: "fault" as const,
      date: fault.created_at,
      title: `Fault ${fault.fault_code}`,
      description: [
        fault.description || "No description recorded",
        fault.status,
      ]
        .filter(Boolean)
        .join(" · "),
    }));

    const hourItems = hours.map((reading) => ({
      id: `hours-${reading.id}`,
      type: "hours" as const,
      date: reading.reading_date || reading.created_at,
      title: `${Number(reading.hours).toLocaleString()} hrs recorded`,
      description: [
        reading.source
          ? reading.source.replaceAll("_", " ")
          : "",
        reading.notes || "",
      ]
        .filter(Boolean)
        .join(" · "),
    }));

    const jobItems = jobs.map((job) => ({
      id: `job-${job.id}`,
      type: "job" as const,
      date: job.opened_date || job.created_at,
      title: job.job_number
        ? `Job ${job.job_number}`
        : "Workshop job",
      description: [
        job.fault_reported || "No fault description",
        job.status || "",
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/jobs/${job.id}`,
    }));

    return [
      ...diagnosticItems,
      ...faultItems,
      ...hourItems,
      ...jobItems,
    ].sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime(),
    );
  }, [diagnostics, faults, hours, jobs]);

  return (
    <main className="space-y-6 p-6 lg:p-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href={`/customers/${customerId}/machines/${machineId}`}
          className="text-sm font-bold text-[#176b4d] hover:underline"
        >
          ← Back to machine
        </Link>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#176b4d]">
          Machine history
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Timeline
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Jobs, diagnostics, fault codes and hour readings in one chronological view.
        </p>
      </header>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          Loading machine timeline...
        </section>
      ) : errorMessage ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {errorMessage}
        </section>
      ) : items.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="font-bold text-slate-800">
            No machine history yet
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Jobs, diagnostics and hour readings will appear here automatically.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-6">
            {items.map((item, index) => {
              const content = (
                <article className="relative grid gap-4 pl-10 sm:grid-cols-[10rem_1fr]">
                  <div
                    className={`absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${badgeClasses(
                      item.type,
                    )}`}
                  >
                    {index + 1}
                  </div>

                  {index < items.length - 1 && (
                    <div className="absolute left-[13px] top-8 h-[calc(100%+1.5rem)] w-px bg-slate-200" />
                  )}

                  <time className="text-sm font-semibold text-slate-500">
                    {formatDate(item.date)}
                  </time>

                  <div className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-950">
                        {item.title}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClasses(
                          item.type,
                        )}`}
                      >
                        {item.type}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </article>
              );

              return item.href ? (
                <Link key={item.id} href={item.href}>
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}