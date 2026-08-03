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
    <header className="overflow-hidden rounded-[2rem] border border-emerald-900/20 bg-gradient-to-br from-[#0b4b38] via-[#0d5a43] to-[#103d2e] text-white shadow-xl">
      <div className="p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
          {jobNumber}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {customerName}
        </h1>
        <p className="mt-1 text-base font-bold text-emerald-100">
          {machineName}
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-200">
            Scheduled
          </p>
          <p className="mt-1 text-lg font-black">
            {formatRange(scheduledStart, scheduledEnd)}
          </p>
        </div>
      </div>
    </header>
  );
}

function formatRange(startValue: string, endValue: string) {
  return `${formatDate(startValue)} · ${formatTime(startValue)}–${formatTime(endValue)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Schedule not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
