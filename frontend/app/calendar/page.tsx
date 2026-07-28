"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
  CalendarCustomer,
  CalendarJob,
  CalendarJobAssignment,
  CalendarMachine,
  CalendarResponse,
  CalendarTechnician,
  StaffCalendarEvent,
} from "@/types/calendar";

type CalendarDay = {
  key: string;
  date: Date;
  dayName: string;
  dayNumber: string;
  monthName: string;
  isToday: boolean;
};

const eventTypeLabels: Record<string, string> = {
  unavailable: "Unavailable",
  annual_leave: "Annual leave",
  leave: "Leave",
  holiday: "Holiday",
  sickness: "Sickness",
  sick: "Sickness",
  training: "Training",
  meeting: "Meeting",
  appointment: "Appointment",
  other: "Other",
};

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getStartOfWeek(new Date()),
  );

  const [calendarData, setCalendarData] =
    useState<CalendarResponse | null>(null);

  const [selectedTechnicianId, setSelectedTechnicianId] =
    useState<string>("all");

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string>("");

  const [jobToSchedule, setJobToSchedule] =
    useState<CalendarJob | null>(null);

  const [savingAssignment, setSavingAssignment] =
    useState<boolean>(false);

  const [assignmentToEdit, setAssignmentToEdit] =
    useState<CalendarJobAssignment | null>(null);

  const [updatingAssignment, setUpdatingAssignment] =
    useState<boolean>(false);

  const [deletingAssignment, setDeletingAssignment] =
    useState<boolean>(false);

  const weekEnd = useMemo(
    () => addDays(weekStart, 7),
    [weekStart],
  );

  const days = useMemo(
    () => buildWeekDays(weekStart),
    [weekStart],
  );

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.access_token) {
        throw new Error(
          "You must be signed in to view the calendar.",
        );
      }

      const searchParams = new URLSearchParams({
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      });

      const response = await fetch(
        `/api/calendar?${searchParams.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        },
      );

      const result: unknown =
        await response.json();

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            result,
            "Unable to load the calendar.",
          ),
        );
      }

      if (!isCalendarResponse(result)) {
        throw new Error(
          "The calendar returned an invalid response.",
        );
      }

      setCalendarData(result);
    } catch (caughtError: unknown) {
      console.error(
        "Unable to load calendar:",
        caughtError,
      );

      setCalendarData(null);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the calendar.",
      );
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const visibleTechnicians = useMemo(() => {
    const technicians =
      calendarData?.technicians ?? [];

    if (selectedTechnicianId === "all") {
      return technicians;
    }

    return technicians.filter(
      (technician) =>
        technician.id === selectedTechnicianId,
    );
  }, [
    calendarData?.technicians,
    selectedTechnicianId,
  ]);

  const jobsById = useMemo(() => {
    return new Map<string, CalendarJob>(
      (calendarData?.jobs ?? []).map(
        (job) => [job.id, job],
      ),
    );
  }, [calendarData?.jobs]);

  const customersById = useMemo(() => {
    return new Map<string, CalendarCustomer>(
      (calendarData?.customers ?? []).map(
        (customer) => [
          customer.id,
          customer,
        ],
      ),
    );
  }, [calendarData?.customers]);

  const machinesById = useMemo(() => {
    return new Map<string, CalendarMachine>(
      (calendarData?.machines ?? []).map(
        (machine) => [
          machine.id,
          machine,
        ],
      ),
    );
  }, [calendarData?.machines]);

  const assignedJobIds = useMemo(() => {
    return new Set(
      (calendarData?.assignments ?? []).map(
        (assignment) => assignment.jobId,
      ),
    );
  }, [calendarData?.assignments]);

  const unscheduledJobs = useMemo(() => {
    return (calendarData?.jobs ?? [])
      .filter(
        (job) => !assignedJobIds.has(job.id),
      )
      .sort((firstJob, secondJob) => {
        const priorityDifference =
          getPriorityWeight(
            secondJob.priority,
          ) -
          getPriorityWeight(
            firstJob.priority,
          );

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return (
          (secondJob.jobSequence ?? 0) -
          (firstJob.jobSequence ?? 0)
        );
      });
  }, [calendarData?.jobs, assignedJobIds]);

  const scheduledHours = useMemo(() => {
    return (
      calendarData?.assignments ?? []
    ).reduce(
      (
        total: number,
        assignment: CalendarJobAssignment,
      ) => {
        const startTime = new Date(
          assignment.scheduledStart,
        ).getTime();

        const endTime = new Date(
          assignment.scheduledEnd,
        ).getTime();

        if (
          Number.isNaN(startTime) ||
          Number.isNaN(endTime) ||
          endTime <= startTime
        ) {
          return total;
        }

        return (
          total +
          (endTime - startTime) / 3_600_000
        );
      },
      0,
    );
  }, [calendarData?.assignments]);

  async function createAssignment({
    jobId,
    userId,
    scheduledStart,
    scheduledEnd,
    notes,
  }: {
    jobId: string;
    userId: string;
    scheduledStart: string;
    scheduledEnd: string;
    notes: string;
  }) {
    setSavingAssignment(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.access_token) {
        throw new Error(
          "You must be signed in to schedule work.",
        );
      }

      const response = await fetch(
        "/api/calendar",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobId,
            userId,
            scheduledStart,
            scheduledEnd,
            notes,
          }),
        },
      );

      const result: unknown =
        await response.json();

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            result,
            "Unable to schedule the job.",
          ),
        );
      }

      setJobToSchedule(null);
      await loadCalendar();
    } finally {
      setSavingAssignment(false);
    }
  }

  async function updateAssignment({
    assignmentId,
    userId,
    scheduledStart,
    scheduledEnd,
    assignmentStatus,
    notes,
  }: {
    assignmentId: string;
    userId: string;
    scheduledStart: string;
    scheduledEnd: string;
    assignmentStatus: string;
    notes: string;
  }) {
    setUpdatingAssignment(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.access_token) {
        throw new Error(
          "You must be signed in to update scheduled work.",
        );
      }

      const response = await fetch("/api/calendar", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentId,
          userId,
          scheduledStart,
          scheduledEnd,
          assignmentStatus,
          notes,
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            result,
            "Unable to update the assignment.",
          ),
        );
      }

      setAssignmentToEdit(null);
      await loadCalendar();
    } finally {
      setUpdatingAssignment(false);
    }
  }

  async function deleteAssignment(assignmentId: string) {
    setDeletingAssignment(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.access_token) {
        throw new Error(
          "You must be signed in to remove scheduled work.",
        );
      }

      const response = await fetch("/api/calendar", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignmentId }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            result,
            "Unable to remove the assignment.",
          ),
        );
      }

      setAssignmentToEdit(null);
      await loadCalendar();
    } finally {
      setDeletingAssignment(false);
    }
  }

  function showPreviousWeek() {
    setWeekStart((currentWeekStart) =>
      addDays(currentWeekStart, -7),
    );
  }

  function showCurrentWeek() {
    setWeekStart(
      getStartOfWeek(new Date()),
    );
  }

  function showNextWeek() {
    setWeekStart((currentWeekStart) =>
      addDays(currentWeekStart, 7),
    );
  }

return (
  <main className="min-w-0 flex-1 bg-slate-100">
    <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
          <CalendarHeader
            weekStart={weekStart}
            weekEnd={weekEnd}
            loading={loading}
            onPreviousWeek={showPreviousWeek}
            onCurrentWeek={showCurrentWeek}
            onNextWeek={showNextWeek}
            onRefresh={() => {
              void loadCalendar();
            }}
          />

          <CalendarSummary
            technicianCount={
              calendarData?.technicians.length ??
              0
            }
            assignmentCount={
              calendarData?.assignments.length ??
              0
            }
            eventCount={
              calendarData?.events.length ?? 0
            }
            scheduledHours={scheduledHours}
          />

          <UnscheduledJobsPanel
            jobs={unscheduledJobs}
            customersById={customersById}
            machinesById={machinesById}
            onSchedule={setJobToSchedule}
          />

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Weekly planner
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  View scheduled jobs, leave,
                  training and unavailable periods.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label
                  htmlFor="technician-filter"
                  className="text-sm font-semibold text-slate-700"
                >
                  Technician
                </label>

                <select
                  id="technician-filter"
                  value={selectedTechnicianId}
                  onChange={(event) => {
                    setSelectedTechnicianId(
                      event.target.value,
                    );
                  }}
                  className="min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                >
                  <option value="all">
                    All technicians
                  </option>

                  {calendarData?.technicians.map(
                    (technician) => (
                      <option
                        key={technician.id}
                        value={technician.id}
                      >
                        {technician.fullName}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {loading ? (
              <CalendarLoadingState />
            ) : error ? (
              <CalendarErrorState
                message={error}
                onRetry={() => {
                  void loadCalendar();
                }}
              />
            ) : visibleTechnicians.length ===
              0 ? (
              <EmptyTechniciansState />
            ) : (
              <WeeklyPlanner
                days={days}
                technicians={
                  visibleTechnicians
                }
                assignments={
                  calendarData?.assignments ??
                  []
                }
                staffEvents={
                  calendarData?.events ?? []
                }
                jobsById={jobsById}
                customersById={
                  customersById
                }
                machinesById={machinesById}
                onEditAssignment={setAssignmentToEdit}
              />
            )}
          </section>

          <CalendarLegend />
        </div>

        {jobToSchedule ? (
          <ScheduleJobModal
            job={jobToSchedule}
            technicians={
              calendarData?.technicians ?? []
            }
            customer={
              jobToSchedule.customerId
                ? customersById.get(
                    jobToSchedule.customerId,
                  )
                : undefined
            }
            machine={
              jobToSchedule.machineId
                ? machinesById.get(
                    jobToSchedule.machineId,
                  )
                : undefined
            }
            initialDate={weekStart}
            saving={savingAssignment}
            onClose={() => {
              if (!savingAssignment) {
                setJobToSchedule(null);
              }
            }}
            onSubmit={createAssignment}
          />
        ) : null}

        {assignmentToEdit ? (
          <EditAssignmentModal
            assignment={assignmentToEdit}
            job={jobsById.get(assignmentToEdit.jobId)}
            technicians={calendarData?.technicians ?? []}
            customer={
              jobsById.get(assignmentToEdit.jobId)?.customerId
                ? customersById.get(
                    jobsById.get(assignmentToEdit.jobId)!.customerId!,
                  )
                : undefined
            }
            machine={
              jobsById.get(assignmentToEdit.jobId)?.machineId
                ? machinesById.get(
                    jobsById.get(assignmentToEdit.jobId)!.machineId!,
                  )
                : undefined
            }
            saving={updatingAssignment}
            deleting={deletingAssignment}
            onClose={() => {
              if (!updatingAssignment && !deletingAssignment) {
                setAssignmentToEdit(null);
              }
            }}
            onSubmit={updateAssignment}
            onDelete={deleteAssignment}
          />
        ) : null}
      </main>
  );
}

function UnscheduledJobsPanel({
  jobs,
  customersById,
  machinesById,
  onSchedule,
}: {
  jobs: CalendarJob[];
  customersById: Map<string, CalendarCustomer>;
  machinesById: Map<string, CalendarMachine>;
  onSchedule: (job: CalendarJob) => void;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Unscheduled jobs
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Open work that has not yet been assigned to a technician.
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {jobs.length} waiting
        </span>
      </div>

      {jobs.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-semibold text-slate-600">
            All current jobs are scheduled.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => {
            const customer = job.customerId
              ? customersById.get(job.customerId)
              : undefined;

            const machine = job.machineId
              ? machinesById.get(job.machineId)
              : undefined;

            return (
              <article
                key={job.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#24745a]">
                      {job.jobNumber}
                    </p>

                    <p className="mt-1 truncate text-sm font-bold text-slate-900">
                      {customer?.name ?? "Customer not recorded"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${getPriorityBadgeClasses(
                      job.priority,
                    )}`}
                  >
                    {formatDisplayValue(normaliseValue(job.priority))}
                  </span>
                </div>

                {machine?.displayName ? (
                  <p className="mt-2 line-clamp-1 text-xs text-slate-600">
                    {machine.displayName}
                  </p>
                ) : null}

                <p className="mt-2 min-h-10 line-clamp-2 text-xs text-slate-600">
                  {job.faultReported || "No fault description recorded."}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    View job
                  </Link>

                  <button
                    type="button"
                    onClick={() => onSchedule(job)}
                    className="rounded-lg bg-[#103d2e] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#0d3326]"
                  >
                    Schedule
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ScheduleJobModal({
  job,
  technicians,
  customer,
  machine,
  initialDate,
  saving,
  onClose,
  onSubmit,
}: {
  job: CalendarJob;
  technicians: CalendarTechnician[];
  customer: CalendarCustomer | undefined;
  machine: CalendarMachine | undefined;
  initialDate: Date;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: {
    jobId: string;
    userId: string;
    scheduledStart: string;
    scheduledEnd: string;
    notes: string;
  }) => Promise<void>;
}) {
  const defaultStart = useMemo(() => {
    const candidate = new Date(initialDate);
    candidate.setHours(8, 0, 0, 0);

    if (candidate < new Date()) {
      const today = new Date();
      today.setMinutes(0, 0, 0);
      today.setHours(Math.max(today.getHours() + 1, 8));
      return today;
    }

    return candidate;
  }, [initialDate]);

  const [userId, setUserId] = useState(
    technicians[0]?.id ?? "",
  );

  const [startValue, setStartValue] = useState(
    toDateTimeLocalValue(defaultStart),
  );

  const [endValue, setEndValue] = useState(
    toDateTimeLocalValue(addHours(defaultStart, 2)),
  );

  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError("");

    const startDate = new Date(startValue);
    const endDate = new Date(endValue);

    if (!userId) {
      setFormError("Select a technician.");
      return;
    }

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      setFormError("Select a valid start and finish time.");
      return;
    }

    if (endDate <= startDate) {
      setFormError("Finish time must be after the start time.");
      return;
    }

    try {
      await onSubmit({
        jobId: job.id,
        userId,
        scheduledStart: startDate.toISOString(),
        scheduledEnd: endDate.toISOString(),
        notes,
      });
    } catch (caughtError: unknown) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to schedule the job.",
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-job-title"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#24745a]">
              {job.jobNumber}
            </p>

            <h2
              id="schedule-job-title"
              className="mt-1 text-xl font-bold text-slate-950"
            >
              Schedule job
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {customer?.name ?? "Customer not recorded"}
              {machine?.displayName
                ? ` · ${machine.displayName}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            aria-label="Close scheduling window"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">
                Technician
              </span>

              <select
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              >
                <option value="">Select technician</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.fullName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">
                Start
              </span>

              <input
                type="datetime-local"
                value={startValue}
                onChange={(event) => {
                  const nextStart = event.target.value;
                  setStartValue(nextStart);

                  const parsedStart = new Date(nextStart);
                  if (!Number.isNaN(parsedStart.getTime())) {
                    setEndValue(
                      toDateTimeLocalValue(addHours(parsedStart, 2)),
                    );
                  }
                }}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">
                Finish
              </span>

              <input
                type="datetime-local"
                value={endValue}
                onChange={(event) => setEndValue(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">
                Scheduling notes
              </span>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Optional notes for the technician"
                className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              />
            </label>
          </div>

          {formError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {formError}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || technicians.length === 0}
              className="rounded-lg bg-[#103d2e] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0d3326] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Scheduling…" : "Schedule job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAssignmentModal({
  assignment,
  job,
  technicians,
  customer,
  machine,
  saving,
  deleting,
  onClose,
  onSubmit,
  onDelete,
}: {
  assignment: CalendarJobAssignment;
  job: CalendarJob | undefined;
  technicians: CalendarTechnician[];
  customer: CalendarCustomer | undefined;
  machine: CalendarMachine | undefined;
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    assignmentId: string;
    userId: string;
    scheduledStart: string;
    scheduledEnd: string;
    assignmentStatus: string;
    notes: string;
  }) => Promise<void>;
  onDelete: (assignmentId: string) => Promise<void>;
}) {
  const [userId, setUserId] = useState(assignment.userId);
  const [startValue, setStartValue] = useState(
    toDateTimeLocalValue(new Date(assignment.scheduledStart)),
  );
  const [endValue, setEndValue] = useState(
    toDateTimeLocalValue(new Date(assignment.scheduledEnd)),
  );
  const [assignmentStatus, setAssignmentStatus] = useState(
    assignment.assignmentStatus || "scheduled",
  );
  const [notes, setNotes] = useState(assignment.notes || "");
  const [formError, setFormError] = useState("");

  const busy = saving || deleting;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError("");

    const startDate = new Date(startValue);
    const endDate = new Date(endValue);

    if (!userId) {
      setFormError("Select a technician.");
      return;
    }

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      setFormError("Select a valid start and finish time.");
      return;
    }

    if (endDate <= startDate) {
      setFormError("Finish time must be after the start time.");
      return;
    }

    try {
      await onSubmit({
        assignmentId: assignment.id,
        userId,
        scheduledStart: startDate.toISOString(),
        scheduledEnd: endDate.toISOString(),
        assignmentStatus,
        notes,
      });
    } catch (caughtError: unknown) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update the assignment.",
      );
    }
  }

  async function handleDelete() {
    setFormError("");

    const confirmed = window.confirm(
      "Remove this job from the calendar? The job itself will not be deleted.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await onDelete(assignment.id);
    } catch (caughtError: unknown) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to remove the assignment.",
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-assignment-title"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#24745a]">
              {job?.jobNumber ?? "Scheduled job"}
            </p>

            <h2
              id="edit-assignment-title"
              className="mt-1 text-xl font-bold text-slate-950"
            >
              Edit scheduled job
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {customer?.name ?? "Customer not recorded"}
              {machine?.displayName
                ? ` · ${machine.displayName}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            aria-label="Close edit window"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">
                Technician
              </span>

              <select
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              >
                <option value="">Select technician</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.fullName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">
                Start
              </span>

              <input
                type="datetime-local"
                value={startValue}
                onChange={(event) => setStartValue(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">
                Finish
              </span>

              <input
                type="datetime-local"
                value={endValue}
                onChange={(event) => setEndValue(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">
                Assignment status
              </span>

              <select
                value={assignmentStatus}
                onChange={(event) =>
                  setAssignmentStatus(event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">
                Scheduling notes
              </span>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Optional notes for the technician"
                className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              />
            </label>
          </div>

          {formError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {formError}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                void handleDelete();
              }}
              disabled={busy}
              className="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Removing…" : "Remove from calendar"}
            </button>

            <div className="flex justify-end gap-3">
              {job ? (
                <Link
                  href={`/jobs/${job.id}`}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  View job
                </Link>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy || technicians.length === 0}
                className="rounded-lg bg-[#103d2e] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0d3326] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CalendarHeader({
  weekStart,
  weekEnd,
  loading,
  onPreviousWeek,
  onCurrentWeek,
  onNextWeek,
  onRefresh,
}: {
  weekStart: Date;
  weekEnd: Date;
  loading: boolean;
  onPreviousWeek: () => void;
  onCurrentWeek: () => void;
  onNextWeek: () => void;
  onRefresh: () => void;
}) {
  const lastVisibleDay =
    addDays(weekEnd, -1);

  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#24745a]">
          Workshop scheduling
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Technician Calendar
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          {formatWeekHeading(
            weekStart,
            lastVisibleDay,
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPreviousWeek}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ChevronLeftIcon />
          Previous
        </button>

        <button
          type="button"
          onClick={onCurrentWeek}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          This week
        </button>

        <button
          type="button"
          onClick={onNextWeek}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Next
          <ChevronRightIcon />
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#103d2e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d3326] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshIcon spinning={loading} />
          Refresh
        </button>
      </div>
    </header>
  );
}

function CalendarSummary({
  technicianCount,
  assignmentCount,
  eventCount,
  scheduledHours,
}: {
  technicianCount: number;
  assignmentCount: number;
  eventCount: number;
  scheduledHours: number;
}) {
  const summaryCards = [
    {
      label: "Active technicians",
      value: String(technicianCount),
      detail: "Available in the planner",
    },
    {
      label: "Scheduled jobs",
      value: String(assignmentCount),
      detail: "Assignments this week",
    },
    {
      label: "Scheduled hours",
      value: formatHours(scheduledHours),
      detail: "Total assignment time",
    },
    {
      label: "Staff events",
      value: String(eventCount),
      detail: "Leave, training and absence",
    },
  ];

  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((card) => (
        <article
          key={card.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-semibold text-slate-500">
            {card.label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {card.value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {card.detail}
          </p>
        </article>
      ))}
    </section>
  );
}

function WeeklyPlanner({
  days,
  technicians,
  assignments,
  staffEvents,
  jobsById,
  customersById,
  machinesById,
  onEditAssignment,
}: {
  days: CalendarDay[];
  technicians: CalendarTechnician[];
  assignments: CalendarJobAssignment[];
  staffEvents: StaffCalendarEvent[];
  jobsById: Map<string, CalendarJob>;
  customersById: Map<
    string,
    CalendarCustomer
  >;
  machinesById: Map<
    string,
    CalendarMachine
  >;
  onEditAssignment: (
    assignment: CalendarJobAssignment,
  ) => void;
}) {
  const minimumWidth =
    190 + technicians.length * 285;

  const gridTemplateColumns = `190px repeat(${technicians.length}, minmax(285px, 1fr))`;

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-full"
        style={{
          width: `${minimumWidth}px`,
        }}
      >
        <div
          className="grid border-b border-slate-200 bg-slate-50"
          style={{
            gridTemplateColumns,
          }}
        >
          <div className="sticky left-0 z-20 border-r border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Day
            </p>
          </div>

          {technicians.map(
            (technician) => (
              <TechnicianHeader
                key={technician.id}
                technician={technician}
              />
            ),
          )}
        </div>

        {days.map((day) => (
          <div
            key={day.key}
            className="grid border-b border-slate-200 last:border-b-0"
            style={{
              gridTemplateColumns,
            }}
          >
            <DayHeader day={day} />

            {technicians.map(
              (technician) => {
                const technicianAssignments =
                  assignments
                    .filter(
                      (assignment) =>
                        assignment.userId ===
                          technician.id &&
                        overlapsDay(
                          assignment.scheduledStart,
                          assignment.scheduledEnd,
                          day.date,
                        ),
                    )
                    .sort(
                      (
                        firstAssignment,
                        secondAssignment,
                      ) =>
                        firstAssignment.scheduledStart.localeCompare(
                          secondAssignment.scheduledStart,
                        ),
                    );

                const technicianEvents =
                  staffEvents
                    .filter(
                      (staffEvent) =>
                        staffEvent.userId ===
                          technician.id &&
                        overlapsDay(
                          staffEvent.startsAt,
                          staffEvent.endsAt,
                          day.date,
                        ),
                    )
                    .sort(
                      (
                        firstEvent,
                        secondEvent,
                      ) =>
                        firstEvent.startsAt.localeCompare(
                          secondEvent.startsAt,
                        ),
                    );

                return (
                  <TechnicianDayCell
                    key={`${day.key}-${technician.id}`}
                    day={day.date}
                    technician={
                      technician
                    }
                    assignments={
                      technicianAssignments
                    }
                    staffEvents={
                      technicianEvents
                    }
                    jobsById={jobsById}
                    customersById={
                      customersById
                    }
                    machinesById={
                      machinesById
                    }
                    onEditAssignment={
                      onEditAssignment
                    }
                  />
                );
              },
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TechnicianHeader({
  technician,
}: {
  technician: CalendarTechnician;
}) {
  return (
    <div className="border-r border-slate-200 px-4 py-4 last:border-r-0">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{
            backgroundColor:
              technician.calendarColour,
          }}
        >
          {getInitials(
            technician.fullName,
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {technician.fullName}
          </p>

          <p className="mt-0.5 truncate text-xs capitalize text-slate-500">
            {formatRole(technician.role)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DayHeader({
  day,
}: {
  day: CalendarDay;
}) {
  return (
    <div
      className={`sticky left-0 z-10 border-r border-slate-200 px-4 py-5 ${
        day.isToday
          ? "bg-emerald-50"
          : "bg-white"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          day.isToday
            ? "text-[#24745a]"
            : "text-slate-500"
        }`}
      >
        {day.dayName}
      </p>

      <div className="mt-2 flex items-end gap-2">
        <span
          className={`text-3xl font-bold ${
            day.isToday
              ? "text-[#103d2e]"
              : "text-slate-950"
          }`}
        >
          {day.dayNumber}
        </span>

        <span className="pb-1 text-sm text-slate-500">
          {day.monthName}
        </span>
      </div>

      {day.isToday ? (
        <span className="mt-3 inline-flex rounded-full bg-[#103d2e] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Today
        </span>
      ) : null}
    </div>
  );
}

function TechnicianDayCell({
  day,
  technician,
  assignments,
  staffEvents,
  jobsById,
  customersById,
  machinesById,
  onEditAssignment,
}: {
  day: Date;
  technician: CalendarTechnician;
  assignments: CalendarJobAssignment[];
  staffEvents: StaffCalendarEvent[];
  jobsById: Map<string, CalendarJob>;
  customersById: Map<
    string,
    CalendarCustomer
  >;
  machinesById: Map<
    string,
    CalendarMachine
  >;
  onEditAssignment: (
    assignment: CalendarJobAssignment,
  ) => void;
}) {
  const hasCalendarItems =
    assignments.length > 0 ||
    staffEvents.length > 0;

  return (
    <div className="min-h-44 border-r border-slate-200 bg-white p-3 last:border-r-0">
      <div className="space-y-2">
        {staffEvents.map((staffEvent) => (
          <StaffEventCard
            key={staffEvent.id}
            event={staffEvent}
            day={day}
          />
        ))}

        {assignments.map((assignment) => {
          const job = jobsById.get(
            assignment.jobId,
          );

          const customer =
            job?.customerId
              ? customersById.get(
                  job.customerId,
                )
              : undefined;

          const machine =
            job?.machineId
              ? machinesById.get(
                  job.machineId,
                )
              : undefined;

          return (
            <JobAssignmentCard
              key={assignment.id}
              assignment={assignment}
              job={job}
              customer={customer}
              machine={machine}
              day={day}
              technician={technician}
              onEdit={() =>
                onEditAssignment(assignment)
              }
            />
          );
        })}

        {!hasCalendarItems ? (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Available
              </p>

              <p className="mt-1 text-xs text-slate-400">
                No work scheduled
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function JobAssignmentCard({
  assignment,
  job,
  customer,
  machine,
  day,
  technician,
  onEdit,
}: {
  assignment: CalendarJobAssignment;
  job: CalendarJob | undefined;
  customer: CalendarCustomer | undefined;
  machine: CalendarMachine | undefined;
  day: Date;
  technician: CalendarTechnician;
  onEdit: () => void;
}) {
  const priority = normaliseValue(
    job?.priority ?? "normal",
  );

  const startTime = new Date(
    assignment.scheduledStart,
  );

  const endTime = new Date(
    assignment.scheduledEnd,
  );

  return (
    <button
      type="button"
      onClick={onEdit}
      className={`block w-full rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getPriorityClasses(
        priority,
      )}`}
      aria-label={`Edit ${job?.jobNumber ?? "scheduled job"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide">
            {job?.jobNumber ??
              "Scheduled job"}
          </p>

          <p className="mt-1 truncate text-sm font-bold">
            {customer?.name ??
              "Customer not recorded"}
          </p>
        </div>

        <span
          className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor:
              technician.calendarColour,
          }}
          title={technician.fullName}
        />
      </div>

      {machine?.displayName ? (
        <p className="mt-1 line-clamp-2 text-xs opacity-80">
          {machine.displayName}
        </p>
      ) : null}

      {job?.faultReported ? (
        <p className="mt-2 line-clamp-2 text-xs opacity-80">
          {job.faultReported}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/10 pt-2">
        <span className="text-xs font-bold">
          {formatTimeRangeForDay(
            startTime,
            endTime,
            day,
          )}
        </span>

        <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold capitalize">
          {formatDisplayValue(priority)}
        </span>
      </div>

      {assignment.notes ? (
        <p className="mt-2 line-clamp-2 text-[11px] opacity-70">
          {assignment.notes}
        </p>
      ) : null}
    </button>
  );
}

function StaffEventCard({
  event,
  day,
}: {
  event: StaffCalendarEvent;
  day: Date;
}) {
  const eventType = normaliseValue(
    event.eventType,
  );

  return (
    <article
      className={`rounded-xl border p-3 ${getStaffEventClasses(
        eventType,
      )}`}
    >
      <div className="flex items-start gap-2">
        <CalendarSmallIcon />

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-wide">
            {eventTypeLabels[eventType] ??
              formatDisplayValue(
                eventType,
              )}
          </p>

          <p className="mt-1 text-sm font-bold">
            {event.title}
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs font-semibold">
        {event.allDay
          ? "All day"
          : formatTimeRangeForDay(
              new Date(event.startsAt),
              new Date(event.endsAt),
              day,
            )}
      </p>

      {event.notes ? (
        <p className="mt-2 line-clamp-2 text-xs opacity-75">
          {event.notes}
        </p>
      ) : null}
    </article>
  );
}

function CalendarLoadingState() {
  return (
    <div className="p-5">
      <div className="animate-pulse space-y-4">
        <div className="h-16 rounded-xl bg-slate-100" />

        {Array.from({
          length: 5,
        }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-4 gap-3"
          >
            <div className="h-36 rounded-xl bg-slate-100" />
            <div className="h-36 rounded-xl bg-slate-100" />
            <div className="h-36 rounded-xl bg-slate-100" />
            <div className="h-36 rounded-xl bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
        <WarningIcon />
      </div>

      <h3 className="mt-4 text-lg font-bold text-slate-900">
        Calendar could not be loaded
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-lg bg-[#103d2e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3326]"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyTechniciansState() {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-[#103d2e]">
        <UsersIcon />
      </div>

      <h3 className="mt-4 text-lg font-bold text-slate-900">
        No technicians found
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        Add active technicians or apprentices
        in Administration → Users and assign
        the correct role.
      </p>
    </div>
  );
}

function CalendarLegend() {
  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold text-slate-600">
        <span className="font-bold text-slate-900">
          Priority:
        </span>

        <LegendItem
          dotClassName="bg-red-500"
          label="Urgent"
        />

        <LegendItem
          dotClassName="bg-amber-500"
          label="High"
        />

        <LegendItem
          dotClassName="bg-emerald-600"
          label="Normal"
        />

        <LegendItem
          dotClassName="bg-slate-500"
          label="Low"
        />

        <span className="ml-1 font-bold text-slate-900">
          Staff events:
        </span>

        <LegendItem
          dotClassName="bg-purple-500"
          label="Leave"
        />

        <LegendItem
          dotClassName="bg-blue-500"
          label="Training"
        />

        <LegendItem
          dotClassName="bg-rose-500"
          label="Sickness"
        />
      </div>
    </section>
  );
}

function LegendItem({
  dotClassName,
  label,
}: {
  dotClassName: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full ${dotClassName}`}
      />

      {label}
    </span>
  );
}

function buildWeekDays(
  weekStart: Date,
): CalendarDay[] {
  return Array.from(
    { length: 7 },
    (_, index) => {
      const date = addDays(
        weekStart,
        index,
      );

      return {
        key: formatDateKey(date),
        date,
        dayName:
          new Intl.DateTimeFormat(
            "en-GB",
            {
              weekday: "long",
            },
          ).format(date),
        dayNumber:
          new Intl.DateTimeFormat(
            "en-GB",
            {
              day: "2-digit",
            },
          ).format(date),
        monthName:
          new Intl.DateTimeFormat(
            "en-GB",
            {
              month: "short",
            },
          ).format(date),
        isToday: isSameLocalDay(
          date,
          new Date(),
        ),
      };
    },
  );
}

function getStartOfWeek(date: Date) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  const dayNumber = result.getDay();

  const daysFromMonday =
    dayNumber === 0
      ? -6
      : 1 - dayNumber;

  result.setDate(
    result.getDate() +
      daysFromMonday,
  );

  return result;
}

function addDays(
  date: Date,
  days: number,
) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days,
  );

  return result;
}

function overlapsDay(
  startsAt: string,
  endsAt: string,
  day: Date,
) {
  const itemStart = new Date(
    startsAt,
  );

  const itemEnd = new Date(endsAt);

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = addDays(
    dayStart,
    1,
  );

  return (
    itemStart < dayEnd &&
    itemEnd > dayStart
  );
}

function formatTimeRangeForDay(
  startsAt: Date,
  endsAt: Date,
  day: Date,
) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = addDays(
    dayStart,
    1,
  );

  const startsBeforeDay =
    startsAt < dayStart;

  const endsAfterDay =
    endsAt > dayEnd;

  if (
    startsBeforeDay &&
    endsAfterDay
  ) {
    return "All day";
  }

  if (startsBeforeDay) {
    return `Until ${formatTime(
      endsAt,
    )}`;
  }

  if (endsAfterDay) {
    return `From ${formatTime(
      startsAt,
    )}`;
  }

  return `${formatTime(
    startsAt,
  )}–${formatTime(endsAt)}`;
}

function formatTime(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(date);
}

function formatWeekHeading(
  weekStart: Date,
  weekEnd: Date,
) {
  const startMonth =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        month: "long",
      },
    ).format(weekStart);

  const endMonth =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        month: "long",
      },
    ).format(weekEnd);

  const startYear =
    weekStart.getFullYear();

  const endYear =
    weekEnd.getFullYear();

  if (
    startMonth === endMonth &&
    startYear === endYear
  ) {
    return `${weekStart.getDate()}–${weekEnd.getDate()} ${startMonth} ${startYear}`;
  }

  if (startYear === endYear) {
    return `${weekStart.getDate()} ${startMonth}–${weekEnd.getDate()} ${endMonth} ${startYear}`;
  }

  return `${weekStart.getDate()} ${startMonth} ${startYear}–${weekEnd.getDate()} ${endMonth} ${endYear}`;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameLocalDay(
  firstDate: Date,
  secondDate: Date,
) {
  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
}

function getInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return "AC";
  }

  return words
    .map((word) =>
      word.charAt(0).toUpperCase(),
    )
    .join("");
}

function formatRole(
  role: string | null,
) {
  if (!role) {
    return "Technician";
  }

  return formatDisplayValue(role);
}

function normaliseValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatDisplayValue(
  value: string,
) {
  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

function addHours(
  date: Date,
  hours: number,
) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getPriorityWeight(priority: string) {
  switch (normaliseValue(priority)) {
    case "urgent":
    case "emergency":
    case "critical":
      return 4;
    case "high":
      return 3;
    case "normal":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function getPriorityBadgeClasses(priority: string) {
  switch (normaliseValue(priority)) {
    case "urgent":
    case "emergency":
    case "critical":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-amber-100 text-amber-800";
    case "low":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-emerald-100 text-emerald-800";
  }
}

function formatHours(hours: number) {
  if (!Number.isFinite(hours)) {
    return "0 hrs";
  }

  const roundedHours =
    Math.round(hours * 10) / 10;

  return `${roundedHours} hrs`;
}

function getPriorityClasses(
  priority: string,
) {
  switch (priority) {
    case "urgent":
    case "emergency":
    case "critical":
      return "border-red-200 bg-red-50 text-red-950";

    case "high":
      return "border-amber-200 bg-amber-50 text-amber-950";

    case "low":
      return "border-slate-200 bg-slate-50 text-slate-800";

    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
  }
}

function getStaffEventClasses(
  eventType: string,
) {
  switch (eventType) {
    case "annual_leave":
    case "leave":
    case "holiday":
      return "border-purple-200 bg-purple-50 text-purple-950";

    case "training":
      return "border-blue-200 bg-blue-50 text-blue-950";

    case "sickness":
    case "sick":
      return "border-rose-200 bg-rose-50 text-rose-950";

    case "meeting":
      return "border-cyan-200 bg-cyan-50 text-cyan-950";

    default:
      return "border-slate-200 bg-slate-100 text-slate-800";
  }
}

function getApiErrorMessage(
  value: unknown,
  fallback: string,
) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value
  ) {
    const possibleError = (
      value as {
        error?: unknown;
      }
    ).error;

    if (
      typeof possibleError ===
        "string" &&
      possibleError.trim()
    ) {
      return possibleError;
    }
  }

  return fallback;
}

function isCalendarResponse(
  value: unknown,
): value is CalendarResponse {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const possibleResponse =
    value as Partial<CalendarResponse>;

  return (
    Array.isArray(
      possibleResponse.technicians,
    ) &&
    Array.isArray(
      possibleResponse.assignments,
    ) &&
    Array.isArray(
      possibleResponse.events,
    ) &&
    Array.isArray(
      possibleResponse.jobs,
    ) &&
    Array.isArray(
      possibleResponse.customers,
    ) &&
    Array.isArray(
      possibleResponse.machines,
    )
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function RefreshIcon({
  spinning,
}: {
  spinning: boolean;
}) {
  return (
    <svg
      className={`h-4 w-4 ${
        spinning
          ? "animate-spin"
          : ""
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" />
    </svg>
  );
}

function CalendarSmallIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />

      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 2.9L1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle
        cx="9"
        cy="7"
        r="4"
      />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}