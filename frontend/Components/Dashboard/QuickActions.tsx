import Link from "next/link";

export default function QuickActions({
  showFinancialActions = true,
}: {
  showFinancialActions?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-950 shadow-lg">
      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">
          Quick Action
        </p>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
          Create a new job card
        </h2>

        <p className="mt-3 text-sm leading-6 text-emerald-100">
          Record the customer, machine, reported fault, assigned engineer,
          photos and notes before work begins.
        </p>

        <div className="mt-6 grid gap-3">
          <Link
            href="/jobs/new"
            className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-900 transition hover:scale-[1.02] hover:bg-emerald-50"
          >
            ➕ Create Job Card
          </Link>

          <Link
            href="/customers/new"
            className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-600 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400 hover:bg-white/10"
          >
            👤 Add Customer
          </Link>

          <Link
            href="/machines/new"
            className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-600 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400 hover:bg-white/10"
          >
            🚜 Add Machine
          </Link>

          {showFinancialActions && (
            <Link
              href="/quotes/new"
              className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-600 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400 hover:bg-white/10"
            >
              💷 Create Quote
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}