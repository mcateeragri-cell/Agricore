"use client";

import {
  usePathname,
} from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import DesktopSidebar from "./navigation/desktop-sidebar";
import MobileBottomNav from "./navigation/mobile-bottom-nav";
import MobileDrawer from "./navigation/mobile-drawer";
import MobileTopBar from "./navigation/mobile-top-bar";
import SubscriptionAccessGate from "./platform/subscription-access-gate";
import CompanyThemeProvider from "./theme/company-theme-provider";
import GlobalSearch from "./search/global-search";
import {
  useNavigationUser,
} from "./navigation/use-navigation-user";

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

const shelllessRoutes = [
  "/",
  "/about",
  "/agricultural-crm",
  "/agricultural-engineer-software",
  "/agricultural-engineering-software",
  "/agricultural-invoicing-software",
  "/blog",
  "/contact",
  "/cookies",
  "/demo",
  "/farm-machinery-workshop-software",
  "/features",
  "/field-service-management-agriculture",
  "/forgot-password",
  "/founding-customers",
  "/industries",
  "/login",
  "/machinery-service-management-software",
  "/mobile-job-sheets-agricultural-engineers",
  "/onboarding",
  "/pricing",
  "/privacy",
  "/reset-password",
  "/roi-calculator",
  "/security",
  "/select-company",
  "/signup",
  "/terms",
  "/unauthorised",
  "/workshop-scheduling-software",
];

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const {
    userState,
    loading,
    switchingCompany,
    switchingBranch,
    error: companyError,
    switchCompany,
    switchBranch,
  } = useNavigationUser();

  const isShelllessRoute =
    shelllessRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(
          `${route}/`,
        ),
    );

  const closeMobileMenu =
    useCallback(() => {
      setMobileMenuOpen(false);
    }, []);

  useEffect(() => {
    closeMobileMenu();
  }, [
    pathname,
    closeMobileMenu,
  ]);

  if (isShelllessRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-clip lg:flex">
      <CompanyThemeProvider
        companyId={userState.activeCompany?.id ?? null}
      />

      <DesktopSidebar
        pathname={pathname}
        userState={userState}
        loading={loading}
        switchingCompany={
          switchingCompany
        }
        companyError={companyError}
        switchingBranch={switchingBranch}
        onSwitchCompany={switchCompany}
        onSwitchBranch={switchBranch}
      />

      <div className="w-full min-w-0 flex-1">
        <GlobalSearch />

        <MobileTopBar
          onOpenMenu={() =>
            setMobileMenuOpen(true)
          }
        />

        {userState.activeCompany?.slug?.startsWith("demo-") && (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            Demo company · Sample data only · Reset from Platform → Demo companies
          </div>
        )}

        <main className="w-full min-w-0 overflow-x-clip pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <SubscriptionAccessGate>{children}</SubscriptionAccessGate>
        </main>
      </div>

      <MobileDrawer
        open={mobileMenuOpen}
        pathname={pathname}
        userState={userState}
        loading={loading}
        switchingCompany={
          switchingCompany
        }
        companyError={companyError}
        switchingBranch={switchingBranch}
        onSwitchCompany={switchCompany}
        onSwitchBranch={switchBranch}
        onClose={closeMobileMenu}
      />

      <MobileBottomNav
        pathname={pathname}
        userState={userState}
        onOpenMore={() =>
          setMobileMenuOpen(true)
        }
      />
    </div>
  );
}