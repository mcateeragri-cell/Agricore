"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Bot, CalendarClock, CircleDollarSign, RefreshCw, Settings2, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { useRegionalFormatters } from "@/lib/client/use-regional-formatters";

type Overview = {
  profitability: { invoiced: number; labourRevenue: number; partsRevenue: number; partsCost: number; grossContributionEstimate: number; topJobs: Array<{ jobId: string; jobNumber: string; revenue: number; estimatedCost: number; contribution: number }> };
  fleet: { machines: number; openJobs: number; overdueServices: number; dueSoonServices: number; recurringIssueGroups: number; repeatedIssues: Array<{ make: string; model: string; issue: string; count: number; machines: number }> };
  servicePredictions: Array<{ machineId: string; machine: string; registration: string; programme: string; remainingHours: number | null; predictedDate: string | null; status: string }>;
  advisor: Array<{ severity: string; title: string; detail: string; href?: string }>;
};
type Rule = { id: string; name: string; rule_type: string; enabled: boolean; threshold: number };

const ruleLabels: Record<string,string> = { service_due: "Service workload", quote_stale: "Stale quotes", low_stock: "Out-of-stock items", job_completed_uninvoiced: "Completed jobs not invoiced", high_parts_cost: "Parts cost threshold" };

export default function AtlasIntelligenceClient() {
  const { money, date: formatDate } = useRegionalFormatters();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [showRules, setShowRules] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const [overviewResponse, rulesResponse] = await Promise.all([fetch("/api/atlas/overview", { cache: "no-store" }), fetch("/api/atlas/automations", { cache: "no-store" })]);
      const overviewBody = await overviewResponse.json();
      const rulesBody = await rulesResponse.json();
      if (!overviewResponse.ok) throw new Error(overviewBody.error || "Unable to load AgriCore Intelligence.");
      setOverview(overviewBody.overview); setAlerts(overviewBody.alerts ?? []);
      if (rulesResponse.ok) { setRules(rulesBody.rules ?? []); setCanManage(Boolean(rulesBody.canManage)); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load intelligence."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function runAutomations() {
    const response = await fetch("/api/atlas/automations/run", { method: "POST" });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Unable to run automations."); else void load();
  }

  async function addRule(ruleType: string) {
    const defaultThreshold = ruleType === "quote_stale" ? 14 : ruleType === "high_parts_cost" ? 5000 : 0;
    const response = await fetch("/api/atlas/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rule_type: ruleType, name: ruleLabels[ruleType], threshold: defaultThreshold }) });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Unable to create rule."); else void load();
  }

  async function toggleRule(rule: Rule) {
    await fetch("/api/atlas/automations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }) });
    void load();
  }

  const existing = useMemo(() => new Set(rules.map((item) => item.rule_type)), [rules]);

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-8 font-bold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">Building workshop intelligence…</div>;
  if (error && !overview) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 font-bold text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>;
  if (!overview) return null;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Project Atlas</p><h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">AgriCore Intelligence</h1><p className="mt-2 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-400">Workshop profitability, repeat-failure patterns, service forecasting, business advice and safe workflow automations — without a machine health score.</p></div><div className="flex gap-2"><button onClick={() => void runAutomations()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black dark:border-slate-700 dark:bg-slate-900"><RefreshCw className="h-4 w-4"/>Run automations</button>{canManage ? <button onClick={() => setShowRules(!showRules)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white"><Settings2 className="h-4 w-4"/>Automation rules</button> : null}</div></div>

    {error ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{error}</p> : null}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Metric icon={<CircleDollarSign/>} label="Estimated contribution" value={money(overview.profitability.grossContributionEstimate)} />
      <Metric icon={<Wrench/>} label="Open jobs" value={String(overview.fleet.openJobs)} />
      <Metric icon={<CalendarClock/>} label="Services overdue" value={String(overview.fleet.overdueServices)} />
      <Metric icon={<TrendingUp/>} label="Services due soon" value={String(overview.fleet.dueSoonServices)} />
      <Metric icon={<Activity/>} label="Repeat patterns" value={String(overview.fleet.recurringIssueGroups)} />
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Business advisor" icon={<Bot className="h-5 w-5"/>}>{overview.advisor.map((item, index) => <Link key={`${item.title}-${index}`} href={item.href || "/intelligence"} className="block rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 dark:border-slate-800"><div className="flex gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"/><div><p className="font-black text-slate-950 dark:text-white">{item.title}</p><p className="mt-1 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">{item.detail}</p></div></div></Link>)}</Panel>
      <Panel title="Predictive maintenance patterns" icon={<AlertTriangle className="h-5 w-5"/>}>{overview.fleet.repeatedIssues.length ? overview.fleet.repeatedIssues.map((item) => <div key={`${item.make}-${item.model}-${item.issue}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-black text-slate-950 dark:text-white">{item.make} {item.model}</p><p className="mt-1 text-sm font-bold capitalize text-amber-700 dark:text-amber-300">Recurring: {item.issue}</p><p className="mt-1 text-xs font-semibold text-slate-500">{item.count} mentions across {item.machines} machines</p></div>) : <Empty text="Atlas needs repeat repair history across at least two similar machines before it flags a predictive pattern."/>}</Panel>
    </div>

    <Panel title="Service prediction" icon={<CalendarClock className="h-5 w-5"/>}>{overview.servicePredictions.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="text-xs font-black uppercase text-slate-500"><th className="pb-3">Machine</th><th>Programme</th><th>Hours remaining</th><th>Forecast</th><th>Status</th></tr></thead><tbody>{overview.servicePredictions.map((item) => <tr key={`${item.machineId}-${item.programme}`} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3"><Link className="font-black text-emerald-800 dark:text-emerald-300" href={`/machines/${item.machineId}`}>{item.machine}</Link><div className="text-xs font-semibold text-slate-500">{item.registration}</div></td><td className="font-semibold">{item.programme}</td><td>{item.remainingHours == null ? "—" : `${item.remainingHours} hrs`}</td><td>{item.predictedDate ? formatDate(new Date(item.predictedDate)) : "—"}</td><td><span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.status === "overdue" ? "bg-rose-100 text-rose-800" : item.status === "due_soon" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>{item.status.replaceAll("_", " ")}</span></td></tr>)}</tbody></table></div> : <Empty text="Add service programmes and machine usage estimates to forecast upcoming services."/>}</Panel>

    <div className="grid gap-6 xl:grid-cols-2"><Panel title="Most profitable recorded jobs" icon={<CircleDollarSign className="h-5 w-5"/>}>{overview.profitability.topJobs.length ? overview.profitability.topJobs.map((job) => <Link key={job.jobId} href={`/jobs/${job.jobId}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div><p className="font-black text-slate-950 dark:text-white">{job.jobNumber}</p><p className="mt-1 text-xs font-semibold text-slate-500">Revenue {money(job.revenue)} · estimated cost {money(job.estimatedCost)}</p></div><p className={`font-black ${job.contribution >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money(job.contribution)}</p></Link>) : <Empty text="Record labour, parts and invoices to build profitability intelligence."/>}</Panel><Panel title="Open automation alerts" icon={<Sparkles className="h-5 w-5"/>}>{alerts.length ? alerts.map((item) => <Link href={item.href || "/intelligence"} key={item.id} className="block rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-black text-slate-950 dark:text-white">{item.title}</p><p className="mt-1 text-sm font-medium text-slate-500">{item.detail}</p></Link>) : <Empty text="No automation alerts are currently open."/>}</Panel></div>

    {showRules ? <Panel title="Automation rules" icon={<Settings2 className="h-5 w-5"/>}><div className="grid gap-3 md:grid-cols-2">{Object.entries(ruleLabels).map(([key, label]) => { const rule = rules.find((item) => item.rule_type === key); return <div key={key} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-center justify-between gap-3"><div><p className="font-black text-slate-950 dark:text-white">{label}</p><p className="mt-1 text-xs font-semibold text-slate-500">{key === "quote_stale" ? "Alert when open quotes reach the configured age." : key === "high_parts_cost" ? "Alert when recorded parts cost exceeds a threshold." : "Create an Atlas alert when this condition is detected."}</p></div>{rule ? <button onClick={() => void toggleRule(rule)} className={`rounded-full px-3 py-1 text-xs font-black ${rule.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{rule.enabled ? "Enabled" : "Disabled"}</button> : <button onClick={() => void addRule(key)} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">Add rule</button>}</div></div>})}</div></Panel> : null}
  </div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{icon}</div><p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{value}</p></div> }
function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">{icon}{title}</h2><div className="space-y-3">{children}</div></section> }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700">{text}</div> }
