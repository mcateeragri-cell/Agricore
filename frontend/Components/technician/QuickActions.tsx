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
  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">
        Quick actions
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <ActionButton
          label="Start travel"
          detail={travelling ? "Travelling" : "Set travelling"}
          disabled={
            completed ||
            travelling ||
            arrived ||
            working ||
            busy
          }
          onClick={onStartTravel}
        />

        <ActionButton
          label="Arrive"
          detail={
            arrived || working
              ? "Arrival recorded"
              : "Record arrival"
          }
          disabled={
            completed ||
            arrived ||
            working ||
            busy
          }
          onClick={onArrive}
        />

        <ActionButton
          label={
            hasRunningLabour
              ? "Stop labour"
              : "Start labour"
          }
          detail={
            hasRunningLabour
              ? elapsedTime
              : "Start timer"
          }
          disabled={completed || busy}
          onClick={onToggleLabour}
        />

        <ActionButton
          label="Parts used"
          detail={`${partsCount} recorded`}
          disabled={false}
          onClick={onOpenParts}
        />
      </div>
    </section>
  );
}

function ActionButton({
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
      className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <p className="font-bold text-slate-950">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {detail}
      </p>
    </button>
  );
}