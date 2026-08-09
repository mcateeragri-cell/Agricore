import { CalendarDays, CheckCircle2, Clock3, MapPin, Wrench } from "lucide-react";

const jobs = [
  ["T7.270 hydraulic fault", "In progress", "JM"],
  ["6250R 1,500 hr service", "Scheduled", "KC"],
  ["Loadall inspection", "Complete", "AC"],
];

export default function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl lg:pr-10">
      <div className="absolute -inset-10 -z-10 rounded-[4rem] bg-emerald-400/20 blur-3xl" />
      <div className="premium-float overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_35px_120px_rgba(2,44,34,0.24)] dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Live business overview</span>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Online</span>
        </div>

        <div className="grid gap-3 bg-slate-50 p-4 sm:grid-cols-3 dark:bg-slate-950/50">
          {[["Open jobs", "18"], ["Due services", "7"], ["This week", "32 hrs"]].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
              <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</div>
            </div>
          ))}
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-white">Today&apos;s work</p>
              <p className="text-xs font-medium text-slate-500">Field and workshop jobs in one view</p>
            </div>
            <span className="text-xs font-black text-emerald-700">View schedule</span>
          </div>
          <div className="mt-4 space-y-2">
            {jobs.map(([name, status, initials]) => (
              <div key={name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950 text-xs font-black text-white">{initials}</span>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{name}</p>
                  <p className="text-xs font-medium text-slate-500">Customer · Machine history attached</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="premium-float-delayed relative -mt-16 ml-auto w-[210px] rounded-[2rem] border-[7px] border-slate-950 bg-slate-950 p-2 shadow-[0_24px_70px_rgba(2,44,34,0.28)] sm:-mr-1 lg:absolute lg:-bottom-20 lg:-right-1 lg:mt-0">
        <div className="overflow-hidden rounded-[1.35rem] bg-[#f7fbf8] text-slate-950">
          <div className="bg-emerald-950 px-4 pb-4 pt-5 text-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">Technician</span>
              <MapPin className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="mt-3 text-base font-black leading-tight">T7.270 hydraulic fault</p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-100/75">Field job · New Holland</p>
          </div>
          <div className="space-y-2 p-3">
            {[
              [Clock3, "Labour", "2h 15m"],
              [Wrench, "Parts", "3 items"],
              [CalendarDays, "Status", "In progress"],
            ].map(([Icon, label, value]) => {
              const RowIcon = Icon as typeof Clock3;
              return (
                <div key={String(label)} className="flex items-center justify-between rounded-xl border border-emerald-950/10 bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2"><RowIcon className="h-4 w-4 text-emerald-700"/><span className="text-[11px] font-bold text-slate-600">{String(label)}</span></div>
                  <span className="text-[11px] font-black">{String(value)}</span>
                </div>
              );
            })}
            <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-3 text-[11px] font-black text-white"><CheckCircle2 className="h-4 w-4"/>Complete job</div>
          </div>
        </div>
      </div>
    </div>
  );
}
