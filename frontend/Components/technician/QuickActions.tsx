type QuickActionsProps = {
  travelling: boolean;
  arrived: boolean;
  working: boolean;
  completed: boolean;
  busy: boolean;
  hasRunningLabour: boolean;
  elapsedTime: string;
  partsCount: number;
  onStartTravel: () => void;
  onArrive: () => void;
  onToggleLabour: () => void;
  onOpenParts: () => void;
};

export default function QuickActions({
  travelling,
  arrived,
  working,
  completed,
  busy,
  hasRunningLabour,
  elapsedTime,
  partsCount,
  onStartTravel,
  onArrive,
  onToggleLabour,
  onOpenParts,
}: QuickActionsProps) {
  const primary = completed
    ? null
    : travelling
      ? {
          label: "Arrived on site",
          detail: "Record arrival and move to on-site status",
          onClick: onArrive,
        }
      : arrived || working
        ? {
            label: hasRunningLabour ? "Stop labour" : "Start labour",
            detail: hasRunningLabour ? elapsedTime : "Start the work timer",
            onClick: onToggleLabour,
          }
        : {
            label: "Start travel",
            detail: "Begin the journey to this job",
            onClick: onStartTravel,
          };

  return (
    <section className="mt-4 rounded-3xl border border-white/50 bg-white/90 p-5 shadow-lg backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/85">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
        Next action
      </p>

      {primary ? (
        <button
          type="button"
          disabled={busy}
          onClick={primary.onClick}
          className="mt-3 min-h-20 w-full rounded-2xl bg-[#0c4a3a] px-5 text-left text-white shadow-sm transition hover:bg-[#083c2f] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <p className="text-xl font-black">{primary.label}</p>
          <p className="mt-1 text-sm font-semibold text-emerald-100">
            {primary.detail}
          </p>
        </button>
      ) : (
        <div className="mt-3 rounded-2xl bg-emerald-50 p-5 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          <p className="font-black">Job workflow complete</p>
          <p className="mt-1 text-sm">No further live actions are required.</p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <SecondaryAction
          label={hasRunningLabour ? "Labour running" : "Labour"}
          detail={hasRunningLabour ? elapsedTime : "Timer controls"}
          disabled={completed || busy}
          onClick={onToggleLabour}
        />
        <SecondaryAction
          label="Parts used"
          detail={`${partsCount} recorded`}
          onClick={onOpenParts}
        />
      </div>
    </section>
  );
}

function SecondaryAction({
  label,
  detail,
  disabled,
  onClick,
}: {
  label: string;
  detail: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-16 rounded-2xl border border-slate-300 bg-white p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
    >
      <p className="font-black text-slate-950 dark:text-white">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </button>
  );
}
