"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Sidebar from "../../../Components/Sidebar";

import type {
  OfficeReviewApiError,
  OfficeReviewQueueItem,
  OfficeReviewQueueResponse,
  OfficeReviewStatus,
} from "../../../types/office-review";

type QueueFilter = "all" | OfficeReviewStatus;

export default function OfficeCompletionsPage() {
  const [data, setData] =
    useState<OfficeReviewQueueResponse | null>(null);

  const [filter, setFilter] =
    useState<QueueFilter>("submitted");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const loadQueue = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await fetch(
          "/api/office/completions",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result = (await response.json()) as
          | OfficeReviewQueueResponse
          | OfficeReviewApiError;

        if (!response.ok || "error" in result) {
          throw new Error(
            "error" in result
              ? result.error
              : "Unable to load completion queue.",
          );
        }

        setData(result);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load completion queue.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const filteredCompletions = useMemo(() => {
    if (!data) {
      return [];
    }

    if (filter === "all") {
      return data.completions;
    }

    return data.completions.filter((completion) => {
      const status = getQueueItemStatus(completion);

      return status === filter;
    });
  }, [data, filter]);

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />

      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Office workflow
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
                Job completion reviews
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Review technician submissions before jobs
                are released for invoicing.
              </p>

              {data?.reviewer ? (
                <p className="mt-2 text-xs text-slate-500">
                  Signed in as{" "}
                  <span className="font-semibold text-slate-700">
                    {data.reviewer.fullName}
                  </span>{" "}
                  · {formatRole(data.reviewer.role)}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void loadQueue(true)}
              disabled={refreshing || loading}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing…" : "Refresh queue"}
            </button>
          </header>

          {error ? (
            <ErrorPanel
              message={error}
              onRetry={() => void loadQueue()}
            />
          ) : null}

          <section
            aria-label="Completion totals"
            className="mb-6 grid gap-4 sm:grid-cols-3"
          >
            <SummaryCard
              label="Awaiting review"
              value={data?.counts.submitted ?? 0}
              description="Submitted by technicians"
              active={filter === "submitted"}
              onClick={() => setFilter("submitted")}
            />

            <SummaryCard
              label="Approved"
              value={data?.counts.approved ?? 0}
              description="Ready for invoicing"
              active={filter === "approved"}
              onClick={() => setFilter("approved")}
            />

            <SummaryCard
              label="Rejected"
              value={data?.counts.rejected ?? 0}
              description="Returned for correction"
              active={filter === "rejected"}
              onClick={() => setFilter("rejected")}
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Completion queue
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {loading
                    ? "Loading submissions…"
                    : `${filteredCompletions.length} ${pluralise(
                        filteredCompletions.length,
                        "job",
                        "jobs",
                      )}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterButton
                  label="All"
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                />

                <FilterButton
                  label="Awaiting"
                  active={filter === "submitted"}
                  onClick={() => setFilter("submitted")}
                />

                <FilterButton
                  label="Approved"
                  active={filter === "approved"}
                  onClick={() => setFilter("approved")}
                />

                <FilterButton
                  label="Rejected"
                  active={filter === "rejected"}
                  onClick={() => setFilter("rejected")}
                />
              </div>
            </div>

            {loading ? (
              <QueueSkeleton />
            ) : filteredCompletions.length === 0 ? (
              <EmptyQueue filter={filter} />
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredCompletions.map((completion) => (
                  <CompletionRow
                    key={completion.completionId}
                    completion={completion}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  active,
  onClick,
}: {
  label: string;
  value: number;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border p-5 text-left shadow-sm transition",
        active
          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
          : "border-slate-200 bg-white hover:border-emerald-300",
      ].join(" ")}
    >
      <p className="text-sm font-semibold text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </button>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-emerald-700 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function CompletionRow({
  completion,
}: {
  completion: OfficeReviewQueueItem;
}) {
  const status = getQueueItemStatus(completion);

  return (
    <article className="px-4 py-5 transition hover:bg-slate-50 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/office/completions/${completion.completionId}`}
              className="text-base font-bold text-slate-950 transition hover:text-emerald-700"
            >
              Job {completion.jobNumber}
            </Link>

            <StatusBadge status={status} />

            <PriorityBadge
              priority={completion.priority}
            />

            {completion.invoiceStatus ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Invoice:{" "}
                {formatText(completion.invoiceStatus)}
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <DetailItem
              label="Customer"
              value={
                completion.customer?.name ||
                "No customer recorded"
              }
            />

            <DetailItem
              label="Machine"
              value={
                completion.machine?.displayName ||
                "No machine recorded"
              }
            />

            <DetailItem
              label="Technician"
              value={
                completion.technicianName ||
                "Not recorded"
              }
            />

            <DetailItem
              label="Submitted"
              value={formatDateTime(
                completion.submittedAt,
              )}
            />
          </div>

          {completion.faultReported ? (
            <p className="mt-3 line-clamp-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-700">
                Fault:
              </span>{" "}
              {completion.faultReported}
            </p>
          ) : null}

          {completion.machine?.registration ||
          completion.machine?.serialNumber ? (
            <p className="mt-2 text-xs text-slate-500">
              {[
                completion.machine.registration
                  ? `Registration: ${completion.machine.registration}`
                  : "",
                completion.machine.serialNumber
                  ? `Serial: ${completion.machine.serialNumber}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/office/completions/${completion.completionId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            {status === "submitted"
              ? "Review job"
              : "View review"}
          </Link>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate font-medium text-slate-700">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: OfficeReviewStatus;
}) {
  const classes: Record<
    OfficeReviewStatus,
    string
  > = {
    submitted:
      "bg-amber-100 text-amber-800 ring-amber-200",
    approved:
      "bg-emerald-100 text-emerald-800 ring-emerald-200",
    rejected:
      "bg-rose-100 text-rose-800 ring-rose-200",
  };

  const labels: Record<
    OfficeReviewStatus,
    string
  > = {
    submitted: "Awaiting review",
    approved: "Approved",
    rejected: "Rejected",
  };

  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        classes[status],
      ].join(" ")}
    >
      {labels[status]}
    </span>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: string;
}) {
  const normalised = priority
    .trim()
    .toLowerCase();

  const className =
    normalised === "urgent" ||
    normalised === "high"
      ? "bg-rose-50 text-rose-700"
      : normalised === "low"
        ? "bg-sky-50 text-sky-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {formatText(priority || "normal")} priority
    </span>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-rose-900">
            Unable to load the review queue
          </p>

          <p className="mt-1 text-sm text-rose-700">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function EmptyQueue({
  filter,
}: {
  filter: QueueFilter;
}) {
  const message =
    filter === "submitted"
      ? "There are no technician submissions awaiting review."
      : filter === "approved"
        ? "No completions have been approved yet."
        : filter === "rejected"
          ? "No completions have been rejected."
          : "There are no completion records to display.";

  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-700">
        ✓
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-900">
        Queue clear
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="divide-y divide-slate-200">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse px-6 py-6"
        >
          <div className="h-5 w-48 rounded bg-slate-200" />

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getQueueItemStatus(
  completion: OfficeReviewQueueItem,
): OfficeReviewStatus {
  const invoiceStatus = normaliseText(
    completion.invoiceStatus,
  );

  const jobStatus = normaliseText(
    completion.jobStatus,
  );

  if (
    invoiceStatus === "ready" ||
    jobStatus === "completed"
  ) {
    return "approved";
  }

  if (
    invoiceStatus === "not_ready" &&
    jobStatus === "in_progress"
  ) {
    return "rejected";
  }

  return "submitted";
}

function normaliseText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatText(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatRole(value: string) {
  return formatText(value || "office");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function pluralise(
  value: number,
  singular: string,
  plural: string,
) {
  return value === 1 ? singular : plural;
}