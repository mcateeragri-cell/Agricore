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

  const completed =
    approved ||
    ["completed", "closed", "invoiced"].includes(job);

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

  const steps = [
    "Assigned",
    "Travel",
    "On site",
    "Working",
    "Review",
    "Done",
  ];

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-6 gap-1">
        {steps.map((label, index) => {
          const active = index + 1 <= step;

          return (
            <div key={label} className="text-center">
              <div
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-[#103d2e] text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {index + 1}
              </div>

              <p className="mt-2 text-[10px] font-bold text-slate-500">
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {submitted ? (
        <StatusNotice
          kind="review"
          title="Awaiting office review"
          text="The technician completion has been submitted and is waiting for approval."
        />
      ) : null}

      {approved ? (
        <StatusNotice
          kind="success"
          title="Completion approved"
          text="The office has approved this job completion."
        />
      ) : null}

      {rejected ? (
        <StatusNotice
          kind="error"
          title="Completion returned"
          text="The office has returned this completion for changes."
        />
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
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : kind === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className={`mt-4 rounded-xl border p-3 ${classes}`}>
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs leading-5">{text}</p>
    </div>
  );
}

function normalise(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}