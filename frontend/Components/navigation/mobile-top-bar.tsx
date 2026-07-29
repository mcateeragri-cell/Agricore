"use client";

import CompanyBrand from "@/Components/branding/company-brand";

import SidebarIcon from "./sidebar-icon";

type MobileTopBarProps = {
  onOpenMenu: () => void;
};

export default function MobileTopBar({
  onOpenMenu,
}: MobileTopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      <div className="flex min-h-16 items-center gap-3 px-3 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 transition active:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <SidebarIcon name="menu" className="h-6 w-6" />
        </button>

        <div className="min-w-0 flex-1">
          <CompanyBrand compact />
        </div>
      </div>
    </header>
  );
}
