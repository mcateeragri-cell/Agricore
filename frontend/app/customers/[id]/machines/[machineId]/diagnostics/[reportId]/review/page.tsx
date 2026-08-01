"use client";

import Link from "next/link";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

type ReportResponse = {
  report?: {
    id: string;
    original_filename: string;
    source_system: string;
    import_status: string;
    report_date: string | null;
    reported_hours: number | null;
    machine_serial_number: string | null;
    machine_registration: string | null;
    extracted_data?: {
      result?: {
        manufacturer?: string;
        machine?: {
          make?: string;
          model?: string;
          serialNumber?: string;
          registration?: string;
        };
        hours?: number | null;
        reportDate?: string | null;
        confidence?: number;
        controllers?: Array<{
          name: string;
        }>;
        softwareVersions?: Array<{
          controller: string;
          version: string;
        }>;
        warnings?: string[];
      };
    };
  };
  faults?: Array<{
    id: string;
    fault_code: string;
    description: string | null;
    control_unit: string | null;
    status: string;
    severity: string;
  }>;
  error?: string;
};

function cleanDate(value?: string | null) {
  return value
    ? value.slice(0, 10)
    : "";
}

export default function DiagnosticReviewPage() {
  const params = useParams<{
    id: string;
    machineId: string;
    reportId: string;
  }>();

  const router = useRouter();

  const customerId = params.id;
  const machineId = params.machineId;
  const reportId = params.reportId;

  const [data, setData] =
    useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [form, setForm] = useState({
    make: "",
    model: "",
    serialNumber: "",
    registration: "",
    hours: "",
    reportDate: "",
    updateMachineIdentity: true,
    saveHourReading: true,
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/machines/${machineId}/diagnostics/${reportId}/review`,
          {
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as ReportResponse;

        if (!response.ok || !result.report) {
          throw new Error(
            result.error ||
              "Unable to load diagnostic result.",
          );
        }

        setData(result);

        const parsed =
          result.report.extracted_data?.result;

        setForm({
          make:
            parsed?.machine?.make ||
            parsed?.manufacturer ||
            "",
          model:
            parsed?.machine?.model || "",
          serialNumber:
            parsed?.machine?.serialNumber ||
            result.report.machine_serial_number ||
            "",
          registration:
            parsed?.machine?.registration ||
            result.report.machine_registration ||
            "",
          hours:
            parsed?.hours !== null &&
            parsed?.hours !== undefined
              ? String(parsed.hours)
              : result.report.reported_hours !== null
                ? String(result.report.reported_hours)
                : "",
          reportDate: cleanDate(
            parsed?.reportDate ||
              result.report.report_date,
          ),
          updateMachineIdentity: true,
          saveHourReading: true,
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load diagnostic result.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [machineId, reportId]);

  const parsed = data?.report?.extracted_data?.result;

  const confidence = useMemo(
    () => parsed?.confidence ?? 0,
    [parsed?.confidence],
  );

  function updateField(
    field: keyof typeof form,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/machines/${machineId}/diagnostics/${reportId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to approve diagnostic result.",
        );
      }

      setSuccessMessage(
        result.message ||
          "Diagnostic result approved.",
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to approve diagnostic result.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="p-6 lg:p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          Loading diagnostic result...
        </div>
      </main>
    );
  }

  if (!data?.report) {
    return (
      <main className="p-6 lg:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {errorMessage || "Diagnostic report not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6 lg:p-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href={`/customers/${customerId}/machines/${machineId}`}
          className="text-sm font-bold text-[#176b4d] hover:underline"
        >
          ← Back to machine
        </Link>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#176b4d]">
          Diagnostic review
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          {data.report.original_filename}
        </h1>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
            Confidence {confidence}%
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800">
            {data.report.import_status.replaceAll("_", " ")}
          </span>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Confirm machine details
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {[
              ["make", "Make"],
              ["model", "Model"],
              ["serialNumber", "Serial number"],
              ["registration", "Registration"],
              ["hours", "Engine hours"],
              ["reportDate", "Report date"],
            ].map(([field, label]) => (
              <label
                key={field}
                className="text-sm font-bold text-slate-700"
              >
                {label}
                <input
                  type={
                    field === "reportDate"
                      ? "date"
                      : field === "hours"
                        ? "number"
                        : "text"
                  }
                  step={
                    field === "hours"
                      ? "0.01"
                      : undefined
                  }
                  value={
                    form[
                      field as keyof typeof form
                    ] as string
                  }
                  onChange={(event) =>
                    updateField(
                      field as keyof typeof form,
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            ))}
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.updateMachineIdentity}
                onChange={(event) =>
                  updateField(
                    "updateMachineIdentity",
                    event.target.checked,
                  )
                }
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">
                  Update machine identity
                </span>
                <span className="block text-sm text-slate-500">
                  Save the confirmed make, model, serial number and registration to the machine profile.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.saveHourReading}
                onChange={(event) =>
                  updateField(
                    "saveHourReading",
                    event.target.checked,
                  )
                }
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">
                  Record confirmed hours
                </span>
                <span className="block text-sm text-slate-500">
                  Add the detected hours to the machine hour history and update the current reading.
                </span>
              </span>
            </label>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {successMessage}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#176b4d] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#12543d] disabled:opacity-50"
            >
              {saving
                ? "Approving..."
                : "Approve diagnostic result"}
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Fault codes
            </h2>

            <div className="mt-4 space-y-3">
              {(data.faults ?? []).length > 0 ? (
                data.faults?.map((fault) => (
                  <div
                    key={fault.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="font-bold text-slate-950">
                      {fault.fault_code}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {fault.description ||
                        "No description detected."}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {fault.status} · {fault.severity}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No fault codes were detected.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Parser warnings
            </h2>

            <div className="mt-4 space-y-3">
              {(parsed?.warnings ?? []).map(
                (warning, index) => (
                  <div
                    key={`${warning}-${index}`}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
                  >
                    {warning}
                  </div>
                ),
              )}
            </div>
          </article>
        </section>
      </form>
    </main>
  );
}