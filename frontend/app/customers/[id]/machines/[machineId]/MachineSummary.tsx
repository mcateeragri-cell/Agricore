import Card from "../../../../../Components/ui/Card";

type MachineSummaryProps = {
  openJobs?: number;
  completedJobs?: number;
  lastService?: string;
};

export default function MachineSummary({
  openJobs = 0,
  completedJobs = 0,
  lastService = "Not recorded",
}: MachineSummaryProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">Machine summary</h2>

      <div className="mt-5 space-y-4">
        <SummaryItem label="Open jobs" value={String(openJobs)} />
        <SummaryItem label="Completed jobs" value={String(completedJobs)} />
        <SummaryItem label="Last service" value={lastService} compact />
      </div>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 font-bold ${compact ? "" : "text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}
