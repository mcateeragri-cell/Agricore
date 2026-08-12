"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrainCircuit, CalendarClock, TriangleAlert } from "lucide-react";

type Data = { overview?: { fleet: { overdueServices: number; dueSoonServices: number; recurringIssueGroups: number }; advisor: Array<{ title: string; detail: string }> }; error?: string };
export default function AtlasIntelligenceSummary() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { void fetch("/api/atlas/overview", { cache: "no-store" }).then(async (response) => ({ response, body: await response.json() })).then(({ response, body }) => { if (response.ok) setData(body); }).catch(() => {}); }, []);
  if (!data?.overview) return null;
  const { fleet, advisor } = data.overview;
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">AgriCore Intelligence</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Workshop intelligence</h2></div><BrainCircuit className="h-6 w-6 text-emerald-700"/></div><div className="mt-4 grid grid-cols-3 gap-2"><Small icon={<CalendarClock/>} label="Due soon" value={fleet.dueSoonServices}/><Small icon={<TriangleAlert/>} label="Overdue" value={fleet.overdueServices}/><Small icon={<BrainCircuit/>} label="Patterns" value={fleet.recurringIssueGroups}/></div>{advisor[0] ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="font-black text-slate-900 dark:text-white">{advisor[0].title}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{advisor[0].detail}</p></div> : null}<Link href="/intelligence" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">Open Intelligence</Link></div>;
}
function Small({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><div className="text-emerald-700">{icon}</div><p className="mt-2 text-lg font-black">{value}</p><p className="text-[10px] font-black uppercase text-slate-500">{label}</p></div> }
