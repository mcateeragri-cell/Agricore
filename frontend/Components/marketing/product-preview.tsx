const jobs = [
  ["T7.270 hydraulic fault", "In progress", "JM"],
  ["6250R service", "Scheduled", "KC"],
  ["Loadall inspection", "Complete", "AC"],
];

export default function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-emerald-400/15 blur-3xl" />
      <div className="overflow-hidden rounded-[1.8rem] border border-white/70 bg-white shadow-[0_30px_90px_rgba(2,44,34,0.2)] dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Live business overview</span></div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Online</span>
        </div>
        <div className="grid gap-3 bg-slate-50 p-4 sm:grid-cols-3 dark:bg-slate-950/50">
          {[["Open jobs", "18"], ["Due services", "7"], ["This week", "32 hrs"]].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900"><div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</div></div>
          ))}
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between"><div><p className="text-sm font-black text-slate-950 dark:text-white">Today&apos;s work</p><p className="text-xs font-medium text-slate-500">Field and workshop jobs in one view</p></div><span className="text-xs font-black text-emerald-700">View schedule</span></div>
          <div className="mt-4 space-y-2">
            {jobs.map(([name, status, initials]) => (
              <div key={name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950 text-xs font-black text-white">{initials}</span>
                <div><p className="text-sm font-black text-slate-900 dark:text-white">{name}</p><p className="text-xs font-medium text-slate-500">Customer · Machine history attached</p></div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
