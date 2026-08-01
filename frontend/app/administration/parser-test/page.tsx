"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { genericParser } from "@/lib/intelligence/parser-engine/generic";
import type { ParsedDiagnosticReport } from "@/lib/intelligence/parser-engine/types";

const ACCEPTED_EXTENSIONS = [".txt", ".csv", ".json", ".xml"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function getExtension(filename: string) {
  const dotIndex = filename.lastIndexOf(".");

  return dotIndex === -1
    ? ""
    : filename.slice(dotIndex).toLowerCase();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: Date | string) {
  if (!value) {
    return "Not detected";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getConfidenceClasses(confidence: number) {
  if (confidence >= 80) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (confidence >= 50) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-700";
}

function validateFile(file: File) {
  if (file.size <= 0) {
    return "The selected file is empty.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "The selected file is larger than the 10 MB test-bench limit.";
  }

  const extension = getExtension(file.name);

  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return "The first test-bench version supports TXT, CSV, JSON and XML. PDF extraction will be added with the OCR stage.";
  }

  return "";
}

export default function ParserTestPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParsedDiagnosticReport | null>(
    null,
  );
  const [parserName, setParserName] = useState("Generic Parser");
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [rawTextOpen, setRawTextOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(true);

  const summary = useMemo(
    () => ({
      confidence: result?.confidence ?? 0,
      manufacturer: result?.manufacturer || "Unknown",
      faults: result?.faultCodes.length ?? 0,
      controllers: result?.controllers.length ?? 0,
    }),
    [result],
  );

  async function parseFile(file: File) {
    setErrorMessage("");
    setResult(null);
    setSelectedFile(file);
    setIsParsing(true);

    const validationError = validateFile(file);

    if (validationError) {
      setErrorMessage(validationError);
      setIsParsing(false);
      return;
    }

    try {
      const text = await file.text();
      const canParse = await genericParser.canParse(
        file.name,
        text,
        file.type,
      );

      if (!canParse) {
        setErrorMessage(
          "The generic parser did not accept this report.",
        );
        return;
      }

      const parsed = await genericParser.parse(file.name, text);

      setParserName(genericParser.name);
      setResult(parsed);
      setRawTextOpen(false);
      setJsonOpen(true);
    } catch (error) {
      console.error("Parser test failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The report could not be parsed.",
      );
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (file) {
      void parseFile(file);
    }
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

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void parseFile(file);
    }
  }

  function clearResult() {
    setSelectedFile(null);
    setResult(null);
    setErrorMessage("");
    setParserName("Generic Parser");
    setRawTextOpen(false);
    setJsonOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#176b4d]">
            Administration
          </p>

          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                AgriCore Intelligence
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Test diagnostic parsers locally before any report is
                uploaded, stored or imported into a machine record.
              </p>
            </div>

            {selectedFile && (
              <button
                type="button"
                onClick={clearResult}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Clear test
              </button>
            )}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Parser" value={parserName} />
          <SummaryCard
            label="Confidence"
            value={`${summary.confidence}%`}
            badgeClassName={getConfidenceClasses(
              summary.confidence,
            )}
          />
          <SummaryCard
            label="Manufacturer"
            value={summary.manufacturer}
          />
          <SummaryCard
            label="Fault codes"
            value={String(summary.faults)}
          />
          <SummaryCard
            label="Controllers"
            value={String(summary.controllers)}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#176b4d]">
              Parser test bench
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Select a diagnostic report
            </h2>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-5 rounded-2xl border-2 border-dashed p-10 text-center transition ${
              isDragging
                ? "border-[#176b4d] bg-emerald-50"
                : "border-slate-300 bg-slate-50"
            }`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
              📄
            </div>

            <p className="mt-4 font-bold text-slate-900">
              {selectedFile
                ? selectedFile.name
                : "Drag a report onto this area"}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {selectedFile
                ? formatFileSize(selectedFile.size)
                : "TXT, CSV, JSON or XML up to 10 MB"}
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="mt-5 rounded-lg bg-[#176b4d] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#12543d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isParsing
                ? "Parsing report..."
                : selectedFile
                  ? "Choose another report"
                  : "Browse reports"}
            </button>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )}
        </section>

        {result ? (
          <>
            <section className="grid gap-6 xl:grid-cols-2">
              <MachineCard result={result} />
              <WarningsCard warnings={result.warnings} />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <FaultCodesCard result={result} />
              <ControllersCard result={result} />
            </section>

            <SoftwareVersionsCard result={result} />

            <ExpandablePanel
              title="Raw report text"
              description="The exact text passed into the parser."
              isOpen={rawTextOpen}
              onToggle={() => setRawTextOpen((value) => !value)}
            >
              <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {result.rawText || "No raw text returned."}
              </pre>
            </ExpandablePanel>

            <ExpandablePanel
              title="Parsed JSON output"
              description="The complete normalised result returned by the parser."
              isOpen={jsonOpen}
              onToggle={() => setJsonOpen((value) => !value)}
            >
              <pre className="max-h-[40rem] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {JSON.stringify(result, null, 2)}
              </pre>
            </ExpandablePanel>
          </>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="font-bold text-slate-800">
              No parser result yet
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Select a supported local report to inspect the generic
              parser output.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  badgeClassName?: string;
};

function SummaryCard({
  label,
  value,
  badgeClassName,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {badgeClassName ? (
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-bold ${badgeClassName}`}
        >
          {value}
        </span>
      ) : (
        <p className="mt-2 break-words text-lg font-bold text-slate-950">
          {value}
        </p>
      )}
    </article>
  );
}

