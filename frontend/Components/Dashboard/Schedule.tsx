"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type RelatedCustomer = {
  id?: string | null;
  contact_name?: string | null;
  business_name?: string | null;
  address?: string | null;
  postcode?: string | null;
};

type RelatedMachine = {
  id?: string | null;
  make?: string | null;
  model?: string | null;
  registration?: string | null;
  serial_number?: string | null;
};

type RelatedJob = {
  id: string;
  job_number?: string | null;
  status?: string | null;
  priority?: string | null;
  engineer_name?: string | null;
  fault_reported?: string | null;
  opened_date?: string | null;
  customers?: RelatedCustomer | RelatedCustomer[] | null;
  machines?: RelatedMachine | RelatedMachine[] | null;
};

type JobAssignmentRow = {
  id: string;
  job_id: string;
  user_id?: string | null;
  scheduled_start: string;
  scheduled_end?: string | null;
  assignment_status?: string | null;
  notes?: string | null;
  jobs?: RelatedJob | RelatedJob[] | null;
};

type ScheduleItem = {
  id: string;
  jobId: string;
  jobNumber: string;
  time: string;
  title: string;
  customer: string;
  machine: string;
  engineer: string;
  location: string;
  status: string;
};

function firstRelated<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function normaliseStatus(status: string) {
  return status
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getStatusBorder(status: string) {
  switch (normaliseStatus(status)) {
    case "in_progress":
      return "border-blue-500";

    case "parts_required":
    case "waiting_parts":
      return "border-amber-500";

    case "waiting_customer":
      return "border-purple-500";

    case "completed":
      return "border-emerald-500";

    case "cancelled":
      return "border-slate-400";

    default:
      return "border-sky-500";
  }
}

function getStatusBadge(status: string) {
  switch (normaliseStatus(status)) {
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";

    case "parts_required":
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

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatToday() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function getLocalDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0",
  );
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(dateInput: string, days: number) {
  const date = new Date(`${dateInput}T00:00:00`);
  date.setDate(date.getDate() + days);

  return getLocalDateInput(date);
}

function buildCustomerName(
  customer: RelatedCustomer | null,
) {
  return (
    customer?.business_name ||
    customer?.contact_name ||
    "Unknown customer"
  );
}

function buildMachineName(
  machine: RelatedMachine | null,
) {
  return (
    [machine?.make, machine?.model]
      .filter(Boolean)
      .join(" ") || "No machine assigned"
  );
}

function buildLocation(
  customer: RelatedCustomer | null,
) {
  return (
    [customer?.address, customer?.postcode]
      .filter(Boolean)
      .join(", ") || "Location not added"
  );
}

export default function Schedule() {
  const [assignments, setAssignments] = useState<
    JobAssignmentRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadSchedule = useCallback(async () => {
    setErrorMessage("");

    const selectedDate = getLocalDateInput();
    const nextDate = addDays(selectedDate, 1);

    const startOfDay = new Date(
      `${selectedDate}T00:00:00`,
    ).toISOString();

    const startOfNextDay = new Date(
      `${nextDate}T00:00:00`,
    ).toISOString();

    const { data, error } = await supabase
      .from("job_assignments")
      .select(`
        id,
        job_id,
        user_id,
        scheduled_start,
        scheduled_end,
        assignment_status,
        notes,
        jobs (
          id,
          job_number,
          status,
          priority,
          engineer_name,
          fault_reported,
          opened_date,
          customers (
            id,
            contact_name,
            business_name,
            address,
            postcode
          ),
          machines (
            id,
            make,
            model,
            registration,
            serial_number
          )
        )
      `)
      .gte("scheduled_start", startOfDay)
      .lt("scheduled_start", startOfNextDay)
      .order("scheduled_start", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Unable to load today's schedule:",
        error,
      );
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setAssignments(
      (data ?? []) as JobAssignmentRow[],
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSchedule();

    const channel = supabase
      .channel("dashboard-today-schedule")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_assignments",
        },
        () => {
          void loadSchedule();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        () => {
          void loadSchedule();
        },
      )
      .subscribe();

    const fallbackRefresh = window.setInterval(
      () => {
        void loadSchedule();
      },
      60_000,
    );

    return () => {
      window.clearInterval(fallbackRefresh);
      void supabase.removeChannel(channel);
    };
  }, [loadSchedule]);

  const schedule = useMemo<ScheduleItem[]>(() => {
    return assignments.flatMap((assignment) => {
      const job = firstRelated(assignment.jobs);

      if (!job) {
        return [];
      }

      const customer = firstRelated(job.customers);
      const machine = firstRelated(job.machines);

      const status =
        job.status ||
        assignment.assignment_status ||
        "scheduled";

      return [
        {
          id: assignment.id,
          jobId: job.id || assignment.job_id,
          jobNumber:
            job.job_number || "Unnumbered job",
          time: formatTime(
            assignment.scheduled_start,
          ),
          title:
            job.fault_reported ||
            assignment.notes ||
            "Service job",
          customer: buildCustomerName(customer),
          machine: buildMachineName(machine),
          engineer:
            job.engineer_name || "Unassigned",
          location: buildLocation(customer),
          status,
        },
      ];
    });
  }, [assignments]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Dispatch board
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            Today&apos;s schedule
          </h2>

          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            {formatToday()}
          </p>
        </div>

        <Link
          href="/calendar"
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          Calendar
        </Link>
      </header>

      {loading ? (
        <div className="space-y-4 p-5">
          {Array.from({ length: 3 }).map(
            (_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-3 h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-2 h-3 w-36 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ),
          )}
        </div>
      ) : errorMessage ? (
        <div className="p-5">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <p className="font-bold text-red-700 dark:text-red-300">
              Unable to load today&apos;s schedule
            </p>

            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void loadSchedule()}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
            >
              Try again
            </button>
          </div>
        </div>
      ) : schedule.length === 0 ? (
        <div className="p-8 text-center">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            No jobs scheduled today
          </p>

          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            Jobs assigned for today will appear here automatically.
          </p>

          <Link
            href="/jobs/new"
            className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Create job
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {schedule.map((item) => (
            <Link
              key={item.id}
              href={`/jobs/${item.jobId}`}
              className="block transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
            >
              <article className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 shrink-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.time}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {item.jobNumber}
                    </p>
                  </div>

                  <div
                    className={`min-w-0 flex-1 border-l-4 ${getStatusBorder(
                      item.status,
                    )} pl-4`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h3>

                        <p className="mt-1 break-words text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {item.customer}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadge(
                          item.status,
                        )}`}
                      >
                        {formatStatus(item.status)}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="font-bold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                          Machine
                        </dt>
                        <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-300">
                          {item.machine}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-bold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                          Engineer
                        </dt>
                        <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-300">
                          {item.engineer}
                        </dd>
                      </div>

                      <div className="sm:col-span-2">
                        <dt className="font-bold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                          Location
                        </dt>
                        <dd className="mt-0.5 break-words font-medium text-slate-700 dark:text-slate-300">
                          {item.location}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}