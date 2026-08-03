type JobWorkflowProps = {
  assignmentStatus: string;
  jobStatus: string;
  completionStatus?: string | null;
};

export default function JobWorkflow({
  assignmentStatus,
  jobStatus,
  completionStatus,
}: JobWorkflowProps) {
  const assignment = normalise(assignmentStatus);
  const job = normalise(jobStatus);
  const completion = normalise(completionStatus ?? "");

  const submitted = completion === "submitted";
  const approved = completion === "approved";
  const rejected = completion === "rejected";
  const completed = approved || ["completed", "closed", "invoiced"].includes(job);

  const step = completed
    ? 6
    : submitted
      ? 5
      : assignment === "in_progress"
        ? 4
        : assignment === "confirmed"
          ? 3
          : assignment === "travelling"
            ? 2
            : 1;

  const steps = ["Assigned", "Travel", "On site", "Working", "Review", "Done"];

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-white/50 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/85">
      <div className="flex items-start justify-between gap-1 overflow-x-auto pb-1">
        {steps.map((label, index) => {
          const active = index + 1 <= step;
          const current = index + 1 === step;

          return (
            <div key={label} className="min-w-[54px] flex-1 text-center">
              <div
                className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition ${
                  current
                    ? "bg-[#0c4a3a] text-white ring-4 ring-emerald-100 dark:ring-emerald-950"
                    : active
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {active && !current ? "✓" : index + 1}
              </div>
              <p className={`mt-2 text-[10px] font-black ${current ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {submitted ? (
        <StatusNotice kind="review" title="Awaiting office review" text="The completed job has been submitted to the office." />
      ) : null}
      {approved ? (
        <StatusNotice kind="success" title="Completion approved" text="The office has approved this job completion." />
      ) : null}
      {rejected ? (
        <StatusNotice kind="error" title="Completion returned" text="The office has returned this completion for changes." />
      ) : null}
    </section>
  );
}

function StatusNotice({
  kind,
  title,
  text,
}: {
  kind: "review" | "success" | "error";
  title: string;
  text: string;
}) {
  const classes =
    kind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
      : kind === "error"
        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
        : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200";

  return (
    <div className={`mt-4 rounded-2xl border p-4 ${classes}`}>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5">{text}</p>
    </div>
  );
}

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}