function MachineCard({
  result,
}: {
  result: ParsedDiagnosticReport;
}) {
  const rows = [
    ["Manufacturer", result.manufacturer || "Not detected"],
    ["Make", result.machine.make || "Not detected"],
    ["Model", result.machine.model || "Not detected"],
    ["Serial number", result.machine.serialNumber || "Not detected"],
    ["Registration", result.machine.registration || "Not detected"],
    [
      "Hours",
      result.hours === undefined
        ? "Not detected"
        : `${result.hours.toLocaleString()} hrs`,
    ],
    ["Report date", formatDate(result.reportDate)],
  ];

  return (
    <DataCard
      eyebrow="Machine"
      title="Detected identity"
      emptyMessage="No machine identity detected."
    >
      <dl className="divide-y divide-slate-200">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"
          >
            <dt className="text-sm font-bold text-slate-500">
              {label}
            </dt>
            <dd className="break-words text-sm font-semibold text-slate-900">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </DataCard>
  );
}

function WarningsCard({ warnings }: { warnings: string[] }) {
  return (
    <DataCard
      eyebrow="Parser checks"
      title="Warnings"
      emptyMessage="No parser warnings."
    >
      {warnings.length > 0 ? (
        <ul className="space-y-3">
          {warnings.map((warning, index) => (
            <li
              key={`${warning}-${index}`}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
            >
              {warning}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No parser warnings." />
      )}
    </DataCard>
  );
}

function FaultCodesCard({
  result,
}: {
  result: ParsedDiagnosticReport;
}) {
  return (
    <DataCard
      eyebrow="Diagnostics"
      title={`Fault codes (${result.faultCodes.length})`}
      emptyMessage="No fault codes detected."
    >
      {result.faultCodes.length > 0 ? (
        <div className="space-y-3">
          {result.faultCodes.map((fault, index) => (
            <article
              key={`${fault.code}-${index}`}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-slate-950">
                  {fault.code}
                </p>
                {fault.status && (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                    {fault.status}
                  </span>
                )}
                {fault.severity && (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                    {fault.severity}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {fault.description || "No description detected."}
              </p>
              {fault.ecu && (
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  ECU: {fault.ecu}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No fault codes detected." />
      )}
    </DataCard>
  );
}

function ControllersCard({
  result,
}: {
  result: ParsedDiagnosticReport;
}) {
  return (
    <DataCard
      eyebrow="Control units"
      title={`Controllers (${result.controllers.length})`}
      emptyMessage="No controllers detected."
    >
      {result.controllers.length > 0 ? (
        <div className="space-y-3">
          {result.controllers.map((controller, index) => (
            <article
              key={`${controller.name}-${index}`}
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="font-bold text-slate-950">
                {controller.name}
              </p>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="font-bold text-slate-500">
                    Part number
                  </dt>
                  <dd className="mt-1 text-slate-800">
                    {controller.partNumber || "Not detected"}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500">
                    Software
                  </dt>
                  <dd className="mt-1 text-slate-800">
                    {controller.softwareVersion || "Not detected"}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500">
                    Hardware
                  </dt>
                  <dd className="mt-1 text-slate-800">
                    {controller.hardwareVersion || "Not detected"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No controllers detected." />
      )}
    </DataCard>
  );
}

function SoftwareVersionsCard({
  result,
}: {
  result: ParsedDiagnosticReport;
}) {
  return (
    <DataCard
      eyebrow="Software"
      title={`Software versions (${result.softwareVersions.length})`}
      emptyMessage="No software versions detected."
    >
      {result.softwareVersions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600">
                  Controller
                </th>
                <th className="px-4 py-3 font-bold text-slate-600">
                  Version
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {result.softwareVersions.map((software, index) => (
                <tr key={`${software.controller}-${index}`}>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {software.controller}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {software.version}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="No software versions detected." />
      )}
    </DataCard>
  );
}

type DataCardProps = {
  eyebrow: string;
  title: string;
  emptyMessage: string;
  children: React.ReactNode;
};

function DataCard({
  eyebrow,
  title,
  children,
}: DataCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#176b4d]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-bold text-slate-950">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

type ExpandablePanelProps = {
  title: string;
  description: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function ExpandablePanel({
  title,
  description,
  isOpen,
  onToggle,
  children,
}: ExpandablePanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-slate-50"
      >
        <span>
          <span className="block font-bold text-slate-950">
            {title}
          </span>
          <span className="mt-1 block text-sm text-slate-500">
            {description}
          </span>
        </span>

        <span className="text-xl font-bold text-slate-500">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 p-5">
          {children}
        </div>
      )}
    </section>
  );
}