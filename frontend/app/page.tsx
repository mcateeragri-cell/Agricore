import Schedule from "../Components/Dashboard/Schedule";
import QuickActions from "../Components/Dashboard/QuickActions";
import DashboardHeader from "../Components/Dashboard/DashboardHeader";
import RecentJobs from "../Components/Dashboard/RecentJobs";
import SummaryCards from "../Components/Dashboard/SummaryCards";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <DashboardHeader />

      <div className="p-5 md:p-8">
        <section className="mb-8">
          <h2 className="text-lg font-bold">Good evening, James</h2>

          <p className="mt-1 text-sm text-slate-500">
            Here is what is happening across the business.
          </p>
        </section>

        <SummaryCards />

        <section className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
          <RecentJobs />

    <div className="space-y-6">
        <Schedule />
        <QuickActions />
          </div>
      
        </section>
      </div>
    </div>
  );
}