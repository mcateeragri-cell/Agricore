"use client";

import CompanyBrand from "@/Components/branding/company-brand";

import NavigationMenu from "./navigation-menu";
import UserCard from "./user-card";
import type { UserNavigationState } from "./navigation-types";

type DesktopSidebarProps = {
  pathname: string;
  userState: UserNavigationState;
  loading: boolean;
};

export default function DesktopSidebar({
  pathname,
  userState,
  loading,
}: DesktopSidebarProps) {
  return (
    <aside className="hidden h-dvh w-64 shrink-0 flex-col bg-[#103d2e] text-white lg:sticky lg:top-0 lg:flex">
      <div className="border-b border-white/10 px-4 py-4">
        <CompanyBrand compact dark />
      </div>

      <NavigationMenu
        pathname={pathname}
        userState={userState}
        loading={loading}
      />

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/10 p-4">
          <UserCard
            userState={userState}
            loading={loading}
          />
        </div>
      </div>
    </aside>
  );
}