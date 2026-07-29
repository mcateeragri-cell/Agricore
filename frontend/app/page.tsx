import DashboardHeader from "../Components/Dashboard/DashboardHeader";
import QuickActions from "../Components/Dashboard/QuickActions";
import RecentJobs from "../Components/Dashboard/RecentJobs";
import Schedule from "../Components/Dashboard/Schedule";
import SummaryCards from "../Components/Dashboard/SummaryCards";

export default function Home() {
  return (
    <div className="min-h-dvh w-full min-w-0">
      <DashboardHeader />

      <main className="w-full min-w-0 p-4 sm:p-6 lg:p-8">
        <section className="mb-6 sm:mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Business overview
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Good evening, James
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-700 sm:text-base dark:text-slate-400">
            Here is what is happening across the business.
          </p>
        </section>

        <SummaryCards />

        <section className="mt-6 grid min-w-0 gap-6 xl:mt-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="min-w-0">
            <RecentJobs />
          </div>

          <div className="min-w-0 space-y-6">
            <Schedule />
            <QuickActions />
          </div>
        </section>
      </main>
    </div>
  );
}