"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CompanyOption = {
  id: string;
  name: string;
  slug: string;
};

type CompanyContextResponse = {
  activeCompany?: CompanyOption;
  companies?: CompanyOption[];
  error?: string;
};

function safeRedirectPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function SelectCompanyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectCompany = useCallback(
    async (companyId: string) => {
      if (!companyId || submitting) {
        return;
      }

      setSubmitting(true);
      setError("");

      try {
        const response = await fetch("/api/auth/company-context", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });

        const result = (await response.json()) as CompanyContextResponse;

        if (!response.ok) {
          throw new Error(result.error || "Unable to select this company.");
        }

        router.replace(redirectTo);
        router.refresh();
      } catch (selectError) {
        setError(
          selectError instanceof Error
            ? selectError.message
            : "Unable to select this company.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [redirectTo, router, submitting],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/auth/company-context", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        const result = (await response.json()) as CompanyContextResponse;

        if (!response.ok) {
          throw new Error(result.error || "Unable to load your companies.");
        }

        const availableCompanies = result.companies ?? [];

        if (availableCompanies.length === 0) {
          throw new Error("No active company is linked to this account.");
        }

        if (cancelled) {
          return;
        }

        setCompanies(availableCompanies);

        const initialCompanyId =
          result.activeCompany?.id ?? availableCompanies[0].id;

        setSelectedCompanyId(initialCompanyId);

        if (availableCompanies.length === 1) {
          await selectCompany(initialCompanyId);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your companies.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCompanies();

    return () => {
      cancelled = true;
    };
  }, [selectCompany]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await selectCompany(selectedCompanyId);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-emerald-50 px-4 py-10 dark:bg-slate-950">
      <section className="w-full max-w-lg rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-xl sm:p-8 dark:border-white/10 dark:bg-slate-900">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          AgriCore
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
          Select company
        </h1>

        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Choose the company workspace you want to open.
        </p>

        {loading ? (
          <p className="mt-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading companies...
          </p>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {companies.length > 0 ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Company
                </span>
                <select
                  value={selectedCompanyId}
                  onChange={(event) => setSelectedCompanyId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {error ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            ) : null}

            {companies.length > 0 ? (
              <button
                type="submit"
                disabled={!selectedCompanyId || submitting}
                className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Opening company..." : "Continue"}
              </button>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}

export default function SelectCompanyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-emerald-50 px-4 dark:bg-slate-950">
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            Loading companies...
          </p>
        </main>
      }
    >
      <SelectCompanyForm />
    </Suspense>
  );
}
