"use client";

import CompanyBrand from "@/Components/branding/company-brand";

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
  return (
    <aside className="agricore-sidebar hidden h-dvh w-64 shrink-0 flex-col text-white lg:sticky lg:top-0 lg:flex">
      <div className="border-b border-white/10 px-4 py-4">
        <CompanyBrand compact dark />

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
