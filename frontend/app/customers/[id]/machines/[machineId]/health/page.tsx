"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type MachineRow = {
  id: string;
  make: string | null;
  model: string | null;
  hours: number | null;
};

type DiagnosticRow = {
  id: string;
  report_date: string | null;
  created_at: string;
  reported_hours: number | null;
};

type FaultRow = {
  id: string;
  fault_code: string;
  description: string | null;
  status: string;
  severity: string;
  created_at: string;
};

type JobRow = {
  id: string;
  status: string | null;
  job_number: string | null;
  fault_reported: string | null;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function MachineHealthPage() {
  const params = useParams<{
    id: string;
    machineId: string;
  }>();

  const customerId = params.id;
  const machineId = params.machineId;

  const [machine, setMachine] = useState<MachineRow | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticRow[]>([]);
  const [faults, setFaults] = useState<FaultRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadHealth() {
      setLoading(true);
      setErrorMessage("");

      const [
        machineResult,
        diagnosticsResult,
        faultsResult,
        jobsResult,
      ] = await Promise.all([
        supabase
          .from("machines")
          .select("id, make, model, hours")
          .eq("id", machineId)
          .maybeSingle(),
        supabase
          .from("machine_diagnostic_reports")
          .select(
            "id, report_date, created_at, reported_hours",
          )
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),
        supabase
          .from("machine_diagnostic_faults")
          .select(
            "id, fault_code, description, status, severity, created_at",
          )
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select(
            "id, status, job_number, fault_reported, created_at",
          )
          .eq("machine_id", machineId)
          .order("created_at", { ascending: false }),
      ]);

      const firstError =
        machineResult.error ||
        diagnosticsResult.error ||
        faultsResult.error ||
        jobsResult.error;

      if (firstError) {
        console.error(
          "Unable to load machine health:",
          firstError,
        );
        setErrorMessage(firstError.message);
        setLoading(false);
        return;
      }

      setMachine(machineResult.data as MachineRow | null);
      setDiagnostics(
        (diagnosticsResult.data ?? []) as DiagnosticRow[],
      );
      setFaults((faultsResult.data ?? []) as FaultRow[]);
      setJobs((jobsResult.data ?? []) as JobRow[]);
      setLoading(false);
    }

    void loadHealth();
  }, [machineId]);

  const summary = useMemo(() => {
    const activeFaults = faults.filter(
      (fault) => fault.status === "active",
    );

    const historicFaults = faults.filter(
      (fault) => fault.status !== "active",
    );

    const openJobs = jobs.filter((job) => {
      const status = (job.status || "").toLowerCase();
      return ![
        "completed",
        "cancelled",
        "closed",
      ].includes(status);
    });

    const repeatedFaults = Array.from(
      faults.reduce((map, fault) => {
        const current = map.get(fault.fault_code) ?? {
          code: fault.fault_code,
          count: 0,
          description: fault.description,
        };

        current.count += 1;
        map.set(fault.fault_code, current);

        return map;
      }, new Map<string, {
        code: string;
        count: number;
        description: string | null;
      }>()),
    )
      .map(([, value]) => value)
      .filter((fault) => fault.count > 1)
      .sort((a, b) => b.count - a.count);

    return {
      activeFaults,
      historicFaults,
      openJobs,
      repeatedFaults,
      latestDiagnostic: diagnostics[0] ?? null,
    };
  }, [diagnostics, faults, jobs]);

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
          Machine condition
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Machine Health
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Confirmed diagnostic, fault and job information only. No estimated health score is used.
        </p>
      </header>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          Loading machine health...
        </section>
      ) : errorMessage ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {errorMessage}
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HealthCard
              label="Latest confirmed hours"
              value={
                machine?.hours !== null &&
                machine?.hours !== undefined
                  ? `${Number(machine.hours).toLocaleString()} hrs`
                  : "Not recorded"
              }
            />

            <HealthCard
              label="Latest diagnostic"
              value={formatDate(
                summary.latestDiagnostic?.report_date ||
                  summary.latestDiagnostic?.created_at ||
                  null,
              )}
            />

            <HealthCard
              label="Active faults"
              value={String(summary.activeFaults.length)}
            />

            <HealthCard
              label="Open jobs"
              value={String(summary.openJobs.length)}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Current faults
              </h2>

              <div className="mt-4 space-y-3">
                {summary.activeFaults.length > 0 ? (
                  summary.activeFaults.map((fault) => (
                    <div
                      key={fault.id}
                      className="rounded-xl border border-amber-200 bg-amber-50 p-4"
                    >
                      <p className="font-bold text-amber-900">
                        {fault.fault_code}
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        {fault.description ||
                          "No description recorded."}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                        {fault.status} · {fault.severity}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No active diagnostic faults are recorded.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Repeated faults
              </h2>

              <div className="mt-4 space-y-3">
                {summary.repeatedFaults.length > 0 ? (
                  summary.repeatedFaults.map((fault) => (
                    <div
                      key={fault.code}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-slate-950">
                          {fault.code}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                          {fault.count} occurrences
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {fault.description ||
                          "No description recorded."}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No repeated fault codes are recorded.
                  </p>
                )}
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Open work
              </h2>

              <div className="mt-4 space-y-3">
                {summary.openJobs.length > 0 ? (
                  summary.openJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
                    >
                      <p className="font-bold text-slate-950">
                        {job.job_number ||
                          "Unnumbered job"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {job.fault_reported ||
                          "No fault description recorded."}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No open jobs are recorded for this machine.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Recorded observations
              </h2>

              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="rounded-xl border border-slate-200 p-4">
                  {summary.latestDiagnostic
                    ? `The latest diagnostic was recorded on ${formatDate(
                        summary.latestDiagnostic.report_date ||
                          summary.latestDiagnostic.created_at,
                      )}.`
                    : "No diagnostic reports are recorded."}
                </li>

                <li className="rounded-xl border border-slate-200 p-4">
                  {summary.activeFaults.length > 0
                    ? `${summary.activeFaults.length} active fault ${
                        summary.activeFaults.length === 1
                          ? "is"
                          : "are"
                      } recorded.`
                    : "No active diagnostic faults are recorded."}
                </li>

                <li className="rounded-xl border border-slate-200 p-4">
                  {summary.repeatedFaults.length > 0
                    ? `${summary.repeatedFaults.length} fault ${
                        summary.repeatedFaults.length === 1
                          ? "code has"
                          : "codes have"
                      } appeared more than once.`
                    : "No repeated fault codes are recorded."}
                </li>
              </ul>
            </article>
          </section>
        </>
      )}
    </main>
  );
}

function HealthCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-950">
        {value}
      </p>
    </article>
  );
}