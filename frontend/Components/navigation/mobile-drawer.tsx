"use client";

import { useEffect, useRef } from "react";

import CompanyBrand from "@/Components/branding/company-brand";

import CompanySwitcher from "./company-switcher";
import NavigationMenu from "./navigation-menu";
import SidebarIcon from "./sidebar-icon";
import UserCard from "./user-card";
import type { UserNavigationState } from "./navigation-types";

type MobileDrawerProps = {
  open: boolean;
  pathname: string;
  userState: UserNavigationState;
  loading: boolean;
  switchingCompany: boolean;
  companyError: string;
  onSwitchCompany: (companyId: string) => Promise<void>;
  onClose: () => void;
};

export default function MobileDrawer({
  open,
  pathname,
  userState,
  loading,
  switchingCompany,
  companyError,
  onSwitchCompany,
  onClose,
}: MobileDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/55 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close navigation menu"
        tabIndex={open ? 0 : -1}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`absolute inset-y-0 left-0 flex w-[min(88vw,22rem)] flex-col bg-[#103d2e] text-white shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <CompanyBrand compact dark />
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition active:bg-white/10"
              aria-label="Close navigation menu"
            >
              <SidebarIcon name="close" className="h-6 w-6" />
            </button>
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
          onNavigate={onClose}
        />

        <div className="border-t border-white/10 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="rounded-2xl bg-white/10 p-4">
            <UserCard
              userState={userState}
              loading={loading}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}