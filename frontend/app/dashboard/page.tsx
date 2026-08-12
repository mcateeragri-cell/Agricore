"use client";

import DashboardHeader from "../../Components/Dashboard/DashboardHeader";
import SubscriptionBanner from "../../Components/Dashboard/SubscriptionBanner";
import CustomisableDashboard from "../../Components/Dashboard/CustomisableDashboard";
import SetupProgressCard from "@/Components/onboarding/SetupProgressCard";
import GuidedTour from "@/Components/onboarding/GuidedTour";
import {
  canViewFinancialInformation,
  isFieldRole,
} from "../../Components/navigation/navigation-types";
import { useNavigationUser } from "../../Components/navigation/use-navigation-user";
import TechnicianDashboardPage from "../technician/page";
import { getDemoPresentationIdentity } from "@/lib/demo-presentation";

function greetingForCurrentTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { userState, loading } = useNavigationUser();
  const demoIdentity = getDemoPresentationIdentity(userState.activeCompany);
  const displayName = demoIdentity?.name ?? userState.fullName;
  const firstName = displayName.trim().split(/\s+/)[0] || "there";
  const canViewMoney = canViewFinancialInformation(userState);

  if (!loading && isFieldRole(userState.role)) {
    return <TechnicianDashboardPage />;
  }

  return (
    <div className="min-h-dvh w-full min-w-0 bg-slate-50/60 dark:bg-slate-950">
      <DashboardHeader />
      <GuidedTour />

      <main className="mx-auto w-full max-w-[1600px] min-w-0 p-4 sm:p-6 lg:p-8">
        <section className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
              {canViewMoney ? "Today at a glance" : "My work today"}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              {loading ? "Welcome back" : `${greetingForCurrentTime()}, ${firstName}`}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base dark:text-slate-400">
              {canViewMoney
                ? "The work, customers and numbers that need your attention — without digging through menus."
                : "Your current jobs, schedule and service workload in one place."}
            </p>
          </div>

          {userState.activeCompany?.name ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Active company</p>
              <p className="mt-0.5 text-sm font-black text-emerald-950 dark:text-emerald-100">{userState.activeCompany.name}</p>
            </div>
          ) : null}
        </section>

        {userState.permissions.includes("settings.manage") || userState.role === "company_admin" || userState.role === "administrator" ? <SubscriptionBanner /> : null}

        <SetupProgressCard />

        <CustomisableDashboard
          canViewMoney={canViewMoney}
          enabled={userState.enabledFeatures.includes("dashboard_builder")}
          atlasEnabled={userState.enabledFeatures.includes("atlas_intelligence")}
        />
      </main>
    </div>
  );
}
