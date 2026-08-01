"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import DiagnosticsPanel from "./DiagnosticsPanel";

export default function MachineDiagnosticsPage() {
  const params = useParams<{
    id: string;
    machineId: string;
  }>();

  const customerId = params.id;
  const machineId = params.machineId;

  return (
    <main className="space-y-6 p-6 lg:p-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Link
          href={`/customers/${customerId}/machines/${machineId}`}
          className="text-sm font-bold text-[#176b4d] hover:underline dark:text-emerald-400"
        >
          ← Back to machine
        </Link>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#176b4d] dark:text-emerald-400">
          Machine records
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-slate-100">
          Diagnostics Centre
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Upload, parse, review and retain diagnostic reports for this
          machine. Confirmed readings and fault history can then feed the
          machine profile, timeline and health pages.
        </p>
      </header>

      <DiagnosticsPanel
        customerId={customerId}
        machineId={machineId}
      />
    </main>
  );
}