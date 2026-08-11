"use client";

import AgriCoreMark from "@/Components/branding/agricore-mark";

import CompanySwitcher from "./company-switcher";
import NavigationMenu from "./navigation-menu";
import UserCard from "./user-card";
import type { UserNavigationState } from "./navigation-types";

type DesktopSidebarProps = {
  pathname: string;
  userState: UserNavigationState;
  loading: boolean;
  switchingCompany: boolean;
  companyError: string;
  onSwitchCompany: (companyId: string) => Promise<void>;
};

export default function DesktopSidebar({
  pathname,
  userState,
  loading,
  switchingCompany,
  companyError,
  onSwitchCompany,
}: DesktopSidebarProps) {
  const activeCompanyName =
    userState.activeCompany?.name?.trim() ||
    "No active company";

  return (
    <aside className="agricore-sidebar hidden h-dvh w-64 shrink-0 flex-col text-white lg:sticky lg:top-0 lg:flex">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <AgriCoreMark size={46} priority />

          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">
              AgriCore
            </p>

            <p
              className="truncate text-xs font-semibold text-emerald-100"
              title={activeCompanyName}
            >
              {loading
                ? "Loading company…"
                : activeCompanyName}
            </p>
          </div>
        </div>

        <CompanySwitcher
          userState={userState}
          loading={loading}
          switchingCompany={switchingCompany}
          error={companyError}
          onSwitchCompany={onSwitchCompany}
        />
      </div>

      <NavigationMenu
        pathname={pathname}
        userState={userState}
        loading={loading}
      />

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl border border-white/10 bg-white/8 p-4 shadow-lg backdrop-blur-xl">
          <UserCard
            userState={userState}
            loading={loading}
          />
        </div>
      </div>
    </aside>
  );
}
