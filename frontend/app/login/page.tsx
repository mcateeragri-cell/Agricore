"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

type CompanyContextResponse = {
  companies?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  error?: string;
};

type OnboardingResponse = {
  onboarding?: {
    completed_at?: string | null;
  };
};

function safeRedirectPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const verified = searchParams.get("verified") === "1";
  const signupComplete = searchParams.get("signup") === "complete";

  async function resolveNextPath(requestedPath: string) {
    try {
      const response = await fetch("/api/platform/onboarding", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!response.ok) {
        return requestedPath;
      }

      const result = (await response.json()) as OnboardingResponse;

      if (!result.onboarding?.completed_at) {
        return "/onboarding";
      }
    } catch {
      return requestedPath;
    }

    return requestedPath;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const requestedPath = safeRedirectPath(searchParams.get("redirectTo"));

      const response = await fetch("/api/auth/company-context", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const result = (await response.json()) as CompanyContextResponse;

      if (!response.ok) {
        throw new Error(result.error || "Unable to load your companies.");
      }

      const companies = result.companies ?? [];

      if (companies.length > 1) {
        const target = verified || signupComplete ? "/onboarding" : requestedPath;
        router.replace(`/select-company?redirectTo=${encodeURIComponent(target)}`);
        router.refresh();
        return;
      }

      const target = await resolveNextPath(
        verified || signupComplete ? "/onboarding" : requestedPath,
      );

      router.replace(target);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_34%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_52%,#ecfdf5_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(135deg,#020617_0%,#0f172a_52%,#022c22_100%)]">
      <div className="w-full max-w-md rounded-3xl border border-emerald-950/10 bg-white/95 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          AgriCore
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          Sign in
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Access your company workspace, customers, machines and jobs.
        </p>

        {verified || signupComplete ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            Your email is confirmed. Sign in to finish setting up your company.
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {errorMessage ? (
            <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-emerald-700 px-4 py-3.5 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

function LoginLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
          Loading AgriCore…
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
