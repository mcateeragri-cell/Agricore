import type { TechnicianLabourEntry } from "@/types/technician";

type LabourCardProps = {
  runningLabour: TechnicianLabourEntry | null;
  labourEntries: TechnicianLabourEntry[];
  elapsedTime: string;
  busy: boolean;
  completed: boolean;
  onToggleLabour: () => void;
};

export default function LabourCard({
  runningLabour,
  labourEntries,
  elapsedTime,
  busy,
  completed,
  onToggleLabour,
}: LabourCardProps) {
  const completedEntries = labourEntries.filter(
    (entry) => entry.entryStatus !== "running",
  );

  const totalHours = completedEntries.reduce(
    (total, entry) => total + Number(entry.hours ?? 0),
    0,
  );

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            Time recording
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-950">
            Labour
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Record technician time spent on this job.
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 px-3 py-2 text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Total
          </p>

          <p className="mt-1 font-bold text-slate-950">
            {formatHours(totalHours)}
          </p>
        </div>
      </div>

      <div
        className={`mt-5 rounded-2xl border p-4 ${
          runningLabour
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Current timer
            </p>

            <p
              className={`mt-1 text-2xl font-bold ${
                runningLabour
                  ? "text-emerald-900"
                  : "text-slate-700"
              }`}
            >
              {runningLabour ? elapsedTime : "Not running"}
            </p>

            {runningLabour ? (
              <div className="mt-2 space-y-1 text-sm text-emerald-800">
                <p>
                  <span className="font-semibold">Engineer:</span>{" "}
                  {runningLabour.engineerName || "Technician"}
                </p>

                <p>
                  <span className="font-semibold">Started:</span>{" "}
                  {formatDateTime(runningLabour.startTime)}
                </p>

                {runningLabour.description ? (
                  <p>
                    <span className="font-semibold">Description:</span>{" "}
                    {runningLabour.description}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Start the timer when beginning work on the machine.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={busy || completed}
            onClick={onToggleLabour}
            className={`min-h-12 rounded-xl px-5 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
              runningLabour
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#103d2e] hover:bg-[#0b2f23]"
            }`}
          >
            {runningLabour ? "Stop labour" : "Start labour"}
          </button>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-bold text-slate-950">
            Labour history
          </h3>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {completedEntries.length}{" "}
            {completedEntries.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {completedEntries.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No completed labour entries yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Completed timer sessions will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {completedEntries.map((entry) => (
              <LabourEntryRow
                key={entry.id}
                entry={entry}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LabourEntryRow({
  entry,
}: {
  entry: TechnicianLabourEntry;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-bold text-slate-950">
            {entry.engineerName || "Technician"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {formatLabourDate(entry.labourDate)}
          </p>
        </div>

        <div className="shrink-0 rounded-lg bg-emerald-50 px-3 py-2 text-right">
          <p className="font-bold text-emerald-800">
            {formatHours(Number(entry.hours ?? 0))}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Detail
          label="Started"
          value={formatTime(entry.startTime)}
        />

        <Detail
          label="Finished"
          value={formatTime(entry.finishTime)}
        />
      </div>

      {entry.description ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Description
          </p>

          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {entry.description}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function formatHours(value: number) {
  if (!Number.isFinite(value)) {
    return "0.00 hrs";
  }

  return `${value.toFixed(2)} hrs`;
}

function formatLabourDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
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