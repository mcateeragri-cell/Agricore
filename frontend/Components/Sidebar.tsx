"use client";

import Link from "next/link";
import { getDemoPresentationIdentity } from "@/lib/demo-presentation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import CompanyBrand from "@/Components/branding/company-brand";
import { supabase } from "@/lib/supabase";

type UserRole =
  | "administrator"
  | "service_manager"
  | "office"
  | "parts_manager"
  | "technician"
  | "apprentice"
  | "read_only";

type IconName =
  | "dashboard"
  | "customers"
  | "machines"
  | "jobs"
  | "calendar"
  | "quotes"
  | "invoices"
  | "stock"
  | "reports"
  | "administration"
  | "users"
  | "roles"
  | "manufacturers"
  | "templates"
  | "settings"
  | "chevron"
  | "logout";

type NavigationItem = {
  name: string;
  href: string;
  icon: IconName;
};

type AdministrationItem = NavigationItem & {
  permissions: string[];
};

type CompanyOption = {
  id: string;
  name: string;
  slug: string;
};

type CompanyContextResponse = {
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole | null;
    permissions: string[];
  };
  activeCompany?: CompanyOption;
  companies?: CompanyOption[];
  error?: string;
};

type UserNavigationState = {
  fullName: string;
  email: string;
  role: UserRole | null;
  permissions: string[];
  activeCompany: CompanyOption | null;
  companies: CompanyOption[];
};

const mainNavigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Customers", href: "/customers", icon: "customers" },
  { name: "Machines", href: "/machines", icon: "machines" },
  { name: "Jobs", href: "/jobs", icon: "jobs" },
  { name: "Dispatch", href: "/dispatch", icon: "calendar" },
  { name: "Calendar", href: "/calendar", icon: "calendar" },
  { name: "Quotes", href: "/quotes", icon: "quotes" },
  { name: "Invoices", href: "/invoices", icon: "invoices" },
  { name: "Stock", href: "/stock", icon: "stock" },
];

const administrationItems: AdministrationItem[] = [
  {
    name: "Users",
    href: "/administration/users",
    icon: "users",
    permissions: [
      "users.view",
      "users.manage_all",
      "users.manage_technicians",
    ],
  },
  {
    name: "Roles & Permissions",
    href: "/administration/roles",
    icon: "roles",
    permissions: ["roles.manage"],
  },
  {
    name: "Manufacturers",
    href: "/administration/manufacturers",
    icon: "manufacturers",
    permissions: [
      "service_templates.view",
      "service_templates.manage",
    ],
  },
  {
    name: "Service Templates",
    href: "/administration/service-templates",
    icon: "templates",
    permissions: [
      "service_templates.view",
      "service_templates.manage",
      "service_templates.approve",
    ],
  },
  {
    name: "Company Settings",
    href: "/settings/company",
    icon: "settings",
    permissions: ["settings.manage"],
  },
];

const roleLabels: Record<UserRole, string> = {
  administrator: "Administrator",
  service_manager: "Service Manager",
  office: "Office",
  parts_manager: "Parts Manager",
  technician: "Technician",
  apprentice: "Apprentice",
  read_only: "Read Only",
};

