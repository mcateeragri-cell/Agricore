import Link from "next/link";

type ScheduleItem = {
  time: string;
  title: string;
  location: string;
  colour: string;
};

const schedule: ScheduleItem[] = [
  {
    time: "08:30",
    title: "New Holland T7.200 diagnostics",
    location: "R. Davidson & Sons",
    colour: "border-blue-500",
  },
  {
    time: "12:00",
    title: "Collect hydraulic parts",
    location: "Banbridge supplier",
    colour: "border-amber-500",
  },
  {
    time: "14:30",
    title: "JCB telehandler service",
    location: "Hillview Farm",
    colour: "border-emerald-500",
  },
];

export default function Schedule() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Planner
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            Today&apos;s schedule
          </h2>

          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Tuesday, 21 July
          </p>
        </div>

        <Link
          href="/calendar"
          className="rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          Calendar
        </Link>
      </header>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {schedule.map((item) => (
          <article
            key={`${item.time}-${item.title}`}
            className="flex gap-4 p-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
          >
            <div className="w-16 shrink-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {item.time}
              </p>
            </div>

            <div
              className={`flex-1 border-l-4 ${item.colour} pl-4`}
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {item.title}
              </h3>

              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                {item.location}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}