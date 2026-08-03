"use client";

import {
  FormEvent,
  Suspense,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

type CompanyContextResponse = {
  companies?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  error?: string;
};

function safeRedirectPath(
  value: string | null,
) {
  return value?.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } =
        await supabase.auth
          .signInWithPassword({
            email,
            password,
          });

      if (error) {
        throw error;
      }

      const requestedPath =
        safeRedirectPath(
          searchParams.get(
            "redirectTo",
          ),
        );

      const response = await fetch(
        "/api/auth/company-context",
        {
          method: "GET",
          cache: "no-store",
          credentials:
            "same-origin",
        },
      );

      const result =
        (await response.json()) as
          CompanyContextResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load your companies.",
        );
      }

      const companies =
        result.companies ?? [];

      if (companies.length > 1) {
        const query =
          requestedPath !== "/"
            ? `?redirectTo=${encodeURIComponent(
                requestedPath,
              )}`
            : "";

        router.replace(
          `/select-company${query}`,
        );
        router.refresh();
        return;
      }

      router.replace(
        requestedPath,
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in.",
      );

      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-white/50 bg-white/90 p-8 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-700 dark:text-emerald-300">
          AgriCore
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
          Sign in
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Sign in to access your customers,
          machines and jobs.
        </p>

        <form
          onSubmit={handleLogin}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200"
            >
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-green-800 px-4 py-3 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
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
    <Suspense
      fallback={<LoginLoading />}
    >
      <LoginForm />
    </Suspense>
  );
}