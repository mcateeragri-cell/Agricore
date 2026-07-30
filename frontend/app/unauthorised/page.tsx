import Link from "next/link";

export default function UnauthorisedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-3xl dark:bg-red-900/30">
          🔒
        </div>

        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-red-700 dark:text-red-400">
          Access restricted
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          You are not authorised to view this page
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-6 text-slate-600 sm:text-base dark:text-slate-400">
          Your AgriCore account does not have the required permission.
          Contact a company administrator if you believe you should have access.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            Return to dashboard
          </Link>

          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-900"
          >
            Sign in with another account
          </Link>
        </div>
      </section>
    </main>
  );
}