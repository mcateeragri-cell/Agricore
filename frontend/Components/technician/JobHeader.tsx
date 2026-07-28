type JobHeaderProps = {
  jobNumber: string;
  customerName: string;
  machineName: string;
  scheduledStart: string;
  scheduledEnd: string;
};

export default function JobHeader({
  jobNumber,
  customerName,
  machineName,
  scheduledStart,
  scheduledEnd,
}: JobHeaderProps) {
  return (
    <header className="overflow-hidden rounded-3xl bg-[#103d2e] text-white shadow-sm">
      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
          {jobNumber}
        </p>

        <h1 className="mt-2 text-2xl font-bold">
          {customerName}
        </h1>

        <p className="mt-1 text-sm text-emerald-100">
          {machineName}
        </p>

        <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">
            Scheduled
          </p>

          <p className="mt-1 font-bold">
            {formatRange(
              scheduledStart,
              scheduledEnd,
            )}
          </p>
        </div>
      </div>
    </header>
  );
}

function formatRange(
  startValue: string,
  endValue: string,
) {
  return `${formatDate(startValue)} · ${formatTime(
    startValue,
  )}–${formatTime(endValue)}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Schedule not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
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