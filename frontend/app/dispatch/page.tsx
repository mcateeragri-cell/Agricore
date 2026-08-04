"use client";

import Link from "next/link";
import {
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Technician = {
  user_id: string;
  full_name: string;
  job_title: string | null;
  calendar_colour: string | null;
  is_active: boolean;
};

type Customer = {
  id: string;
  contact_name: string | null;
  business_name: string | null;
};

type Machine = {
  id: string;
  make: string | null;
  model: string | null;
  registration: string | null;
};

type Job = {
  id: string;
  job_number: string;
  status: string;
  priority: string;
  engineer_name: string | null;
  fault_reported: string | null;
  opened_date: string | null;
  customers: Customer | Customer[] | null;
  machines: Machine | Machine[] | null;
};

type Assignment = {
  id: string;
  job_id: string;
  user_id: string;
  scheduled_start: string;
  scheduled_end: string;
  assignment_status: AssignmentStatus;
  notes: string | null;
  updated_at: string | null;
  jobs: Job | Job[] | null;
  last_location: {
    jobId: string;
    latitude: number;
    longitude: number;
    capturedAt: string;
    phase: "travel_start" | "arrival";
  } | null;
};

type AssignmentStatus =
  | "scheduled"
  | "confirmed"
  | "travelling"
  | "in_progress"
  | "completed"
  | "cancelled";

type DispatchResponse = {
  date: string;
  technicians: Technician[];
  jobs: Job[];
  assignments: Assignment[];
};

type ScheduleForm = {
  jobId: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
};

const emptyForm: ScheduleForm = {
  jobId: "",
  userId: "",
  date: getToday(),
  startTime: "08:00",
  endTime: "09:00",
  notes: "",
};

const statusOptions: Array<{
  value: "all" | AssignmentStatus;
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "travelling", label: "Travelling" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function DispatchPage() {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [data, setData] = useState<DispatchResponse | null>(null);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [statusFilter, setStatusFilter] =
    useState<"all" | AssignmentStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggedAssignmentId, setDraggedAssignmentId] =
    useState<string | null>(null);
  const [dropTargetUserId, setDropTargetUserId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDispatch = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      try {
        const response = await fetch(
          `/api/dispatch?date=${selectedDate}`,
          {
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              result,
              "Unable to load dispatch.",
            ),
          );
        }

        setData(result as DispatchResponse);
        setError("");
      } catch (caughtError: unknown) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load dispatch.",
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [selectedDate],
  );

  useEffect(() => {
    void loadDispatch();
  }, [loadDispatch]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadDispatch(false);
    }, 10_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDispatch]);

  const filteredAssignments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return (data?.assignments ?? []).filter(
      (assignment) => {
        if (
          statusFilter !== "all" &&
          assignment.assignment_status !== statusFilter
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const job = getRelated(assignment.jobs);

        const haystack = [
          job?.job_number,
          getCustomerName(job),
          getMachineName(job),
          job?.fault_reported,
          assignment.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      },
    );
  }, [
    data?.assignments,
    searchTerm,
    statusFilter,
  ]);

  const assignmentsByTechnician = useMemo(() => {
    const grouped = new Map<string, Assignment[]>();

    for (const assignment of filteredAssignments) {
      const current =
        grouped.get(assignment.user_id) ?? [];

      current.push(assignment);
      grouped.set(assignment.user_id, current);
    }

    for (const assignments of grouped.values()) {
      assignments.sort(
        (first, second) =>
          new Date(first.scheduled_start).getTime() -
          new Date(second.scheduled_start).getTime(),
      );
    }

    return grouped;
  }, [filteredAssignments]);

  const summary = useMemo(() => {
    const assignments = data?.assignments ?? [];

    return {
      total: assignments.length,
      scheduled: assignments.filter(
        (assignment) =>
          assignment.assignment_status === "scheduled" ||
          assignment.assignment_status === "confirmed",
      ).length,
      active: assignments.filter(
        (assignment) =>
          assignment.assignment_status === "travelling" ||
          assignment.assignment_status === "in_progress",
      ).length,
      travelling: assignments.filter(
        (assignment) =>
          assignment.assignment_status === "travelling",
      ).length,
      working: assignments.filter(
        (assignment) =>
          assignment.assignment_status === "in_progress",
      ).length,
      completed: assignments.filter(
        (assignment) =>
          assignment.assignment_status === "completed",
      ).length,
      overdue: assignments.filter(isAssignmentOverdue).length,
    };
  }, [data?.assignments]);

  async function handleSchedule(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!form.jobId) {
        throw new Error("Select a job.");
      }

      if (!form.userId) {
        throw new Error("Select a technician.");
      }

      const scheduledStart = combineDateTime(
        form.date,
        form.startTime,
      );

      const scheduledEnd = combineDateTime(
        form.date,
        form.endTime,
      );

      if (!scheduledStart || !scheduledEnd) {
        throw new Error(
          "Enter valid start and finish times.",
        );
      }

      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: form.jobId,
          userId: form.userId,
          scheduledStart,
          scheduledEnd,
          notes: form.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            "Unable to schedule job.",
          ),
        );
      }

      setSuccess(
        result.message ??
          "Job scheduled successfully.",
      );

      setSelectedDate(form.date);
      setForm({
        ...emptyForm,
        date: form.date,
      });

      await loadDispatch(false);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to schedule job.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function moveAssignment(
    assignment: Assignment,
    technicianId: string,
  ) {
    if (assignment.user_id === technicianId) {
      return;
    }

    setMovingId(assignment.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: assignment.job_id,
          userId: technicianId,
          scheduledStart: assignment.scheduled_start,
          scheduledEnd: assignment.scheduled_end,
          notes: assignment.notes ?? "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            "Unable to move assignment.",
          ),
        );
      }

      const technician = data?.technicians.find(
        (item) => item.user_id === technicianId,
      );

      setSuccess(
        `Job moved to ${
          technician?.full_name ?? "technician"
        }.`,
      );

      await loadDispatch(false);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to move assignment.",
      );
    } finally {
      setMovingId(null);
    }
  }

  async function removeAssignment(
    assignmentId: string,
  ) {
    const confirmed = window.confirm(
      "Remove this job from the technician’s schedule?",
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(assignmentId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/dispatch?assignmentId=${assignmentId}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            "Unable to remove assignment.",
          ),
        );
      }

      setSuccess(
        result.message ?? "Assignment removed.",
      );

      await loadDispatch(false);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to remove assignment.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function editAssignment(assignment: Assignment) {
    const job = getRelated(assignment.jobs);

    setForm({
      jobId: assignment.job_id,
      userId: assignment.user_id,
      date: toDateInput(
        assignment.scheduled_start,
      ),
      startTime: toTimeInput(
        assignment.scheduled_start,
      ),
      endTime: toTimeInput(
        assignment.scheduled_end,
      ),
      notes: assignment.notes ?? "",
    });

    setSuccess(
      `Editing ${
        job?.job_number ?? "assignment"
      }. Save to update it.`,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleDragStart(
    event: DragEvent<HTMLDivElement>,
    assignmentId: string,
  ) {
    setDraggedAssignmentId(assignmentId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      assignmentId,
    );
  }

  function handleDragEnd() {
    setDraggedAssignmentId(null);
    setDropTargetUserId(null);
  }

  function handleDragOver(
    event: DragEvent<HTMLElement>,
    technicianId: string,
  ) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetUserId(technicianId);
  }

  function handleDrop(
    event: DragEvent<HTMLElement>,
    technicianId: string,
  ) {
    event.preventDefault();

    const assignmentId =
      event.dataTransfer.getData("text/plain") ||
      draggedAssignmentId;

    const assignment = data?.assignments.find(
      (item) => item.id === assignmentId,
    );

    setDropTargetUserId(null);
    setDraggedAssignmentId(null);

    if (assignment) {
      void moveAssignment(
        assignment,
        technicianId,
      );
    }
  }

  function changeDate(days: number) {
    setSelectedDate((current) =>
      addDaysToDateInput(current, days),
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 lg:px-7">
      <div className="mx-auto max-w-[1800px]">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              Operations
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Live Dispatch Board
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Drag jobs between technicians, edit times
              and monitor today’s workload.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/jobs"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm"
            >
              View Jobs
            </Link>

            <Link
              href="/technician"
              className="rounded-xl bg-[#103d2e] px-4 py-2.5 text-sm font-bold text-white shadow-sm"
            >
              Technician View
            </Link>
          </div>
        </header>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Jobs today" value={summary.total} description="Total assigned" />
          <SummaryCard label="Travelling" value={summary.travelling} description="En route now" tone="blue" />
          <SummaryCard label="Working" value={summary.working} description="On active jobs" tone="emerald" />
          <SummaryCard label="Completed" value={summary.completed} description="Finished today" tone="slate" />
          <SummaryCard label="Overdue" value={summary.overdue} description="Past scheduled finish" tone="red" />
        </section>

        <LiveStatusStrip
          technicians={data?.technicians ?? []}
          assignments={data?.assignments ?? []}
        />

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Schedule or edit a job
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Selecting an already assigned job updates
                its technician and time.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setForm({
                  ...emptyForm,
                  date: selectedDate,
                })
              }
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
            >
              Clear form
            </button>
          </div>

          <form
            onSubmit={handleSchedule}
            className="mt-5 grid gap-4 xl:grid-cols-12"
          >
            <div className="xl:col-span-5">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Job
              </label>

              <select
                value={form.jobId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    jobId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">
                  Select a job
                </option>

                {(data?.jobs ?? []).map((job) => (
                  <option
                    key={job.id}
                    value={job.id}
                  >
                    {job.job_number} —{" "}
                    {getCustomerName(job)} —{" "}
                    {job.fault_reported ??
                      "No fault recorded"}
                  </option>
                ))}
              </select>
            </div>

            <div className="xl:col-span-3">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Technician
              </label>

              <select
                value={form.userId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    userId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">
                  Select technician
                </option>

                {(data?.technicians ?? []).map(
                  (technician) => (
                    <option
                      key={technician.user_id}
                      value={technician.user_id}
                    >
                      {technician.full_name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Date
              </label>

              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 xl:col-span-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Start
                </label>

                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startTime: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Finish
                </label>

                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      endTime: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                />
              </div>
            </div>

            <div className="xl:col-span-10">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Scheduling notes
              </label>

              <input
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Access instructions, parts to bring or customer availability..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="flex items-end xl:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#103d2e] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save schedule"}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeDate(-1)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  Previous
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) =>
                    setSelectedDate(event.target.value)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2"
                />

                <button
                  type="button"
                  onClick={() => changeDate(1)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  Next
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(getToday())}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  Today
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search job, customer or machine"
                  className="min-w-72 rounded-lg border border-slate-300 px-4 py-2"
                />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | "all"
                        | AssignmentStatus,
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2"
                >
                  {statusOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void loadDispatch(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              Loading dispatch board…
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto pb-4">
              <div
                className="grid min-w-max gap-4"
                style={{
                  gridTemplateColumns: `repeat(${
                    data?.technicians.length || 1
                  }, minmax(320px, 1fr))`,
                }}
              >
                {(data?.technicians ?? []).map(
                  (technician) => {
                    const assignments =
                      assignmentsByTechnician.get(
                        technician.user_id,
                      ) ?? [];

                    const isDropTarget =
                      dropTargetUserId ===
                      technician.user_id;

                    return (
                      <article
                        key={technician.user_id}
                        onDragOver={(event) =>
                          handleDragOver(
                            event,
                            technician.user_id,
                          )
                        }
                        onDrop={(event) =>
                          handleDrop(
                            event,
                            technician.user_id,
                          )
                        }
                        onDragLeave={() =>
                          setDropTargetUserId(null)
                        }
                        className={`min-h-[520px] overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                          isDropTarget
                            ? "border-emerald-500 ring-2 ring-emerald-200"
                            : "border-slate-200"
                        }`}
                      >
                        <header className="border-b border-slate-200 px-5 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    technician.calendar_colour ??
                                    "#103d2e",
                                }}
                              />

                              <div>
                                <h3 className="font-bold text-slate-950">
                                  {technician.full_name}
                                </h3>

                                <p className="text-sm text-slate-500">
                                  {technician.job_title ??
                                    "Technician"}
                                </p>
                              </div>
                            </div>

                            <TechnicianLiveBadge assignments={assignments} />
                          </div>
                        </header>

                        <div className="space-y-3 p-4">
                          {assignments.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                              Drop a job here or use the
                              scheduling form.
                            </div>
                          ) : (
                            assignments.map(
                              (assignment) => (
                                <DispatchCard
                                  key={assignment.id}
                                  assignment={assignment}
                                  moving={
                                    movingId ===
                                    assignment.id
                                  }
                                  deleting={
                                    deletingId ===
                                    assignment.id
                                  }
                                  dragging={
                                    draggedAssignmentId ===
                                    assignment.id
                                  }
                                  onDragStart={
                                    handleDragStart
                                  }
                                  onDragEnd={handleDragEnd}
                                  onEdit={editAssignment}
                                  onRemove={
                                    removeAssignment
                                  }
                                />
                              ),
                            )
                          )}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function LiveStatusStrip({
  technicians,
  assignments,
}: {
  technicians: Technician[];
  assignments: Assignment[];
}) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Live field status</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Technicians now</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Auto-refresh 10s
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {technicians.map((technician) => {
          const technicianAssignments = assignments.filter(
            (assignment) => assignment.user_id === technician.user_id,
          );
          const live = getLiveAssignment(technicianAssignments);
          const job = live ? getRelated(live.jobs) : null;
          const status = live?.assignment_status ?? "available";

          return (
            <article key={technician.user_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{technician.full_name}</p>
                  <p className="truncate text-xs text-slate-500">{technician.job_title ?? "Technician"}</p>
                </div>
                <LiveStatusBadge status={status} />
              </div>
              <p className="mt-3 truncate text-sm font-semibold text-slate-700">
                {job ? `${job.job_number} · ${getCustomerName(job)}` : "No active job"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {live ? `Updated ${formatRelativeTime(live.updated_at)}` : "Available for assignment"}
              </p>
              {live?.last_location ? (
                <a
                  href={`https://maps.google.com/?q=${live.last_location.latitude},${live.last_location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-bold text-emerald-700 hover:underline"
                >
                  View last GPS · {formatRelativeTime(live.last_location.capturedAt)}
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TechnicianLiveBadge({ assignments }: { assignments: Assignment[] }) {
  const live = getLiveAssignment(assignments);
  return <LiveStatusBadge status={live?.assignment_status ?? "available"} />;
}

function LiveStatusBadge({ status }: { status: string }) {
  const normalised = status.toLowerCase();
  const styles: Record<string, string> = {
    travelling: "bg-blue-100 text-blue-700",
    in_progress: "bg-emerald-100 text-emerald-700",
    completed: "bg-slate-200 text-slate-700",
    confirmed: "bg-amber-100 text-amber-700",
    scheduled: "bg-amber-100 text-amber-700",
    available: "bg-white text-slate-600 border border-slate-200",
  };
  const labels: Record<string, string> = {
    travelling: "Travelling",
    in_progress: "Working",
    completed: "Completed",
    confirmed: "Confirmed",
    scheduled: "Scheduled",
    available: "Available",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[normalised] ?? styles.available}`}>
      {labels[normalised] ?? "Available"}
    </span>
  );
}

function getLiveAssignment(assignments: Assignment[]) {
  return assignments.find((assignment) =>
    ["travelling", "in_progress"].includes(assignment.assignment_status),
  ) ?? assignments.find((assignment) =>
    ["confirmed", "scheduled"].includes(assignment.assignment_status),
  ) ?? null;
}

function isAssignmentOverdue(assignment: Assignment) {
  if (["completed", "cancelled"].includes(assignment.assignment_status)) return false;
  const end = new Date(assignment.scheduled_end).getTime();
  return Number.isFinite(end) && end < Date.now();
}

function formatRelativeTime(value: string | null) {
  if (!value) return "just now";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "just now";
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SummaryCard({
  label,
  value,
  description,
  tone = "slate",
}: {
  label: string;
  value: number;
  description: string;
  tone?: "slate" | "blue" | "emerald" | "red";
}) {
  const toneClass = {
    slate: "border-slate-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    emerald: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
  }[tone];

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </article>
  );
}

function DispatchCard({
  assignment,
  moving,
  deleting,
  dragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onRemove,
}: {
  assignment: Assignment;
  moving: boolean;
  deleting: boolean;
  dragging: boolean;
  onDragStart: (
    event: DragEvent<HTMLDivElement>,
    assignmentId: string,
  ) => void;
  onDragEnd: () => void;
  onEdit: (assignment: Assignment) => void;
  onRemove: (assignmentId: string) => void;
}) {
  const job = getRelated(assignment.jobs);

  return (
    <div
      draggable
      onDragStart={(event) =>
        onDragStart(event, assignment.id)
      }
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition active:cursor-grabbing ${
        dragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#103d2e]">
            {formatTime(assignment.scheduled_start)}
            {" – "}
            {formatTime(assignment.scheduled_end)}
          </p>

          <Link
            href={`/jobs/${assignment.job_id}`}
            className="mt-1 block text-lg font-bold text-slate-950 hover:underline"
          >
            {job?.job_number ?? "Job"}
          </Link>
        </div>

        <StatusBadge
          status={assignment.assignment_status}
        />
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-sm font-semibold text-slate-800">
          {getCustomerName(job)}
        </p>

        <p className="text-sm text-slate-500">
          {getMachineName(job)}
        </p>
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-slate-600">
        {job?.fault_reported ??
          "No fault recorded."}
      </p>

      {assignment.notes ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {assignment.notes}
        </p>
      ) : null}

      {assignment.last_location ? (
        <a
          href={`https://maps.google.com/?q=${assignment.last_location.latitude},${assignment.last_location.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
        >
          <span>Last GPS: {assignment.last_location.phase === "arrival" ? "On site" : "Travel started"}</span>
          <span>{formatRelativeTime(assignment.last_location.capturedAt)}</span>
        </a>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <span>Updated {formatRelativeTime(assignment.updated_at)}</span>
        {isAssignmentOverdue(assignment) ? (
          <span className="rounded-full bg-red-100 px-2.5 py-1 font-bold text-red-700">Overdue</span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <PriorityBadge
          priority={job?.priority ?? "normal"}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(assignment)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
          >
            Edit
          </button>

          <button
            type="button"
            disabled={deleting || moving}
            onClick={() =>
              void onRemove(assignment.id)
            }
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
          >
            {deleting
              ? "Removing..."
              : moving
                ? "Moving..."
                : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: AssignmentStatus;
}) {
  const className: Record<
    AssignmentStatus,
    string
  > = {
    scheduled:
      "bg-sky-50 text-sky-700 ring-sky-200",
    confirmed:
      "bg-indigo-50 text-indigo-700 ring-indigo-200",
    travelling:
      "bg-amber-50 text-amber-800 ring-amber-200",
    in_progress:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    completed:
      "bg-slate-100 text-slate-700 ring-slate-200",
    cancelled:
      "bg-red-50 text-red-700 ring-red-200",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${className[status]}`}
    >
      {formatLabel(status)}
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
    normalised === "emergency"
      ? "bg-red-50 text-red-700"
      : normalised === "high"
        ? "bg-amber-50 text-amber-800"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
    >
      {formatLabel(priority)}
    </span>
  );
}

function getRelated<T>(
  value: T | T[] | null,
): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function getCustomerName(job: Job | null) {
  if (!job) {
    return "Customer not recorded";
  }

  const customer = getRelated(job.customers);

  return (
    customer?.business_name ||
    customer?.contact_name ||
    "Customer not recorded"
  );
}

function getMachineName(job: Job | null) {
  if (!job) {
    return "Machine not recorded";
  }

  const machine = getRelated(job.machines);

  if (!machine) {
    return "Machine not recorded";
  }

  const name = [
    machine.make,
    machine.model,
  ]
    .filter(Boolean)
    .join(" ");

  const registration = machine.registration
    ? ` • ${machine.registration}`
    : "";

  return `${name || "Machine"}${registration}`;
}

function combineDateTime(
  date: string,
  time: string,
) {
  if (!date || !time) {
    return null;
  }

  const value = new Date(`${date}T${time}:00`);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toISOString();
}

function toDateInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getToday();
  }

  const offset = date.getTimezoneOffset();

  return new Date(
    date.getTime() - offset * 60_000,
  )
    .toISOString()
    .slice(0, 10);
}

function toTimeInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function addDaysToDateInput(
  value: string,
  days: number,
) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);

  return getDateInput(date);
}

function getDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getToday() {
  return getDateInput(new Date());
}

function getErrorMessage(
  value: unknown,
  fallback: string,
) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value
  ) {
    const possibleError = (
      value as { error?: unknown }
    ).error;

    if (
      typeof possibleError === "string" &&
      possibleError.trim()
    ) {
      return possibleError;
    }
  }

  return fallback;
}