"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BrainCircuit, ClipboardList, History, LoaderCircle, ShieldAlert, Sparkles, Tractor } from "lucide-react";

type MachineOption = {
  id: string;
  label: string;
  identifier: string;
  customer: string;
  hours: number | string | null;
  year: number | string | null;
};

type LoadResponse = {
  machines?: MachineOption[];
  providerConfigured?: boolean;
  model?: string;
  error?: string;
};

type DiagnoseResponse = {
  providerConfigured?: boolean;
  model?: string | null;
  answer?: string;
  historyCount?: number;
  error?: string;
};

export default function AiDiagnosticsClient() {
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [machineId, setMachineId] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [faultCodes, setFaultCodes] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [answer, setAnswer] = useState("");
  const [model, setModel] = useState("");
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/ai-diagnostics", { cache: "no-store" });
        const body = (await response.json()) as LoadResponse;
        if (!response.ok) throw new Error(body.error || "Unable to load AI diagnostics.");
        setMachines(body.machines ?? []);
        setProviderConfigured(Boolean(body.providerConfigured));
        setModel(body.model ?? "");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load AI diagnostics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedMachine = useMemo(
    () => machines.find((machine) => machine.id === machineId) ?? null,
    [machineId, machines],
  );

  async function diagnose(event: FormEvent) {
    event.preventDefault();
    if (!machineId || !symptoms.trim()) {
      setError("Choose a machine and describe the fault or symptoms.");
      return;
    }

    setRunning(true);
    setError("");
    setAnswer("");
    try {
      const response = await fetch("/api/ai-diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId, symptoms, faultCodes, extraContext }),
      });
      const body = (await response.json()) as DiagnoseResponse;
      if (!response.ok) throw new Error(body.error || "Unable to generate diagnostic guidance.");
      setProviderConfigured(Boolean(body.providerConfigured));
      setModel(body.model ?? "");
      setAnswer(body.answer ?? "");
      setHistoryCount(body.historyCount ?? 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate diagnostic guidance.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Service intelligence</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">AI Workshop Assistant</h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600 sm:text-base dark:text-slate-300">
              Combine machine history already stored in AgriCore with AI-assisted diagnostic reasoning. Suggestions are advisory and should be verified against the correct manufacturer information and workshop safety procedures.
            </p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-sm font-black ${providerConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"}`}>
            {providerConfigured ? `AI connected${model ? ` · ${model}` : ""}` : "History-only mode · add OPENAI_API_KEY for AI"}
          </div>
        </header>

        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form onSubmit={diagnose} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Tractor className="h-5 w-5" /></span>
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">Workshop case</h2>
                <p className="text-sm font-medium text-slate-500">Start with the machine and the actual complaint.</p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block text-sm font-black text-slate-700 dark:text-slate-200">
                Machine
                <select value={machineId} onChange={(event) => setMachineId(event.target.value)} disabled={loading} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="">{loading ? "Loading machines…" : "Choose a machine"}</option>
                  {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.label}{machine.identifier ? ` · ${machine.identifier}` : ""}{machine.customer ? ` · ${machine.customer}` : ""}</option>)}
                </select>
              </label>

              {selectedMachine ? (
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950/70">
                  <div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Customer</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{selectedMachine.customer || "—"}</p></div>
                  <div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Hours</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{selectedMachine.hours ?? "—"}</p></div>
                </div>
              ) : null}

              <label className="block text-sm font-black text-slate-700 dark:text-slate-200">
                Symptoms / complaint
                <textarea rows={5} value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder="Example: PTO will not engage when hot. PTO symbol appears, then drops out after 2–3 seconds." className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>

              <label className="block text-sm font-black text-slate-700 dark:text-slate-200">
                Fault codes (optional)
                <input value={faultCodes} onChange={(event) => setFaultCodes(event.target.value)} placeholder="Enter codes exactly as shown" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>

              <label className="block text-sm font-black text-slate-700 dark:text-slate-200">
                Extra technician context (optional)
                <textarea rows={3} value={extraContext} onChange={(event) => setExtraContext(event.target.value)} placeholder="What has already been checked, recent repair work, operating conditions…" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
            </div>

            <button type="submit" disabled={running || loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
              {running ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {running ? "Analysing machine history…" : "Analyse fault"}
            </button>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"><BrainCircuit className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">Diagnostic guidance</h2>
                  <p className="text-sm font-medium text-slate-500">AgriCore history + workshop reasoning</p>
                </div>
              </div>
              {answer ? <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300"><History className="h-3.5 w-3.5" /> {historyCount} previous jobs reviewed</div> : null}
            </div>

            {!answer ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><ClipboardList className="h-6 w-6 text-emerald-700" /><p className="mt-3 font-black text-slate-900 dark:text-white">Uses your repair history</p><p className="mt-2 text-sm font-medium leading-6 text-slate-500">Previous faults, diagnoses, work carried out, parts and labour are included automatically.</p></div>
                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><ShieldAlert className="h-6 w-6 text-amber-600" /><p className="mt-3 font-black text-slate-900 dark:text-white">Advisory, not a manual</p><p className="mt-2 text-sm font-medium leading-6 text-slate-500">AgriCore will not invent torque, pressure or fault-code specifications. Verify critical data against authorised information.</p></div>
              </div>
            ) : (
              <div className="mt-6 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm font-medium leading-7 text-slate-800 dark:bg-slate-950/70 dark:text-slate-200">{answer}</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
