import { requireAuthenticatedUser } from "@/lib/auth/require-permission";
import OnboardingWizard from "@/Components/platform/onboarding-wizard";

export default async function OnboardingPage() {
  const user = await requireAuthenticatedUser();
  const firstName = user.fullName.split(/\s+/)[0] || "there";

  return (
    <main className="min-h-dvh bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4 py-8 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 font-black text-white shadow-lg">AC</div>
          <div><p className="text-xl font-black text-slate-950 dark:text-white">AgriCore</p><p className="text-sm text-slate-600 dark:text-slate-300">Company setup</p></div>
        </div>
        <OnboardingWizard firstName={firstName} companyName={user.companyName} />
      </div>
    </main>
  );
}
