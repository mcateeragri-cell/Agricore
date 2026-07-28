const recentJobs = [
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "In progress": "bg-blue-100 text-blue-700",
    "Parts required": "bg-amber-100 text-amber-700",
    Scheduled: "bg-purple-100 text-purple-700",
    Completed: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

export default function RecentJobs() {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="font-bold">Recent jobs</h2>
          <p className="text-xs text-slate-500">
            Latest workshop and field-service activity
          </p>
        </div>

        <button
          type="button"
          className="text-sm font-semibold text-[#176b4d]"
        >
          View all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Job</th>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Machine</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Engineer</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm">
            {recentJobs.map((job) => (
              <tr key={job.job} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-semibold text-[#176b4d]">
                  {job.job}
                </td>

                <td className="px-5 py-4">{job.customer}</td>

                <td className="px-5 py-4 text-slate-600">{job.machine}</td>

                <td className="px-5 py-4">
                  <StatusBadge status={job.status} />
                </td>

                <td className="px-5 py-4">{job.engineer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}