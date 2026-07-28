export default function QuickActions() {
  return (
    <article className="rounded-2xl bg-[#103d2e] p-5 text-white shadow-sm">
      <p className="text-sm font-semibold text-emerald-100">
        Quick action
      </p>

      <h2 className="mt-2 text-xl font-bold">
        Create a new job card
      </h2>

      <p className="mt-2 text-sm text-emerald-100">
        Record the customer, machine, fault and engineer before starting work.
      </p>

      <button
        type="button"
        className="mt-5 w-full rounded-lg bg-white px-4 py-3 text-sm font-bold text-[#103d2e]"
      >
        Create job card
      </button>
    </article>
  );
}