const initialUserState: UserNavigationState = {
  fullName: "",
  email: "",
  role: null,
  permissions: [],
  activeCompany: null,
  companies: [],
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [userState, setUserState] =
    useState<UserNavigationState>(initialUserState);
  const [loading, setLoading] = useState(true);
  const [switchingCompany, setSwitchingCompany] =
    useState(false);
  const [companyError, setCompanyError] =
    useState("");
  const isAdministrationRoute =
    pathname.startsWith("/administration") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/");

  const [administrationOpen, setAdministrationOpen] =
    useState(isAdministrationRoute);

  const loadCurrentUser = useCallback(async () => {
    setLoading(true);
    setCompanyError("");

    try {
      const response = await fetch(
        "/api/auth/company-context",
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        },
      );

      const result =
        (await response.json()) as CompanyContextResponse;

      if (!response.ok) {
        if (response.status === 401) {
          setUserState(initialUserState);
          return;
        }

        throw new Error(
          result.error || "Unable to load company context.",
        );
      }

      setUserState({
        fullName:
          result.user?.fullName ||
          result.user?.email?.split("@")[0] ||
          "AgriCore User",
        email: result.user?.email ?? "",
        role: isUserRole(result.user?.role)
          ? result.user.role
          : null,
        permissions: result.user?.permissions ?? [],
        activeCompany: result.activeCompany ?? null,
        companies: result.companies ?? [],
      });
    } catch (error) {
      console.error(
        "Unable to load sidebar context:",
        error,
      );

      setUserState(initialUserState);
      setCompanyError(
        error instanceof Error
          ? error.message
          : "Unable to load company details.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    if (isAdministrationRoute) {
      setAdministrationOpen(true);
    }
  }, [isAdministrationRoute]);

  const visibleAdministrationItems = useMemo(
    () =>
      administrationItems.filter((item) =>
        item.permissions.some((permission) =>
          userState.permissions.includes(permission),
        ),
      ),
    [userState.permissions],
  );

  const canSeeAdministration =
    visibleAdministrationItems.length > 0;

  function isLinkActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  async function handleCompanyChange(
    companyId: string,
  ) {
    if (
      !companyId ||
      companyId === userState.activeCompany?.id ||
      switchingCompany
    ) {
      return;
    }

    setSwitchingCompany(true);
    setCompanyError("");

    try {
      const response = await fetch(
        "/api/auth/company-context",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ companyId }),
        },
      );

      const result =
        (await response.json()) as CompanyContextResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to switch company.",
        );
      }

      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error("Unable to switch company:", error);

      setCompanyError(
        error instanceof Error
          ? error.message
          : "Unable to switch company.",
      );
    } finally {
      setSwitchingCompany(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Unable to sign out:", error);
      return;
    }

    window.location.href = "/login";
  }

  const demoIdentity = getDemoPresentationIdentity(userState.activeCompany);
  const displayName = demoIdentity?.name ?? userState.fullName;
  const displayEmail = demoIdentity?.email ?? userState.email;

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-[#103d2e] text-white lg:flex">
      <div className="border-b border-white/10 px-4 py-4">
        <CompanyBrand compact dark />

        {!loading && userState.activeCompany && (
          <div className="mt-4">
            {userState.companies.length > 1 ? (
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100/70">
                  Active company
                </span>

                <select
                  value={userState.activeCompany.id}
                  onChange={(event) =>
                    void handleCompanyChange(
                      event.target.value,
                    )
                  }
                  disabled={switchingCompany}
                  className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-white/35 focus:bg-white/15 disabled:cursor-wait disabled:opacity-60"
                  aria-label="Active company"
                >
                  {userState.companies.map((company) => (
                    <option
                      key={company.id}
                      value={company.id}
                      className="bg-white text-slate-900"
                    >
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100/70">
                  Active company
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {userState.activeCompany.name}
                </p>
              </div>
            )}

            {companyError && (
              <p className="mt-2 text-xs leading-5 text-red-200">
                {companyError}
              </p>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-1">
          {mainNavigationItems.map((item) => (
            <SidebarLink
              key={item.name}
              item={item}
              isActive={isLinkActive(item.href)}
            />
          ))}
        </div>

        {!loading && canSeeAdministration && (
          <div className="mt-6 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() =>
                setAdministrationOpen(
                  (current) => !current,
                )
              }
              className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                isAdministrationRoute
                  ? "bg-white/15 text-white"
                  : "text-emerald-50 hover:bg-white/10 hover:text-white"
              }`}
              aria-expanded={administrationOpen}
            >
              <span className="flex items-center gap-3">
                <SidebarIcon
                  name="administration"
                  className="h-5 w-5 shrink-0"
                />
                Administration
              </span>

              <SidebarIcon
                name="chevron"
                className={`h-4 w-4 shrink-0 transition-transform ${
                  administrationOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {administrationOpen && (
              <div className="mt-1 space-y-1 pl-3">
                {visibleAdministrationItems.map(
                  (item) => (
                    <SidebarLink
                      key={item.name}
                      item={item}
                      isActive={isLinkActive(item.href)}
                      isChild
                    />
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/10 p-4">
          {loading ? (
            <UserCardSkeleton />
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white font-bold text-[#103d2e]">
                  {getInitials(displayName)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {displayName ||
                      "AgriCore User"}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-emerald-100">
                    {userState.role
                      ? roleLabels[userState.role]
                      : "No role assigned"}
                  </p>

                  {displayEmail && (
                    <p className="mt-1 truncate text-[11px] text-emerald-100/70">
                      {displayEmail}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-white/10 hover:text-white"
              >
                <SidebarIcon
                  name="logout"
                  className="h-4 w-4"
                />
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  isActive,
  isChild = false,
}: {
  item: NavigationItem | AdministrationItem;
  isActive: boolean;
  isChild?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg py-3 text-sm font-semibold transition ${
        isChild ? "px-3" : "px-4"
      } ${
        isActive
          ? "bg-white text-[#103d2e]"
          : "text-emerald-50 hover:bg-white/10 hover:text-white"
      }`}
    >
      <SidebarIcon
        name={item.icon}
        className="h-5 w-5 shrink-0"
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

function UserCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-white/15" />
        <div className="flex-1">
          <div className="h-3 w-28 rounded bg-white/15" />
          <div className="mt-2 h-2 w-20 rounded bg-white/10" />
        </div>
      </div>
      <div className="mt-4 h-8 rounded-lg bg-white/10" />
    </div>
  );
}

function getInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return "AC";
  }

  return words
    .map((word) => word[0].toUpperCase())
    .join("");
}

function isUserRole(
  value: unknown,
): value is UserRole {
  return (
    value === "administrator" ||
    value === "service_manager" ||
    value === "office" ||
    value === "parts_manager" ||
    value === "technician" ||
    value === "apprentice" ||
    value === "read_only"
  );
}

function SidebarIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case "customers":
    case "users":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "machines":
      return (
        <svg {...commonProps}>
          <circle cx="7" cy="17" r="3" />
          <circle cx="18" cy="17" r="2" />
          <path d="M4 17H2V9h9l3 4h4v2" />
          <path d="M7 14V7h5" />
          <path d="M12 7h4l2 6" />
        </svg>
      );

    case "jobs":
      return (
        <svg {...commonProps}>
          <path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4" />
          <path d="M8 3v4" />
          <path d="M3 10h18" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
        </svg>
      );

    case "quotes":
      return (
        <svg {...commonProps}>
          <path d="M6 2h9l4 4v16H6z" />
          <path d="M14 2v5h5" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </svg>
      );

    case "invoices":
      return (
        <svg {...commonProps}>
          <path d="M5 3h14v18l-3-2-4 2-4-2-3 2z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h3" />
        </svg>
      );

    case "stock":
      return (
        <svg {...commonProps}>
          <path d="M21 8l-9 5-9-5" />
          <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
          <path d="M12 13v8" />
        </svg>
      );

    case "reports":
      return (
        <svg {...commonProps}>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20V7" />
        </svg>
      );

    case "administration":
    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20H9.75v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 5.09 15a1.7 1.7 0 0 0-1.55-1H3v-3h.54a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V4h4.5v.79a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 18.91 10a1.7 1.7 0 0 0 1.55 1H21v3h-.54a1.7 1.7 0 0 0-1.06 1z" />
        </svg>
      );

    case "roles":
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="M6 16a3 3 0 0 1 6 0" />
          <path d="M15 9h3" />
          <path d="M15 13h3" />
        </svg>
      );

    case "manufacturers":
      return (
        <svg {...commonProps}>
          <path d="M3 21V9l6 3V9l6 3V5l6 3v13z" />
          <path d="M7 17h2" />
          <path d="M13 17h2" />
          <path d="M18 17h1" />
        </svg>
      );

    case "templates":
      return (
        <svg {...commonProps}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...commonProps}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );

    case "logout":
      return (
        <svg {...commonProps}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
        </svg>
      );

    default:
      return null;
  }
}