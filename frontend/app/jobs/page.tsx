"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  jobNumber: string;
  status: string;
  priority: string;
  faultReported: string;
  openedDate: string;
  engineerName: string;
  customerName: string;
  machineName: string;
  registration: string;
};

type SupabaseJob = {
  id: string;
  job_number: string | null;
  status: string | null;
  priority: string | null;
  fault_reported: string | null;
  opened_date: string | null;
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
        registration: string | null;
      }
    | {
        make: string | null;
        model: string | null;
        registration: string | null;
      }[]
    | null;
};

type StatusFilter =
  | "all"
  | "open"
  | "in_progress"
  | "waiting_parts"
  | "waiting_customer"
  | "completed"
  | "cancelled";

type PriorityFilter =
  | "all"
  | "urgent"
  | "high"
  | "normal"
  | "low";

function getRelatedRecord<T>(
  value: T | T[] | null,
): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getStatusClasses(status: string) {
  switch (status) {
    case "open":
      return "bg-sky-50 text-sky-700 ring-sky-200";

    case "in_progress":
      return "bg-amber-50 text-amber-800 ring-amber-200";

    case "waiting_parts":
      return "bg-orange-50 text-orange-700 ring-orange-200";

    case "waiting_customer":
      return "bg-violet-50 text-violet-700 ring-violet-200";

    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "cancelled":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function getPriorityClasses(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-50 text-red-700 ring-red-200";

    case "high":
      return "bg-orange-50 text-orange-700 ring-orange-200";

    case "low":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    default:
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("all");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        status,
        priority,
        fault_reported,
        opened_date,
        engineer_name,
        customers (
          contact_name,
          business_name
        ),
        machines (
          make,
          model,
          registration
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Failed to load jobs:",
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

      const customerName =
        customer?.business_name ||
        customer?.contact_name ||
        "Unknown customer";

      const machineName =
        [machine?.make, machine?.model]
          .filter(Boolean)
          .join(" ") || "No machine";

      return {
        id: job.id,
        jobNumber:
          job.job_number ?? "No job number",
        status: job.status ?? "open",
        priority: job.priority ?? "normal",
        faultReported:
          job.fault_reported ??
          "No fault description entered.",
        openedDate: job.opened_date ?? "",
        engineerName:
          job.engineer_name ??
          "Engineer not assigned",
        customerName,
        machineName,
        registration:
          machine?.registration ?? "",
      };
    });

    setJobs(formattedJobs);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const openJobs = useMemo(
    () =>
      jobs.filter((job) =>
        [
          "open",
          "in_progress",
          "waiting_parts",
          "waiting_customer",
        ].includes(job.status),
      ).length,
    [jobs],
  );

  const activeJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.status === "in_progress",
      ).length,
    [jobs],
  );

  const completedJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.status === "completed",
      ).length,
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !query ||
        [
          job.jobNumber,
          job.customerName,
          job.machineName,
          job.registration,
          job.engineerName,
          job.faultReported,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        job.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        job.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    jobs,
    priorityFilter,
    searchTerm,
    statusFilter,
  ]);

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
  }

  const filtersAreActive =
    searchTerm.trim() !== "" ||
    statusFilter !== "all" ||
    priorityFilter !== "all";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 lg:px-8 lg:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#103d2e] ring-1 ring-emerald-100">
                <WrenchIcon />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Workshop control
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Jobs
                </h1>

                <p className="mt-1 text-sm text-slate-500 sm:text-base">
                  Manage workshop jobs and
                  field-service work from one place.
                </p>
              </div>
            </div>

            <Link
              href="/jobs/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#103d2e] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0c3024]"
            >
              <PlusIcon />
              New Job
            </Link>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="All jobs"
            value={jobs.length}
            description="Total job cards"
            icon={<ClipboardIcon />}
          />

          <MetricCard
            label="Open jobs"
            value={openJobs}
            description="Still requiring action"
            icon={<ClockIcon />}
          />

          <MetricCard
            label="In progress"
            value={activeJobs}
            description="Currently being worked on"
            icon={<SpannerIcon />}
          />

          <MetricCard
            label="Completed"
            value={completedJobs}
            description="Finished job cards"
            icon={<CheckIcon />}
          />
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <div className="relative">
              <SearchIcon />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                placeholder="Search job number, customer, machine, registration or engineer"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">
                All statuses
              </option>
              <option value="open">Open</option>
              <option value="in_progress">
                In progress
              </option>
              <option value="waiting_parts">
                Waiting parts
              </option>
              <option value="waiting_customer">
                Waiting customer
              </option>
              <option value="completed">
                Completed
              </option>
              <option value="cancelled">
                Cancelled
              </option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target
                    .value as PriorityFilter,
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">
                All priorities
              </option>
              <option value="urgent">
                Urgent
              </option>
              <option value="high">High</option>
              <option value="normal">
                Normal
              </option>
              <option value="low">Low</option>
            </select>

            <button
              type="button"
              onClick={
                filtersAreActive
                  ? clearFilters
                  : () => void loadJobs()
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {filtersAreActive
                ? "Clear filters"
                : "Refresh"}
            </button>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Recent Jobs
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredJobs.length}{" "}
                {filteredJobs.length === 1
                  ? "job"
                  : "jobs"}{" "}
                shown
              </p>
            </div>

            <Link
              href="/dispatch"
              className="text-sm font-bold text-[#103d2e] hover:underline"
            >
              Open Dispatch Board
            </Link>
          </div>

          {loading ? (
            <div className="px-6 py-20 text-center text-slate-500">
              Loading jobs...
            </div>
          ) : errorMessage ? (
            <div className="px-6 py-12">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <p className="font-semibold text-red-800">
                  Unable to load jobs
                </p>

                <p className="mt-2 text-sm text-red-700">
                  {errorMessage}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void loadJobs()
                  }
                  className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#103d2e]">
                <ClipboardIcon />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                No jobs yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Create your first job card to
                begin recording workshop work.
              </p>

              <Link
                href="/jobs/new"
                className="mt-5 inline-flex rounded-xl bg-[#103d2e] px-5 py-3 text-sm font-semibold text-white"
              >
                Create Job
              </Link>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <h3 className="text-lg font-semibold text-slate-950">
                No matching jobs
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Try changing or clearing the
                current filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3 bg-slate-50 p-3 sm:p-4">
              {filteredJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-950">
                          {job.jobNumber}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusClasses(
                            job.status,
                          )}`}
                        >
                          {formatLabel(job.status)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getPriorityClasses(
                            job.priority,
                          )}`}
                        >
                          {formatLabel(
                            job.priority,
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <DetailItem
                          label="Machine"
                          value={job.machineName}
                        />

                        <DetailItem
                          label="Customer"
                          value={job.customerName}
                        />

                        <DetailItem
                          label="Registration"
                          value={
                            job.registration ||
                            "Not recorded"
                          }
                        />
                      </div>

                      <p className="mt-4 line-clamp-2 max-w-4xl text-sm leading-6 text-slate-600">
                        {job.faultReported}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-5 border-t border-slate-100 pt-4 lg:min-w-[250px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                      <div className="text-sm text-slate-500">
                        <p className="font-semibold text-slate-700">
                          {job.openedDate
                            ? new Date(
                                job.openedDate,
                              ).toLocaleDateString(
                                "en-GB",
                              )
                            : "Date unknown"}
                        </p>

                        <p className="mt-1">
                          {job.engineerName}
                        </p>
                      </div>

                      <span className="text-2xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#103d2e]">
                        ›
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#103d2e]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function WrenchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M14.7 6.3a4 4 0 0 0-5 5L3 18v3h3l6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-3-3 2.4-2.4Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 4.5h6M9 9h6M9 13h6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SpannerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M4 20 14.5 9.5" />
      <path d="M14 5a4 4 0 0 1 5 5l-3-1-2 2 1 3a4 4 0 0 1-5-5Z" />
      <path d="M5 17l2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}