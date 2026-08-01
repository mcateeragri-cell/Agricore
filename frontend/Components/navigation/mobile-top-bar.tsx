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
    <header className="agricore-glass sticky top-0 z-30 border-x-0 border-t-0 lg:hidden">
      <div className="flex min-h-16 items-center gap-3 px-3 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-primary)] transition active:scale-95 active:bg-[var(--surface-strong)]"
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
