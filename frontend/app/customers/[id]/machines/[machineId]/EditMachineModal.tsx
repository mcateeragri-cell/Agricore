import type { FormEvent } from "react";
import Card from "../../../../../Components/ui/Card";
import Button from "../../../../../Components/ui/Button";
import type { MachineForm } from "./types";

type EditMachineModalProps = {
  form: MachineForm;
  isSaving: boolean;
  errorMessage: string;
  onChange: (field: keyof MachineForm, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function EditMachineModal({
  form,
  isSaving,
  errorMessage,
  onChange,
  onClose,
  onSubmit,
}: EditMachineModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 md:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <Card className="my-4 w-full max-w-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold">Edit machine</h2>
            <p className="text-sm text-slate-500">
              Update the machine&apos;s details.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close edit machine form"
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

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Make *">
              <input
                required
                value={form.make}
                onChange={(event) => onChange("make", event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Model *">
              <input
                required
                value={form.model}
                onChange={(event) => onChange("model", event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Machine type">
              <select
                value={form.machineType}
                onChange={(event) =>
                  onChange("machineType", event.target.value)
                }
                className={inputClassName}
              >
                <option>Tractor</option>
                <option>Telehandler</option>
                <option>Loader</option>
                <option>Excavator</option>
                <option>Combine</option>
                <option>Forage harvester</option>
                <option>Implement</option>
                <option>Trailer</option>
                <option>Dairy equipment</option>
                <option>Other</option>
              </select>
            </Field>

            <Field label="Year">
              <input
                type="number"
                min="1900"
                max="2100"
                value={form.year}
                onChange={(event) => onChange("year", event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Registration">
              <input
                value={form.registration}
                onChange={(event) =>
                  onChange("registration", event.target.value.toUpperCase())
                }
                className={`${inputClassName} uppercase`}
              />
            </Field>

            <Field label="Serial number">
              <input
                value={form.serialNumber}
                onChange={(event) =>
                  onChange("serialNumber", event.target.value)
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Current hours">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.hours}
                onChange={(event) => onChange("hours", event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Usage level">
              <select
                value={form.usageProfile}
                onChange={(event) => {
                  const profile = event.target.value;
                  onChange("usageProfile", profile);
                  onChange(
                    "estimatedHoursPerWeek",
                    profile === "light" ? "10" : profile === "heavy" ? "50" : "25",
                  );
                }}
                className={inputClassName}
              >
                <option value="light">Light usage</option>
                <option value="medium">Medium usage</option>
                <option value="heavy">Heavy usage</option>
              </select>
            </Field>

            <Field label="Estimated hours per week">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.estimatedHoursPerWeek}
                onChange={(event) =>
                  onChange("estimatedHoursPerWeek", event.target.value)
                }
                className={inputClassName}
              />
            </Field>

            <label className="text-sm font-semibold md:col-span-2">
              Machine notes
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                className={`${inputClassName} resize-none`}
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
              {isSaving ? "Saving changes..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}
