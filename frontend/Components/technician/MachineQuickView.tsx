import type { TechnicianDashboardMachine } from "@/types/technician";

export default function MachineQuickView({ machine }: { machine: TechnicianDashboardMachine | null }) {
  if (!machine) return null;

  return (
    <section className="mt-4 rounded-3xl border border-white/50 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Machine quick view</p>
      <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{machine.displayName}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Detail label="Registration" value={machine.registration || "Not recorded"} />
        <Detail label="Serial number" value={machine.serialNumber || "Not recorded"} />
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Full service, fault and parts history remains available from the machine record.</p>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
