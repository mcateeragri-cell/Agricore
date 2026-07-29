import Link from "next/link";

type RecentJob = {
  job: string;
  customer: string;
  machine: string;
  status:
    | "In progress"
    | "Parts required"
    | "Scheduled"
    | "Completed";
  engineer: string;
};

const recentJobs: RecentJob[] = [
  {
    job: "JOB-1048",
    customer: "R. Davidson & Sons",
    machine: "New Holland T7.200",
    status: "In progress",
    engineer: "James",
  },
  {
    job: "JOB-1047",
    customer: "Hillview Farm",
    machine: "JCB 531-70",
    status: "Parts required",
    engineer: "Aiden",
  },
  {
    job: "JOB-1046",
    customer: "Ballymore Dairy",
    machine: "Milking parlour",
    status: "Scheduled",
    engineer: "James",
  },
  {
    job: "JOB-1045",
    customer: "D. McConnell",
    machine: "John Deere 6155R",
    status: "Completed",
    engineer: "Aiden",
  },
];

function StatusBadge({
  status,
}: {
  status: RecentJob["status"];
}) {
  const styles: Record<RecentJob["status"], string> = {
    "In progress":
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "Parts required":
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    Scheduled:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    Completed:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function MobileJobCard({ job }: { job: RecentJob }) {
  return (
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
  );
}

export default function RecentJobs() {
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
            Latest workshop and field-service activity
          </p>
        </div>

        <Link
          href="/jobs"
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          View all
        </Link>
      </header>

      {recentJobs.length === 0 ? (
        <div className="p-8 text-center">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            No recent jobs
          </p>

          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            New workshop and field-service jobs will appear
            here.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-200 lg:hidden dark:divide-slate-800">
            {recentJobs.map((job) => (
              <MobileJobCard key={job.job} job={job} />
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
                    key={job.job}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/70"
                  >
                    <td className="px-5 py-4 font-bold text-emerald-700 dark:text-emerald-400">
                      {job.job}
                    </td>

                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">
                      {job.customer}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-400">
                      {job.machine}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={job.status} />
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