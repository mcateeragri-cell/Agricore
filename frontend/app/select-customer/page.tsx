"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";
import { getDemoPresentationIdentity } from "../../lib/demo-presentation";

type CompanyOption = {
  id: string;
  name: string;
  slug: string;
};

type CompanyContextResponse = {
  user?: {
    fullName?: string;
    email?: string;
  };
  activeCompany?: CompanyOption;
  companies?: CompanyOption[];
  error?: string;
};

function safeRedirectPath(
  value: string | null,
) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith(
      "/select-company",
    )
    ? value
    : "/dashboard";
}

function SelectCompanyContent() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const [companies, setCompanies] =
    useState<CompanyOption[]>([]);

  const [
    activeCompanyId,
    setActiveCompanyId,
  ] = useState("");

  const [fullName, setFullName] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [switching, setSwitching] =
    useState("");

  const [error, setError] =
    useState("");

  const redirectTo =
    safeRedirectPath(
      searchParams.get(
        "redirectTo",
      ),
    );

  const loadCompanies =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/auth/company-context",
          {
            cache: "no-store",
            credentials:
              "same-origin",
          },
        );

        const result =
          (await response.json()) as
            CompanyContextResponse;

        if (response.status === 401) {
          router.replace(
            `/login?redirectTo=${encodeURIComponent(
              redirectTo,
            )}`,
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load your companies.",
          );
        }

        const availableCompanies =
          result.companies ?? [];

        setCompanies(
          availableCompanies,
        );

        setActiveCompanyId(
          result.activeCompany?.id ??
            "",
        );

        const demoIdentity = getDemoPresentationIdentity(result.activeCompany ?? null);
        setFullName(
          demoIdentity?.name ||
            result.user?.fullName ||
            result.user?.email?.split("@")[0] ||
            "AgriCore User",
        );

        if (
          availableCompanies.length ===
          1
        ) {
          router.replace(
            redirectTo,
          );
          router.refresh();
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your companies.",
        );
      } finally {
        setLoading(false);
      }
    }, [redirectTo, router]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  async function chooseCompany(
    companyId: string,
  ) {
    if (!companyId || switching) {
      return;
    }

    setSwitching(companyId);
    setError("");

    try {
      const response = await fetch(
        "/api/auth/company-context",
        {
          method: "POST",
          credentials:
            "same-origin",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            companyId,
          }),
        },
      );

      const result =
        (await response.json()) as
          CompanyContextResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to select company.",
        );
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (switchError) {
      setError(
        switchError instanceof Error
          ? switchError.message
          : "Unable to select company.",
      );
    } finally {
      setSwitching("");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href =
      "/login";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-xl rounded-3xl border border-white/50 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          AgriCore
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
          Choose company
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Welcome, {fullName}. Choose
          the company you want to open.
        </p>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-slate-100 p-6 text-center text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Loading companies…
          </div>
        ) : null}

        {!loading ? (
          <div className="mt-6 space-y-3">
            {companies.map(
              (company) => {
                const isActive =
                  company.id ===
                  activeCompanyId;

                const isSwitching =
                  switching ===
                  company.id;

                return (
                  <button
                    key={company.id}
                    type="button"
                    disabled={Boolean(
                      switching,
                    )}
                    onClick={() =>
                      void chooseCompany(
                        company.id,
                      )
                    }
                    className={`flex min-h-20 w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                        : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-950/70 dark:hover:border-emerald-800"
                    } disabled:cursor-wait disabled:opacity-60`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-950 dark:text-white">
                        {company.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {isActive
                          ? "Last active company"
                          : company.slug}
                      </p>
                    </div>

                    <span className="shrink-0 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {isSwitching
                        ? "Opening…"
                        : "Open"}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() =>
            void signOut()
          }
          className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

export default function SelectCompanyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            Loading companies…
          </p>
        </main>
      }
    >
      <SelectCompanyContent />
    </Suspense>
  );
}