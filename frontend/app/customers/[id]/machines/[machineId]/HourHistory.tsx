import Card from "../../../../../Components/ui/Card";
import Button from "../../../../../Components/ui/Button";
import type { HourReading } from "./types";

type HourHistoryProps = {
  readings: HourReading[];
  onRecordHours: () => void;
};

export default function HourHistory({
  readings,
  onRecordHours,
}: HourHistoryProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold">Hour history</h2>
          <p className="mt-1 text-sm text-slate-500">
            Recorded hour-meter readings for this machine.
          </p>
        </div>

        <Button type="button" onClick={onRecordHours}>
          + Record hours
        </Button>
      </div>

      {readings.length === 0 ? (
        <div className="p-10 text-center">
          <p className="font-semibold text-slate-700">
            No hour readings recorded
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Record the current hours to begin tracking machine usage.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Hours</th>
                <th className="px-6 py-3 font-semibold">Increase</th>
                <th className="px-6 py-3 font-semibold">Source</th>
                <th className="px-6 py-3 font-semibold">Notes</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {readings.map((reading, index) => {
                const previousReading = readings[index + 1];
                const increase = previousReading
                  ? reading.hours - previousReading.hours
                  : null;

                return (
                  <tr key={reading.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      {formatReadingDate(reading.readingDate)}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {reading.hours.toLocaleString()} hrs
                    </td>
                    <td className="px-6 py-4">
                      {increase === null
                        ? "Opening reading"
                        : `+${increase.toLocaleString()} hrs`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                        {reading.source.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {reading.notes || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function formatReadingDate(value: string) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
