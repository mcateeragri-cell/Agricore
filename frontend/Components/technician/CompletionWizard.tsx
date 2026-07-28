"use client";

import { useMemo } from "react";

import SignaturePad from "@/Components/technician/SignaturePad";

export type CompletionForm = {
  diagnosis: string;
  workCarriedOut: string;

  customerName: string;
  customerPosition: string;
  customerConfirmation: boolean;

  signatureDataUrl: string | null;
  signatureStoragePath: string | null;

  machineTested: boolean;
  guardsFitted: boolean;
  areaLeftTidy: boolean;
  customerInstructed: boolean;
  photosChecked: boolean;
  partsChecked: boolean;
  labourChecked: boolean;

  technicianNotes: string;
};

export type JobCompletion = CompletionForm & {
  id: string;
  jobId: string;
  assignmentId: string | null;
  submittedBy: string;
  technicianName: string;

  officeNotes: string;
  rejectionReason: string;

  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CompletionWizardProps = {
  open: boolean;
  step: number;
  form: CompletionForm;
  completion: JobCompletion | null;
  saving: boolean;
  submitting: boolean;
  error: string;
  photoCount: number;
  partsCount: number;
  labourCount: number;
  onChange: (form: CompletionForm) => void;
  onStepChange: (step: number) => void;
  onClose: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
};

const TOTAL_STEPS = 6;

export default function CompletionWizard({
  open,
  step,
  form,
  completion,
  saving,
  submitting,
  error,
  photoCount,
  partsCount,
  labourCount,
  onChange,
  onStepChange,
  onClose,
  onSaveDraft,
  onSubmit,
}: CompletionWizardProps) {
  const busy = saving || submitting;

  const canContinue = useMemo(() => {
    if (step === 1) {
      return Boolean(
        form.diagnosis.trim() &&
          form.workCarriedOut.trim(),
      );
    }

    if (step === 2) {
      return (
        form.photosChecked &&
        form.partsChecked &&
        form.labourChecked
      );
    }

    if (step === 3) {
      return (
        form.machineTested &&
        form.guardsFitted &&
        form.areaLeftTidy
      );
    }

    if (step === 4) {
      return Boolean(
        form.customerName.trim() &&
          form.customerConfirmation,
      );
    }

    if (step === 5) {
      return Boolean(
        form.signatureDataUrl ||
          form.signatureStoragePath,
      );
    }

    return true;
  }, [form, step]);

  const canSubmit =
    Boolean(form.diagnosis.trim()) &&
    Boolean(form.workCarriedOut.trim()) &&
    Boolean(form.customerName.trim()) &&
    form.customerConfirmation &&
    Boolean(
      form.signatureDataUrl ||
        form.signatureStoragePath,
    ) &&
    form.machineTested &&
    form.guardsFitted &&
    form.areaLeftTidy &&
    form.photosChecked &&
    form.partsChecked &&
    form.labourChecked;

  if (!open) {
    return null;
  }

  function updateForm(
    updates: Partial<CompletionForm>,
  ) {
    onChange({
      ...form,
      ...updates,
    });
  }

  function goBack() {
    onStepChange(Math.max(1, step - 1));
  }

  function goForward() {
    if (!canContinue) {
      return;
    }

    onStepChange(
      Math.min(TOTAL_STEPS, step + 1),
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Job completion wizard"
    >
      <div className="flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                Job completion
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {getStepTitle(step)}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Step {step} of {TOTAL_STEPS}
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid grid-cols-6 gap-1.5">
            {Array.from(
              { length: TOTAL_STEPS },
              (_, index) => {
                const itemStep = index + 1;
                const active = itemStep <= step;

                return (
                  <div
                    key={itemStep}
                    className={`h-2 rounded-full ${
                      active
                        ? "bg-[#103d2e]"
                        : "bg-slate-200"
                    }`}
                  />
                );
              },
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {completion?.status === "rejected" &&
          completion.rejectionReason ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                Returned by office
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800">
                {completion.rejectionReason}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {step === 1 ? (
            <WorkDetailsStep
              form={form}
              onChange={updateForm}
            />
          ) : null}

          {step === 2 ? (
            <RecordsReviewStep
              form={form}
              photoCount={photoCount}
              partsCount={partsCount}
              labourCount={labourCount}
              onChange={updateForm}
            />
          ) : null}

          {step === 3 ? (
            <SafetyChecklistStep
              form={form}
              onChange={updateForm}
            />
          ) : null}

          {step === 4 ? (
            <CustomerConfirmationStep
              form={form}
              onChange={updateForm}
            />
          ) : null}

          {step === 5 ? (
            <SignatureStep
              form={form}
              busy={busy}
              onChange={updateForm}
            />
          ) : null}

          {step === 6 ? (
            <FinalReviewStep
              form={form}
              photoCount={photoCount}
              partsCount={partsCount}
              labourCount={labourCount}
            />
          ) : null}
        </div>

        <footer className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={onSaveDraft}
              className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 disabled:opacity-40 sm:flex-1"
            >
              {saving
                ? "Saving draft…"
                : "Save draft"}
            </button>

            <div className="flex gap-3 sm:flex-[2]">
              {step > 1 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={goBack}
                  className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 disabled:opacity-40"
                >
                  Back
                </button>
              ) : null}

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  disabled={busy || !canContinue}
                  onClick={goForward}
                  className="min-h-12 flex-1 rounded-xl bg-[#103d2e] px-4 font-bold text-white disabled:opacity-40"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || !canSubmit}
                  onClick={onSubmit}
                  className="min-h-12 flex-1 rounded-xl bg-emerald-600 px-4 font-bold text-white disabled:opacity-40"
                >
                  {submitting
                    ? "Submitting…"
                    : "Submit for office review"}
                </button>
              )}
            </div>
          </div>

          {!canContinue && step < TOTAL_STEPS ? (
            <p className="mt-3 text-center text-xs font-semibold text-amber-700">
              Complete all required fields before continuing.
            </p>
          ) : null}

          {step === TOTAL_STEPS &&
          !canSubmit ? (
            <p className="mt-3 text-center text-xs font-semibold text-amber-700">
              One or more required completion items are still missing.
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

function WorkDetailsStep({
  form,
  onChange,
}: {
  form: CompletionForm;
  onChange: (
    updates: Partial<CompletionForm>,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <IntroText>
        Record what caused the fault and the work completed
        before submitting the job card.
      </IntroText>

      <TextAreaField
        label="Diagnosis"
        value={form.diagnosis}
        rows={7}
        required
        placeholder="Describe the fault found and its cause."
        onChange={(diagnosis) =>
          onChange({ diagnosis })
        }
      />

      <TextAreaField
        label="Work carried out"
        value={form.workCarriedOut}
        rows={8}
        required
        placeholder="Describe repairs, adjustments, testing and other work completed."
        onChange={(workCarriedOut) =>
          onChange({ workCarriedOut })
        }
      />

      <TextAreaField
        label="Technician notes"
        value={form.technicianNotes}
        rows={4}
        placeholder="Optional notes for the office."
        onChange={(technicianNotes) =>
          onChange({ technicianNotes })
        }
      />
    </div>
  );
}

function RecordsReviewStep({
  form,
  photoCount,
  partsCount,
  labourCount,
  onChange,
}: {
  form: CompletionForm;
  photoCount: number;
  partsCount: number;
  labourCount: number;
  onChange: (
    updates: Partial<CompletionForm>,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <IntroText>
        Confirm the supporting records are correct before the
        job is sent to the office.
      </IntroText>

      <ChecklistItem
        checked={form.photosChecked}
        title="Job photos reviewed"
        description={`${photoCount} uploaded photo${
          photoCount === 1 ? "" : "s"
        } recorded.`}
        onChange={(photosChecked) =>
          onChange({ photosChecked })
        }
      />

      <ChecklistItem
        checked={form.partsChecked}
        title="Parts used reviewed"
        description={`${partsCount} part line${
          partsCount === 1 ? "" : "s"
        } recorded.`}
        onChange={(partsChecked) =>
          onChange({ partsChecked })
        }
      />

      <ChecklistItem
        checked={form.labourChecked}
        title="Labour entries reviewed"
        description={`${labourCount} labour entr${
          labourCount === 1 ? "y" : "ies"
        } recorded.`}
        onChange={(labourChecked) =>
          onChange({ labourChecked })
        }
      />
    </div>
  );
}

function SafetyChecklistStep({
  form,
  onChange,
}: {
  form: CompletionForm;
  onChange: (
    updates: Partial<CompletionForm>,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <IntroText>
        Complete the technician handover and safety checks.
      </IntroText>

      <ChecklistItem
        checked={form.machineTested}
        title="Machine tested"
        description="The machine or system has been tested following the repair."
        onChange={(machineTested) =>
          onChange({ machineTested })
        }
      />

      <ChecklistItem
        checked={form.guardsFitted}
        title="Guards and covers refitted"
        description="All removed guards, covers and safety devices have been refitted."
        onChange={(guardsFitted) =>
          onChange({ guardsFitted })
        }
      />

      <ChecklistItem
        checked={form.areaLeftTidy}
        title="Work area left tidy"
        description="Tools, waste materials and removed components have been cleared."
        onChange={(areaLeftTidy) =>
          onChange({ areaLeftTidy })
        }
      />

      <ChecklistItem
        checked={form.customerInstructed}
        title="Customer instructed"
        description="Any relevant operating, maintenance or follow-up instructions were explained."
        optional
        onChange={(customerInstructed) =>
          onChange({ customerInstructed })
        }
      />
    </div>
  );
}

function CustomerConfirmationStep({
  form,
  onChange,
}: {
  form: CompletionForm;
  onChange: (
    updates: Partial<CompletionForm>,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <IntroText>
        Enter the details of the customer or representative
        accepting the completed work.
      </IntroText>

      <TextField
        label="Customer name"
        value={form.customerName}
        required
        placeholder="Full name"
        onChange={(customerName) =>
          onChange({ customerName })
        }
      />

      <TextField
        label="Position or role"
        value={form.customerPosition}
        placeholder="For example: Owner, farm manager or operator"
        onChange={(customerPosition) =>
          onChange({ customerPosition })
        }
      />

      <ChecklistItem
        checked={form.customerConfirmation}
        title="Customer completion confirmation"
        description="I confirm that the work described has been completed and the machine or system has been returned to me."
        onChange={(customerConfirmation) =>
          onChange({ customerConfirmation })
        }
      />
    </div>
  );
}

function SignatureStep({
  form,
  busy,
  onChange,
}: {
  form: CompletionForm;
  busy: boolean;
  onChange: (
    updates: Partial<CompletionForm>,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <IntroText>
        Ask the customer or representative to sign below.
      </IntroText>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Signing as
        </p>

        <p className="mt-1 font-bold text-slate-950">
          {form.customerName ||
            "Customer name not entered"}
        </p>

        {form.customerPosition ? (
          <p className="mt-1 text-sm text-slate-600">
            {form.customerPosition}
          </p>
        ) : null}
      </div>

      <SignaturePad
        value={form.signatureDataUrl}
        disabled={busy}
        onChange={(signatureDataUrl) =>
          onChange({
            signatureDataUrl,
            signatureStoragePath:
              signatureDataUrl
                ? null
                : form.signatureStoragePath,
          })
        }
      />
    </div>
  );
}

function FinalReviewStep({
  form,
  photoCount,
  partsCount,
  labourCount,
}: {
  form: CompletionForm;
  photoCount: number;
  partsCount: number;
  labourCount: number;
}) {
  return (
    <div className="space-y-4">
      <IntroText>
        Review the completion details before submitting the job
        to the office.
      </IntroText>

      <ReviewBlock
        label="Diagnosis"
        value={form.diagnosis}
      />

      <ReviewBlock
        label="Work carried out"
        value={form.workCarriedOut}
      />

      <ReviewBlock
        label="Customer"
        value={[
          form.customerName,
          form.customerPosition,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="grid grid-cols-3 gap-3">
        <ReviewStat
          label="Photos"
          value={String(photoCount)}
        />

        <ReviewStat
          label="Parts"
          value={String(partsCount)}
        />

        <ReviewStat
          label="Labour"
          value={String(labourCount)}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Completion checks
        </p>

        <div className="mt-3 space-y-2">
          <ReviewCheck
            label="Machine tested"
            checked={form.machineTested}
          />
          <ReviewCheck
            label="Guards refitted"
            checked={form.guardsFitted}
          />
          <ReviewCheck
            label="Area left tidy"
            checked={form.areaLeftTidy}
          />
          <ReviewCheck
            label="Photos reviewed"
            checked={form.photosChecked}
          />
          <ReviewCheck
            label="Parts reviewed"
            checked={form.partsChecked}
          />
          <ReviewCheck
            label="Labour reviewed"
            checked={form.labourChecked}
          />
          <ReviewCheck
            label="Customer confirmation"
            checked={form.customerConfirmation}
          />
          <ReviewCheck
            label="Customer signature"
            checked={Boolean(
              form.signatureDataUrl ||
                form.signatureStoragePath,
            )}
          />
        </div>
      </div>

      {form.technicianNotes ? (
        <ReviewBlock
          label="Technician notes"
          value={form.technicianNotes}
        />
      ) : null}

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-bold text-emerald-900">
          Ready for office review
        </p>

        <p className="mt-1 text-sm leading-6 text-emerald-800">
          Submitting will stop any running labour timer,
          complete the technician assignment and send the job
          to the office for approval.
        </p>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-800">
        {label}
        {required ? (
          <span className="text-red-600"> *</span>
        ) : null}
      </span>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
  rows,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  rows: number;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-800">
        {label}
        {required ? (
          <span className="text-red-600"> *</span>
        ) : null}
      </span>

      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function ChecklistItem({
  checked,
  title,
  description,
  optional = false,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  optional?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
        checked
          ? "border-emerald-300 bg-emerald-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-1 h-5 w-5 shrink-0 accent-[#103d2e]"
      />

      <span className="min-w-0">
        <span className="block font-bold text-slate-950">
          {title}

          {optional ? (
            <span className="ml-2 text-xs font-semibold text-slate-500">
              Optional
            </span>
          ) : null}
        </span>

        <span className="mt-1 block text-sm leading-6 text-slate-600">
          {description}
        </span>
      </span>
    </label>
  );
}

function ReviewBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
        {value || "Not recorded"}
      </p>
    </div>
  );
}

function ReviewStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function ReviewCheck({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-700">{label}</span>

      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
          checked
            ? "bg-emerald-100 text-emerald-800"
            : "bg-red-100 text-red-700"
        }`}
      >
        {checked ? "Confirmed" : "Missing"}
      </span>
    </div>
  );
}

function IntroText({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-sm leading-6 text-slate-600">
      {children}
    </p>
  );
}

function getStepTitle(step: number) {
  switch (step) {
    case 1:
      return "Diagnosis and work";
    case 2:
      return "Records review";
    case 3:
      return "Technician checklist";
    case 4:
      return "Customer confirmation";
    case 5:
      return "Customer signature";
    case 6:
      return "Final review";
    default:
      return "Job completion";
  }
}