"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type RecentJob = {
  id: string;
  job: string;
  customer: string;
  machine: string;
  status: string;
  engineer: string;
};

type SupabaseJob = {
  id: string;
  job_number: string | null;
  status: string | null;
  engineer_name: string | null;
  customers:
    | {
        contact_name: string | null;
        business_name: string | null;
      }
    | {
        contact_name: string | null;
        business_name: string | null;
      }[]
    | null;
  machines:
    | {
        make: string | null;
        model: string | null;
      }
    | {
        make: string | null;
        model: string | null;
      }[]
    | null;
};

function getRelatedRecord<T>(
  value: T | T[] | null,
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getStatusClasses(status: string) {
  switch (status) {
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";

    case "waiting_parts":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";

    case "waiting_customer":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";

    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";

    case "cancelled":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    default:
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
  }
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
        status,
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function MobileJobCard({
  job,
}: {
  job: RecentJob;
}) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/70"
    >
      <article className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {job.job}
            </p>

            <h3 className="mt-1 break-words text-base font-bold text-slate-900 dark:text-slate-100">
              {job.customer}
            </h3>

            <p className="mt-1 break-words text-sm font-medium text-slate-700 dark:text-slate-400">
              {job.machine}
            </p>
          </div>

          <StatusBadge status={job.status} />
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Engineer
          </p>

          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
            {job.engineer}
          </p>
        </div>
      </article>
    </Link>
  );
}

export default function RecentJobs() {
  const [recentJobs, setRecentJobs] =
    useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadRecentJobs = useCallback(async () => {
    setErrorMessage("");

    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        status,
        engineer_name,
        customers (
          contact_name,
          business_name
        ),
        machines (
          make,
          model
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(6);

    if (error) {
      console.error(
        "Unable to load recent jobs:",
        error,
      );
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const formattedJobs = (
      (data ?? []) as SupabaseJob[]
    ).map((job) => {
      const customer = getRelatedRecord(
        job.customers,
      );
      const machine = getRelatedRecord(
        job.machines,
      );

      return {
        id: job.id,
        job: job.job_number ?? "No job number",
        customer:
          customer?.business_name ||
          customer?.contact_name ||
          "Unknown customer",
        machine:
          [machine?.make, machine?.model]
            .filter(Boolean)
            .join(" ") || "No machine",
        status: job.status ?? "open",
        engineer:
          job.engineer_name ?? "Unassigned",
      };
    });

    setRecentJobs(formattedJobs);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRecentJobs();

    const channel = supabase
      .channel("dashboard-recent-jobs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        () => {
          void loadRecentJobs();
        },
      )
      .subscribe();

    const fallbackRefresh = window.setInterval(
      () => {
        void loadRecentJobs();
      },
      60_000,
    );

    return () => {
      window.clearInterval(fallbackRefresh);
      void supabase.removeChannel(channel);
    };
  }, [loadRecentJobs]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5 dark:border-slate-800">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Job activity
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            Recent jobs
          </h2>

          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Latest workshop and field-service
            activity
          </p>
        </div>

        <Link
          href="/jobs"
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          View all
        </Link>
      </header>

      {loading ? (
        <div className="p-8 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
          Loading recent jobs...
        </div>
      ) : errorMessage ? (
        <div className="p-5">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Unable to load recent jobs.
            </p>

            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadRecentJobs()
              }
              className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
            >
              Try again
            </button>
          </div>
        </div>
      ) : recentJobs.length === 0 ? (
        <div className="p-8 text-center">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            No recent jobs
          </p>

          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            New workshop and field-service jobs
            will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-200 lg:hidden dark:divide-slate-800">
            {recentJobs.map((job) => (
              <MobileJobCard
                key={job.id}
                job={job}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-700 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-bold">
                    Job
                  </th>
                  <th className="px-5 py-3 font-bold">
                    Customer
                  </th>
                  <th className="px-5 py-3 font-bold">
                    Machine
                  </th>
                  <th className="px-5 py-3 font-bold">
                    Status
                  </th>
                  <th className="px-5 py-3 font-bold">
                    Engineer
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
                {recentJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/70"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {job.job}
                      </Link>
                    </td>

                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">
                      {job.customer}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-400">
                      {job.machine}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={job.status}
                      />
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">
                      {job.engineer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}