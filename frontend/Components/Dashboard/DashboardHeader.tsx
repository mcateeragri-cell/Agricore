export default function DashboardHeader() {
  return (
    <header className="border-b border-slate-200 bg-white px-5 py-4 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Tuesday, 21 July 2026</p>

          <h1 className="text-xl font-bold md:text-2xl">
            Business dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hidden rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 sm:block"
          >
            + New customer
          </button>

          <button
            type="button"
            className="rounded-lg bg-[#176b4d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12583f]"
          >
            + New job
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#103d2e] font-bold text-white">
            JM
          </div>
        </div>
      </div>
    </header>
  );
}