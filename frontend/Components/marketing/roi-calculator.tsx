"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Calculator, Clock3, PoundSterling, Users } from "lucide-react";

function gbp(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function whole(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Math.max(0, value));
}

export default function RoiCalculator() {
  const [engineers, setEngineers] = useState(4);
  const [jobsPerWeek, setJobsPerWeek] = useState(35);
  const [adminMinutesPerJob, setAdminMinutesPerJob] = useState(12);
  const [labourRate, setLabourRate] = useState(65);
  const [recoveredMinutesPerEngineer, setRecoveredMinutesPerEngineer] = useState(15);

  const result = useMemo(() => {
    const weeks = 48;
    const workingDays = 220;
    const annualJobs = jobsPerWeek * weeks;
    const adminHours = (annualJobs * adminMinutesPerJob) / 60;
    const fieldHours = (engineers * recoveredMinutesPerEngineer * workingDays) / 60;
    const capacityValue = fieldHours * labourRate;

    return {
      annualJobs,
      adminHours,
      fieldHours,
      capacityValue,
    };
  }, [engineers, jobsPerWeek, adminMinutesPerJob, labourRate, recoveredMinutesPerEngineer]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <section className="rounded-[2rem] border border-emerald-950/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <span className="inline-flex rounded-xl bg-emerald-100 p-2.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Calculator className="h-5 w-5" />
          </span>
          <div>
            <p className="font-black">Your current workload</p>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Change the assumptions to match your business.</p>
          </div>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">
            Engineers / technicians
            <input type="number" min={1} max={100} value={engineers} onChange={(event) => setEngineers(Number(event.target.value) || 1)} className="rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-base font-black outline-none focus:border-emerald-600 dark:border-white/15 dark:bg-slate-950" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Jobs per week
            <input type="number" min={1} max={1000} value={jobsPerWeek} onChange={(event) => setJobsPerWeek(Number(event.target.value) || 1)} className="rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-base font-black outline-none focus:border-emerald-600 dark:border-white/15 dark:bg-slate-950" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Admin minutes per job
            <input type="number" min={0} max={180} value={adminMinutesPerJob} onChange={(event) => setAdminMinutesPerJob(Number(event.target.value) || 0)} className="rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-base font-black outline-none focus:border-emerald-600 dark:border-white/15 dark:bg-slate-950" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Labour rate (£ / hour)
            <input type="number" min={1} max={500} value={labourRate} onChange={(event) => setLabourRate(Number(event.target.value) || 1)} className="rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-base font-black outline-none focus:border-emerald-600 dark:border-white/15 dark:bg-slate-950" />
          </label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">
            Potential productive minutes recovered per engineer / day
            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
              <input type="range" min={0} max={60} step={5} value={recoveredMinutesPerEngineer} onChange={(event) => setRecoveredMinutesPerEngineer(Number(event.target.value))} className="accent-emerald-700" />
              <span className="min-w-16 rounded-xl bg-emerald-50 px-3 py-2 text-center font-black text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{recoveredMinutesPerEngineer} min</span>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] bg-emerald-950 p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Illustrative annual impact</p>
        <h3 className="mt-3 text-3xl font-black tracking-tight">What better workflow capacity could look like.</h3>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Clock3 className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-2xl font-black">{whole(result.adminHours)} hrs</p>
            <p className="mt-1 text-sm font-medium text-emerald-50/70">Admin time represented by current job paperwork assumptions.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Users className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-2xl font-black">{whole(result.fieldHours)} hrs</p>
            <p className="mt-1 text-sm font-medium text-emerald-50/70">Potential technician capacity from the minutes you entered.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <PoundSterling className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-3xl font-black">{gbp(result.capacityValue)}</p>
            <p className="mt-1 text-sm font-medium text-emerald-50/70">Illustrative annual billable-capacity value if all recovered field time could be sold at your labour rate.</p>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-emerald-300/20 bg-emerald-900/50 p-4 text-sm font-medium leading-6 text-emerald-50/85">
          This is a planning illustration, not a guaranteed saving or revenue forecast. Your actual outcome depends on workflow, utilisation, pricing and how your team uses AgriCore.
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-black text-emerald-950">Start free trial <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/contact" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-3 font-black text-white">Discuss your workflow</Link>
        </div>
      </section>
    </div>
  );
}
