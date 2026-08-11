"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useNavigationUser } from "@/Components/navigation/use-navigation-user";

type Onboarding = {
  business_details_complete?: boolean;
  invoice_settings_complete?: boolean;
  payment_settings_complete?: boolean;
  team_setup_complete?: boolean;
  completed_at?: string | null;
};

type Counts = {
  customers: number;
  machines: number;
  jobs: number;
  team: number;
};

type Task = {
  label: string;
  detail: string;
  href: string;
  complete: boolean;
  optional?: boolean;
};

export default function SetupProgressCard() {
  const { userState, loading: userLoading } = useNavigationUser();
  const companyId = userState.activeCompany?.id ?? "";
  const isCompanyAdmin =
    userState.role === "company_admin" ||
    userState.role === "administrator" ||
    userState.permissions.includes("settings.manage");

  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [counts, setCounts] = useState<Counts>({ customers: 0, machines: 0, jobs: 0, team: 0 });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!companyId || !isCompanyAdmin) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const onboardingRequest = fetch("/api/platform/onboarding", { cache: "no-store" });
        const [customersResult, machinesResult, jobsResult, teamResult, onboardingResponse] = await Promise.all([
          supabase.from("customers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
          supabase.from("machines").select("id", { count: "exact", head: true }).eq("company_id", companyId),
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", companyId),
          supabase.from("company_members").select("user_id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
          onboardingRequest,
        ]);

        const onboardingJson = await onboardingResponse.json().catch(() => ({}));
        if (cancelled) return;

        setOnboarding(onboardingResponse.ok ? onboardingJson.onboarding ?? null : null);
        setCounts({
          customers: customersResult.count ?? 0,
          machines: machinesResult.count ?? 0,
          jobs: jobsResult.count ?? 0,
          team: teamResult.count ?? 0,
        });
      } catch (error) {
        console.error("Unable to load setup progress:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, isCompanyAdmin]);

  const tasks = useMemo<Task[]>(() => [
    {
      label: "Business profile",
      detail: "Company details and branding",
      href: "/administration/company-settings",
      complete: Boolean(onboarding?.business_details_complete),
    },
    {
      label: "Invoice & payment setup",
      detail: "Terms and customer payment details",
      href: "/administration/company-settings",
      complete: Boolean(onboarding?.invoice_settings_complete && onboarding?.payment_settings_complete),
    },
    {
      label: "First customer",
      detail: counts.customers ? `${counts.customers} customer${counts.customers === 1 ? "" : "s"} added` : "Add or import a customer",
      href: "/customers",
      complete: counts.customers > 0,
    },
    {
      label: "First machine",
      detail: counts.machines ? `${counts.machines} machine${counts.machines === 1 ? "" : "s"} added` : "Link a machine to a customer",
      href: "/machines",
      complete: counts.machines > 0,
    },
    {
      label: "First job",
      detail: counts.jobs ? `${counts.jobs} job${counts.jobs === 1 ? "" : "s"} created` : "Create your first live job",
      href: "/jobs/new",
      complete: counts.jobs > 0,
    },
    {
      label: "Invite your team",
      detail: counts.team > 1 ? `${counts.team} active users` : "Optional for sole traders",
      href: "/administration/users",
      complete: counts.team > 1 || Boolean(onboarding?.team_setup_complete),
      optional: true,
    },
  ], [counts, onboarding]);

  const completedRequired = tasks.filter((task) => !task.optional && task.complete).length;
  const requiredCount = tasks.filter((task) => !task.optional).length;
  const percent = Math.round((completedRequired / requiredCount) * 100);

  if (userLoading || loading || !companyId || !isCompanyAdmin || dismissed || onboarding?.completed_at) {
    return null;
  }

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-900/70 dark:bg-slate-900">
      <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-950 to-emerald-800 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Getting started</p>
            <h2 className="mt-1 text-xl font-black">Your AgriCore Setup Assistant</h2>
            <p className="mt-1 max-w-2xl text-sm text-emerald-100">Keep making progress while you work. AgriCore will quietly track the essentials and this card disappears automatically when setup is complete.</p>
          </div>
          <button type="button" onClick={() => setDismissed(true)} className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-emerald-50 hover:bg-white/10">Remind me later</button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-sm font-black">{percent}%</span>
        </div>
      </div>

      <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
        {tasks.map((task) => (
          <Link key={task.label} href={task.href} className="group flex items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-800 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${task.complete ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>
              {task.complete ? "✓" : "○"}
            </span>
            <div className="min-w-0">
              <p className="font-black text-slate-950 dark:text-white">{task.label}{task.optional ? <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Optional</span> : null}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{task.detail}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
