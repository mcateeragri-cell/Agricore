"use client";

import type {
  CompanyOption,
  UserNavigationState,
} from "./navigation-types";

type CompanySwitcherProps = {
  userState: UserNavigationState;
  loading: boolean;
  switchingCompany: boolean;
  error: string;
  onSwitchCompany: (companyId: string) => Promise<void>;
  compact?: boolean;
};

export default function CompanySwitcher({
  userState,
  loading,
  switchingCompany,
  error,
  onSwitchCompany,
  compact = false,
}: CompanySwitcherProps) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-2.5 w-24 rounded bg-white/10" />
        <div className="mt-2 h-10 rounded-xl bg-white/10" />
      </div>
    );
  }

  const activeCompany = userState.activeCompany;

  if (!activeCompany) {
    return (
      <div
        className="rounded-xl border border-amber-200/20 bg-amber-100/10 px-3 py-2 text-xs leading-5 text-amber-100"
        role="status"
      >
        No active company is available for this account.
      </div>
    );
  }

  const companies = normaliseCompanies(
    userState.companies,
    activeCompany,
  );

  return (
    <div className={compact ? "" : "mt-4"}>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100/70">
        Active company
      </p>

      {companies.length > 1 ? (
        <select
          value={activeCompany.id}
          onChange={(event) =>
            void onSwitchCompany(event.target.value)
          }
          disabled={switchingCompany}
          className="min-h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-white/35 focus:bg-white/15 disabled:cursor-wait disabled:opacity-60"
          aria-label="Active company"
        >
          {companies.map((company) => (
            <option
              key={company.id}
              value={company.id}
              className="bg-white text-slate-900"
            >
              {company.name}
            </option>
          ))}
        </select>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="truncate text-sm font-semibold text-white">
            {activeCompany.name}
          </p>
        </div>
      )}

      {switchingCompany && (
        <p className="mt-2 text-xs text-emerald-100">
          Switching company…
        </p>
      )}

      {error && (
        <p
          className="mt-2 text-xs leading-5 text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function normaliseCompanies(
  companies: CompanyOption[],
  activeCompany: CompanyOption,
) {
  const companyById = new Map<string, CompanyOption>();

  for (const company of companies) {
    if (company.id) {
      companyById.set(company.id, company);
    }
  }

  companyById.set(activeCompany.id, activeCompany);

  return Array.from(companyById.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}