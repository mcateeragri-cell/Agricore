"use client";
import Link from "next/link";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".csv",
  ".json",
  ".xml",
  ".zip",
];

type DiagnosticSource =
  | "automatic"
  | "new_holland_est"
  | "john_deere_service_advisor"
  | "agco_edt"
  | "jcb_servicemaster"
  | "other";

type DiagnosticStatus =
  | "uploaded"
  | "processing"
  | "parsed"
  | "needs_review"
  | "failed";

type DiagnosticReportRow = {
  id: string;
  machine_id: string;
  job_id: string | null;
  source_system: string;
  original_filename: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  import_status: DiagnosticStatus;
  report_date: string | null;
  reported_hours: number | null;
  machine_serial_number: string | null;
  parse_message: string | null;
  created_at: string;
  parsed_at: string | null;
};

type DiagnosticsPanelProps = {
  customerId: string;
  machineId: string;
};

function formatSource(source: string) {
  switch (source) {
    case "new_holland_est":
      return "New Holland EST";
    case "john_deere_service_advisor":
      return "John Deere Service Advisor";
    case "agco_edt":
      return "AGCO EDT";
    case "jcb_servicemaster":
      return "JCB ServiceMaster";
    case "other":
      return "Other diagnostic system";
    default:
      return source
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

function formatStatus(status: DiagnosticStatus) {
  switch (status) {
    case "uploaded":
      return "Uploaded";
    case "processing":
      return "Processing";
    case "parsed":
      return "Parsed";
    case "needs_review":
      return "Needs review";
    case "failed":
      return "Failed";
  }
}

function getStatusClasses(status: DiagnosticStatus) {
  switch (status) {
    case "parsed":
      return "bg-emerald-100 text-emerald-800";
    case "needs_review":
      return "bg-amber-100 text-amber-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatFileSize(bytes: number | null) {
  if (bytes === null || Number.isNaN(bytes)) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date not supplied";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getExtension(filename: string) {
  const dotIndex = filename.lastIndexOf(".");

  return dotIndex === -1
    ? ""
    : filename.slice(dotIndex).toLowerCase();
}

function validateFile(file: File) {
  if (file.size <= 0) {
    return "The selected file is empty.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "The selected file is larger than the 50 MB limit.";
  }

  const extension = getExtension(file.name);

  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return "Upload a PDF, TXT, CSV, JSON, XML or ZIP report.";
  }

  return "";
}

export default function DiagnosticsPanel({
  customerId,
  machineId,
}: DiagnosticsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reports, setReports] = useState<DiagnosticReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceSystem, setSourceSystem] =
    useState<DiagnosticSource>("automatic");
  const [reportDate, setReportDate] = useState(getTodayDate());
  const [jobId, setJobId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [parsingReportId, setParsingReportId] =
    useState<string | null>(null);
  const [reportActionError, setReportActionError] =
    useState("");
  const [reportActionMessage, setReportActionMessage] =
    useState("");

  const loadReports = useCallback(async () => {
    setLoadError("");

    const { data, error } = await supabase
      .from("machine_diagnostic_reports")
      .select(`
        id,
        machine_id,
        job_id,
        source_system,
        original_filename,
        storage_path,
        mime_type,
        file_size_bytes,
        import_status,
        report_date,
        reported_hours,
        machine_serial_number,
        parse_message,
        created_at,
        parsed_at
      `)
      .eq("machine_id", machineId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Unable to load diagnostic reports:", error);
      setLoadError(error.message);
      setIsLoading(false);
      return;
    }

    setReports((data ?? []) as DiagnosticReportRow[]);
    setIsLoading(false);
  }, [machineId]);

  useEffect(() => {
    void loadReports();

    const channel = supabase
      .channel(`machine-diagnostics-${machineId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "machine_diagnostic_reports",
          filter: `machine_id=eq.${machineId}`,
        },
        () => {
          void loadReports();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadReports, machineId]);

  const latestReport = reports[0] ?? null;

  const summary = useMemo(() => {
    const parsed = reports.filter(
      (report) => report.import_status === "parsed",
    ).length;

    const review = reports.filter(
      (report) => report.import_status === "needs_review",
    ).length;

    const failed = reports.filter(
      (report) => report.import_status === "failed",
    ).length;

    return {
      total: reports.length,
      parsed,
      review,
      failed,
    };
  }, [reports]);

  function chooseFile(file: File | null) {
    setUploadError("");
    setUploadMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateFile(file);

    if (validationError) {
      setSelectedFile(null);
      setUploadError(validationError);
      return;
    }

    setSelectedFile(file);
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedFile) {
      setUploadError("Choose a diagnostic report first.");
      return;
    }

    const validationError = validateFile(selectedFile);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadMessage("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    if (sourceSystem !== "automatic") {
      formData.append("sourceSystem", sourceSystem);
    }

    if (reportDate) {
      formData.append("reportDate", reportDate);
    }

    if (jobId.trim()) {
      formData.append("jobId", jobId.trim());
    }

    try {
      const response = await fetch(
        `/api/machines/${machineId}/diagnostics/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = (await response.json()) as {
        error?: string;
        message?: string;
        report?: {
          id: string;
        };
      };

      if (!response.ok) {
        setUploadError(
          result.error ||
            "The diagnostic report could not be uploaded.",
        );
        setIsUploading(false);
        return;
      }

      setSelectedFile(null);
      setSourceSystem("automatic");
      setReportDate(getTodayDate());
      setJobId("");
      setUploadMessage(
        result.message ||
          "Diagnostic report uploaded successfully.",
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadReports();

      if (result.report?.id) {
        await parseReport(result.report.id, true);
      }
    } catch (error) {
      console.error("Diagnostic upload request failed:", error);
      setUploadError(
        "The upload request failed. Check your connection and try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }


  async function parseReport(
    reportId: string,
    afterUpload = false,
  ) {
    if (parsingReportId) {
      return;
    }

    setParsingReportId(reportId);
    setReportActionError("");
    setReportActionMessage("");

    try {
      const response = await fetch(
        `/api/machines/${machineId}/diagnostics/${reportId}/parse`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );

      const result = (await response.json()) as {
        error?: string;
        message?: string;
        status?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ||
            "The diagnostic report could not be parsed.",
        );
      }

      setReportActionMessage(
        result.message ||
          "Diagnostic report parsed and saved for review.",
      );

      if (afterUpload) {
        setUploadMessage(
          "Diagnostic report uploaded, parsed and saved for review.",
        );
      }

      await loadReports();
    } catch (error) {
      console.error(
        "Unable to parse diagnostic report:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "The diagnostic report could not be parsed.";

      setReportActionError(message);

      if (afterUpload) {
        setUploadMessage(
          "The report was uploaded successfully, but automatic parsing needs attention.",
        );
      }

      await loadReports();
    } finally {
      setParsingReportId(null);
    }
  }

  async function openReport(report: DiagnosticReportRow) {
    const { data, error } = await supabase.storage
      .from("machine-diagnostics")
      .createSignedUrl(report.storage_path, 60);

    if (error || !data?.signedUrl) {
      setLoadError(
        error?.message ||
          "A secure report link could not be created.",
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Reports
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {summary.total}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Parsed
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {summary.parsed}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Needs review
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {summary.review}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Latest upload
          </p>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {latestReport
              ? formatDate(latestReport.created_at)
              : "No reports yet"}
          </p>
        </article>
      </div>

      <form
        onSubmit={handleUpload}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#176b4d]">
            Diagnostic import
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Upload diagnostic report
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Upload reports from New Holland EST, John Deere Service
            Advisor, AGCO EDT or JCB ServiceMaster. No machine details or
            hour readings are changed until the extracted data has been
            reviewed.
          </p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mt-5 rounded-2xl border-2 border-dashed p-8 text-center transition ${
            isDragging
              ? "border-[#176b4d] bg-emerald-50"
              : "border-slate-300 bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />

          <p className="font-bold text-slate-900">
            {selectedFile
              ? selectedFile.name
              : "Drag a diagnostic report here"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {selectedFile
              ? formatFileSize(selectedFile.size)
              : "PDF, TXT, CSV, JSON, XML or ZIP up to 50 MB"}
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100"
          >
            {selectedFile ? "Choose another file" : "Browse files"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              Diagnostic system
            </span>
            <select
              value={sourceSystem}
              onChange={(event) =>
                setSourceSystem(
                  event.target.value as DiagnosticSource,
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-emerald-100"
            >
              <option value="automatic">
                Detect automatically
              </option>
              <option value="new_holland_est">
                New Holland EST
              </option>
              <option value="john_deere_service_advisor">
                John Deere Service Advisor
              </option>
              <option value="agco_edt">AGCO EDT</option>
              <option value="jcb_servicemaster">
                JCB ServiceMaster
              </option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              Report date
            </span>
            <input
              type="date"
              value={reportDate}
              onChange={(event) =>
                setReportDate(event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              Job ID
            </span>
            <input
              type="text"
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              placeholder="Optional"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        {uploadError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {uploadError}
          </div>
        )}

        {uploadMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {uploadMessage}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="rounded-lg bg-[#176b4d] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#12543d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload report"}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            Diagnostic reports
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Original reports remain private and are only available to
            members of the active company.
          </p>
        </header>

        {reportActionError && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
            {reportActionError}
          </div>
        )}

        {reportActionMessage && (
          <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">
            {reportActionMessage}
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-sm font-semibold text-slate-600">
            Loading diagnostic reports...
          </div>
        ) : loadError ? (
          <div className="p-5">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-bold text-red-700">
                Unable to load reports
              </p>
              <p className="mt-1 text-sm text-red-600">
                {loadError}
              </p>
              <button
                type="button"
                onClick={() => void loadReports()}
                className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-bold text-slate-800">
              No diagnostic reports uploaded
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Upload the first report using the form above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {reports.map((report) => (
              <article
                key={report.id}
                className="p-5 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-all font-bold text-slate-900">
                        {report.original_filename}
                      </h3>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClasses(
                          report.import_status,
                        )}`}
                      >
                        {formatStatus(report.import_status)}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <dt className="font-bold text-slate-500">
                          Source
                        </dt>
                        <dd className="mt-0.5 text-slate-800">
                          {formatSource(report.source_system)}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-bold text-slate-500">
                          Report date
                        </dt>
                        <dd className="mt-0.5 text-slate-800">
                          {formatDate(
                            report.report_date ||
                              report.created_at,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-bold text-slate-500">
                          File size
                        </dt>
                        <dd className="mt-0.5 text-slate-800">
                          {formatFileSize(
                            report.file_size_bytes,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-bold text-slate-500">
                          Detected hours
                        </dt>
                        <dd className="mt-0.5 text-slate-800">
                          {report.reported_hours === null
                            ? "Not parsed"
                            : `${Number(
                                report.reported_hours,
                              ).toLocaleString()} hrs`}
                        </dd>
                      </div>
                    </dl>

                    {report.parse_message && (
                      <p className="mt-3 text-sm text-slate-600">
                        {report.parse_message}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void openReport(report)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Open report
                    </button>

                    {(report.import_status === "uploaded" ||
                      report.import_status === "failed") && (
                      <button
                        type="button"
                        onClick={() =>
                          void parseReport(report.id)
                        }
                        disabled={parsingReportId !== null}
                        className="rounded-lg bg-[#176b4d] px-3 py-2 text-sm font-bold text-white hover:bg-[#12543d] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {parsingReportId === report.id
                          ? "Parsing..."
                          : report.import_status === "failed"
                            ? "Retry parse"
                            : "Parse report"}
                      </button>
                    )}

                    {report.import_status === "processing" && (
                      <button
                        type="button"
                        disabled
                        className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white opacity-60"
                      >
                        Processing...
                      </button>
                    )}

                   {report.import_status === "needs_review" && (
  <Link
    href={`/customers/${customerId}/machines/${machineId}/diagnostics/${report.id}/review`}
    className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-700"
  >
    Review result
  </Link>
)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}