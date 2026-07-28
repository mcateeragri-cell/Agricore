export default function Schedule() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold">Today&apos;s schedule</h2>
          <p className="text-xs text-slate-500">Tuesday, 21 July</p>
        </div>

        <button
          type="button"
          className="text-sm font-semibold text-[#176b4d]"
        >
          Calendar
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <div className="border-l-4 border-blue-500 pl-4">
          <p className="text-xs font-semibold text-slate-500">08:30</p>
          <p className="mt-1 text-sm font-bold">
            New Holland T7.200 diagnostics
          </p>
          <p className="text-xs text-slate-500">R. Davidson & Sons</p>
        </div>

        <div className="border-l-4 border-amber-500 pl-4">
          <p className="text-xs font-semibold text-slate-500">12:00</p>
          <p className="mt-1 text-sm font-bold">
            Collect hydraulic parts
          </p>
          <p className="text-xs text-slate-500">Banbridge supplier</p>
        </div>

        <div className="border-l-4 border-emerald-500 pl-4">
          <p className="text-xs font-semibold text-slate-500">14:30</p>
          <p className="mt-1 text-sm font-bold">
            JCB telehandler service
          </p>
          <p className="text-xs text-slate-500">Hillview Farm</p>
        </div>
      </div>
    </article>
  );
}