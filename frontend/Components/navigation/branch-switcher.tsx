"use client";

import type { UserNavigationState } from "./navigation-types";

type Props = {
  userState: UserNavigationState;
  loading: boolean;
  switching: boolean;
  onSwitchBranch: (branchId: string) => Promise<void>;
};

export default function BranchSwitcher({ userState, loading, switching, onSwitchBranch }: Props) {
  const multiBranchEnabled = userState.enabledFeatures.includes("multi_branch");
  const accessible = new Set(userState.branchAccess?.accessibleOperationalBranchIds ?? []);
  const branches = userState.branches.filter((branch) => accessible.has(branch.id));

  if (loading || !multiBranchEnabled || branches.length <= 1) return null;
  const canViewAll = userState.branchAccess?.operationsScope === "company" || userState.branchAccess?.operationsScope === "selected";

  return (
    <label className="mt-3 block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/60">
        Active depot
      </span>
      <select
        value={userState.activeBranchId ?? "all"}
        onChange={(event) => void onSwitchBranch(event.target.value)}
        disabled={switching}
        className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-bold text-white outline-none transition focus:border-white/35 focus:bg-white/15 disabled:cursor-wait disabled:opacity-60"
        aria-label="Active depot"
      >
        {canViewAll ? <option value="all" className="bg-white text-slate-900">All accessible depots</option> : null}
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id} className="bg-white text-slate-900">
            {branch.name}{branch.isHeadOffice ? " · Head Office" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
