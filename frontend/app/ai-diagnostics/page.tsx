import { requirePermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AiDiagnosticsPage() {
  const context = await requirePermission(["ai_diagnostics.use"]);

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Technician tools
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
            AI diagnostics
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Diagnostic assistance will use machine details, symptoms, fault
            codes and service history to help engineers plan checks and repairs.
          </p>
        </header>

        <section className="mt-8 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8 dark:border-emerald-900/60 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl dark:bg-emerald-950">
            ✨
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
            Access enabled for {context.fullName}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            This permission-controlled workspace is ready for the future AI
            diagnostics feature. No financial information will be shown here.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Planned diagnostic workflow
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Select a machine, enter symptoms or fault codes, review suggested
              checks, and attach the diagnostic session to an assigned job.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
