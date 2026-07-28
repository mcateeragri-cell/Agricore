import type { FormEvent } from "react";
import Card from "../../../../../Components/ui/Card";
import Button from "../../../../../Components/ui/Button";
import type { HourReadingForm, Machine } from "./types";

type RecordHoursModalProps = {
  machine: Machine;
  form: HourReadingForm;
  isSaving: boolean;
  errorMessage: string;
  onChange: (field: keyof HourReadingForm, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function RecordHoursModal({
  machine,
  form,
  isSaving,
  errorMessage,
  onChange,
  onClose,
  onSubmit,
}: RecordHoursModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 md:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <Card className="my-4 w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold">Record machine hours</h2>
            <p className="text-sm text-slate-500">
              Add a new hour-meter reading for {machine.make} {machine.model}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close hour form"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          {errorMessage && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Current hours *
              <input
                required
                type="number"
                min="0"
                step="0.1"
                value={form.hours}
                onChange={(event) => onChange("hours", event.target.value)}
                className={inputClassName}
                placeholder="e.g. 6482"
              />
            </label>

            <label className="text-sm font-semibold">
              Reading date *
              <input
                required
                type="date"
                value={form.readingDate}
                onChange={(event) =>
                  onChange("readingDate", event.target.value)
                }
                className={inputClassName}
              />
            </label>

            <label className="text-sm font-semibold sm:col-span-2">
              Reading source
              <select
                value={form.source}
                onChange={(event) => onChange("source", event.target.value)}
                className={inputClassName}
              >
                <option value="manual">Entered manually</option>
                <option value="job_card">Recorded during job</option>
                <option value="service">Recorded during service</option>
                <option value="customer">Supplied by customer</option>
              </select>
            </label>

            <label className="text-sm font-semibold sm:col-span-2">
              Notes
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                className={`${inputClassName} resize-none`}
                placeholder="For example: reading taken during callout"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving reading..." : "Save hour reading"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10";
