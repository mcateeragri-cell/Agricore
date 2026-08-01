"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import DesktopSidebar from "./navigation/desktop-sidebar";
import MobileBottomNav from "./navigation/mobile-bottom-nav";
import MobileDrawer from "./navigation/mobile-drawer";
import MobileTopBar from "./navigation/mobile-top-bar";
import { useNavigationUser } from "./navigation/use-navigation-user";

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

const publicRoutes = [
  "/login",
  "/forgot-password",
  "/reset-password",
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    userState,
    loading,
    switchingCompany,
    error: companyError,
    switchCompany,
  } = useNavigationUser();

  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route || pathname.startsWith(`${route}/`),
  );

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  if (isPublicRoute) return <>{children}</>;

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-clip lg:flex">
      <DesktopSidebar
        pathname={pathname}
        userState={userState}
        loading={loading}
        switchingCompany={switchingCompany}
        companyError={companyError}
        onSwitchCompany={switchCompany}
      />

      <div className="w-full min-w-0 flex-1">
        <MobileTopBar onOpenMenu={() => setMobileMenuOpen(true)} />

        <main className="w-full min-w-0 overflow-x-clip pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>
      </div>

      <MobileDrawer
        open={mobileMenuOpen}
        pathname={pathname}
        userState={userState}
        loading={loading}
        switchingCompany={switchingCompany}
        companyError={companyError}
        onSwitchCompany={switchCompany}
        onClose={closeMobileMenu}
      />

      <MobileBottomNav
        pathname={pathname}
        onOpenMore={() => setMobileMenuOpen(true)}
      />
    </div>
  );
}
