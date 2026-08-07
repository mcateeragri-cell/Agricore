import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import SignupForm from "@/Components/platform/signup-form";

export const metadata: Metadata = {
  title: "Start free trial",
  description:
    "Start a 14-day AgriCore trial for your agricultural engineering business.",
};

const benefits = [
  "Unlimited job cards during your trial",
  "Customer and machine service history",
  "Mobile technician workflow",
  "Offline-ready field working",
  "Card or Apple Pay required before trial starts",
];

export default function SignupPage() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_36%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8 lg:py-10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(135deg,#020617_0%,#0f172a_52%,#022c22_100%)] dark:text-white">
      <div className="mx-auto grid min-h-[calc(100dvh-3rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-white/75 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)] dark:border-white/10 dark:bg-slate-950/72 dark:shadow-black/30">
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-4 dark:focus:ring-offset-slate-950"
              aria-label="AgriCore home"
            >
              <Image
                src="/icons/icon-192.png"
                alt="AgriCore"
                width={56}
                height={56}
                className="rounded-2xl shadow-lg shadow-emerald-950/15"
                priority
              />
              <div>
                <p className="text-xl font-black tracking-tight">AgriCore</p>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  Agricultural service management
                </p>
              </div>
            </Link>

            <div className="mt-12 max-w-2xl lg:mt-20">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Built for agricultural engineers
              </p>

              <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Run your agricultural engineering business from one place.
              </h1>

              <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-650 sm:text-lg dark:text-slate-300">
                Manage jobs, customers, machines, technicians, service schedules,
                quotations and invoicing in a platform designed around field service work.
              </p>

              <ul className="mt-9 grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 rounded-2xl border border-emerald-950/8 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white"
                    >
                      ✓
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-10 text-xs font-medium text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} AgriCore. Built for agricultural service businesses.
          </p>
        </section>

        <section className="flex items-center bg-slate-950 px-6 py-8 sm:px-10 lg:px-12 dark:bg-black/30">
          <div className="w-full rounded-[1.75rem] border border-white/10 bg-white p-6 shadow-2xl sm:p-8 lg:p-10 dark:bg-slate-900">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              14-day free trial
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Create your AgriCore account
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              Enter your details below. Company creation and trial activation will be
              completed securely before you add a card or Apple Pay for billing after the trial.
            </p>

            <SignupForm />

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>✓ £0 charged today</span>
              <span>✓ 14 days free</span>
              <span>✓ Cancel anytime</span>
            </div>

            <p className="mt-7 text-center text-sm font-medium text-slate-600 dark:text-slate-300">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-black text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
