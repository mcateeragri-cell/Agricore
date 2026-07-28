import Card from "../../../../../Components/ui/Card";

type JobsPreviewProps = {
  onCreateJob?: () => void;
};

export default function JobsPreview({ onCreateJob }: JobsPreviewProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Recent jobs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Work recorded against this machine.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateJob}
          className="text-sm font-semibold text-[#176b4d] hover:underline"
        >
          + Create job
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <p className="font-semibold text-slate-700">No jobs recorded</p>
        <p className="mt-1 text-sm text-slate-500">
          Job cards for this machine will appear here.
        </p>
      </div>
    </Card>
  );
}
