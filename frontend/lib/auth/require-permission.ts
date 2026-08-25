import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { loadBranchAccessContext } from "@/lib/branches/access";

const ACTIVE_COMPANY_COOKIE = "agricore_company_id";
const ACTIVE_BRANCH_COOKIE = "agricore_branch_id";
const ACTIVE_FINANCE_BRANCH_COOKIE = "agricore_finance_branch_id";

export type PlatformRole =
  | "super_admin"
  | "platform_admin"
  | "support";

export type CompanyRole =
  | "company_admin"
  | "administrator"
  | "service_manager"
  | "office"
  | "parts_manager"
  | "parts_advisor"
  | "sales_manager"
  | "salesperson"
  | "technician"
  | "apprentice"
  | "read_only";

export type AuthenticatedUserContext = {
  userId: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole | null;
  companyId: string;
  companyName: string;
  companySlug: string;
  role: CompanyRole | "";
  permissions: string[];
  activeBranchId: string | null;
  activeFinanceBranchId: string | null;
  homeBranchId: string | null;
  operationsScope: "own_jobs" | "branch" | "selected" | "company";
  financeScope: "none" | "branch" | "selected" | "company";
  accessibleOperationalBranchIds: string[];
  accessibleFinanceBranchIds: string[];
};

type RequirePermissionOptions = {
  mode?: "any" | "all";
  loginPath?: string;
  unauthorisedPath?: string;
};

type CompanyMembershipRow = {
  company_id: string;
  joined_at: string | null;
};

type CompanyRow = {
  id: string;
  company_name: string;
  slug: string;
};

function uniquePermissions(
  values: Array<string | null | undefined>,
) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asPlatformRole(value: unknown): PlatformRole | null {
  return value === "super_admin" ||
    value === "platform_admin" ||
    value === "support"
    ? value
    : null;
}

function asCompanyRole(value: unknown): CompanyRole | "" {
  return value === "company_admin" ||
    value === "administrator" ||
    value === "service_manager" ||
    value === "office" ||
    value === "parts_manager" ||
    value === "parts_advisor" ||
    value === "sales_manager" ||
    value === "salesperson" ||
    value === "technician" ||
    value === "apprentice" ||
    value === "read_only"
    ? value
    : "";
}

export async function getAuthenticatedUserContext(): Promise<
  AuthenticatedUserContext | null
> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (
      userError &&
      userError.name !== "AuthSessionMissingError"
    ) {
      console.error(
        "Unable to authenticate current user:",
        userError,
      );
    }

    return null;
  }

  const [
    { data: platformRoleRecord, error: platformRoleError },
    { data: membershipRows, error: membershipsError },
  ] = await Promise.all([
    supabase
      .from("platform_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("company_members")
      .select("company_id, joined_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("joined_at", { ascending: true }),
  ]);

  if (platformRoleError) {
    console.error(
      "Unable to load authenticated platform role:",
      platformRoleError,
    );
  }

  if (membershipsError) {
    console.error(
      "Unable to load authenticated user company memberships:",
      membershipsError,
    );

    return null;
  }

  const platformRole = asPlatformRole(
    platformRoleRecord?.role,
  );

  const memberships =
    (membershipRows as CompanyMembershipRow[] | null) ?? [];

  if (memberships.length === 0) {
    console.error(
      `Authenticated user ${user.id} has no active AgriCore company membership.`,
    );

    return null;
  }

  const companyIds = memberships.map(
    (membership) => membership.company_id,
  );

  const {
    data: companyRows,
    error: companiesError,
  } = await supabase
    .from("companies")
    .select("id, company_name, slug")
    .in("id", companyIds)
    .eq("is_active", true);

  if (companiesError) {
    console.error(
      "Unable to load authenticated user companies:",
      companiesError,
    );

    return null;
  }

  const companies =
    (companyRows as CompanyRow[] | null) ?? [];

  if (companies.length === 0) {
    console.error(
      `Authenticated user ${user.id} has no active AgriCore company.`,
    );

    return null;
  }

  const companyById = new Map(
    companies.map((company) => [company.id, company]),
  );

  const availableCompanyIds = new Set(
    companies.map((company) => company.id),
  );

  const cookieStore = await cookies();
  const requestedCompanyId = cleanText(
    cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value,
  );

  const companyId =
    requestedCompanyId &&
    availableCompanyIds.has(requestedCompanyId)
      ? requestedCompanyId
      : memberships.find((membership) =>
          availableCompanyIds.has(membership.company_id),
        )?.company_id;

  if (!companyId) {
    return null;
  }

  const company = companyById.get(companyId);

  if (!company) {
    return null;
  }

  const [
    { data: profile, error: profileError },
    { data: roleRecord, error: roleError },
  ] = await Promise.all([
    supabase
      .from("company_member_profiles")
      .select("full_name, is_active")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("company_member_roles")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError) {
    console.error(
      "Unable to load authenticated company member profile:",
      profileError,
    );
  }

  if (roleError) {
    console.error(
      "Unable to load authenticated company member role:",
      roleError,
    );
  }

  if (profile?.is_active === false) {
    console.error(
      `Authenticated user ${user.id} is inactive for company ${companyId}.`,
    );

    return null;
  }

  const role = asCompanyRole(roleRecord?.role);
  let permissions: string[] = [];

  if (role) {
    const {
      data: permissionRows,
      error: permissionsError,
    } = await supabase
      .from("company_role_permissions")
      .select("permission_key")
      .eq("company_id", companyId)
      .eq("role", role)
      .eq("allowed", true);

    if (permissionsError) {
      console.error(
        "Unable to load authenticated company permissions:",
        permissionsError,
      );
    } else {
      permissions = uniquePermissions(
        permissionRows?.map(
          (row) => row.permission_key,
        ) ?? [],
      );
    }
  }

  const metadataName = cleanText(
    user.user_metadata?.full_name,
  );

  const requestedBranchId = cleanText(
    cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value,
  );
  const requestedFinanceBranchId = cleanText(
    cookieStore.get(ACTIVE_FINANCE_BRANCH_COOKIE)?.value,
  );

  const branchContext = await loadBranchAccessContext(
    supabase,
    companyId,
    user.id,
    role,
    requestedBranchId,
    requestedFinanceBranchId,
  );

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName:
      cleanText(profile?.full_name) ||
      metadataName ||
      user.email?.split("@")[0] ||
      "AgriCore User",
    platformRole,
    companyId,
    companyName: cleanText(company.company_name),
    companySlug: cleanText(company.slug),
    role,
    permissions,
    activeBranchId: branchContext.activeBranchId,
    activeFinanceBranchId: branchContext.activeFinanceBranchId,
    homeBranchId: branchContext.homeBranchId,
    operationsScope: branchContext.operationsScope,
    financeScope: branchContext.financeScope,
    accessibleOperationalBranchIds: branchContext.accessibleOperationalBranchIds,
    accessibleFinanceBranchIds: branchContext.accessibleFinanceBranchIds,
  };
}

export async function requireAuthenticatedUser(
  options: Pick<
    RequirePermissionOptions,
    "loginPath"
  > = {},
): Promise<AuthenticatedUserContext> {
  const userContext =
    await getAuthenticatedUserContext();

  if (!userContext) {
    redirect(options.loginPath ?? "/login");
  }

  return userContext;
}

export async function requirePermission(
  requiredPermissions: string[],
  options: RequirePermissionOptions = {},
): Promise<AuthenticatedUserContext> {
  const userContext =
    await requireAuthenticatedUser({
      loginPath: options.loginPath,
    });

  const required = uniquePermissions(
    requiredPermissions,
  );

  const hasAdministrativeAccess =
  userContext.platformRole === "super_admin" ||
  userContext.platformRole === "platform_admin" ||
  userContext.role === "company_admin" ||
  userContext.role === "administrator";

if (hasAdministrativeAccess) {
  return userContext;
}

  if (required.length === 0) {
    return userContext;
  }

  const userPermissionSet = new Set(
    userContext.permissions,
  );

  const hasPermission =
    options.mode === "all"
      ? required.every((permission) =>
          userPermissionSet.has(permission),
        )
      : required.some((permission) =>
          userPermissionSet.has(permission),
        );

  if (!hasPermission) {
    redirect(
      options.unauthorisedPath ??
        "/unauthorised",
    );
  }

  return userContext;
}

export async function requirePlatformRole(
  allowedRoles: PlatformRole[] = ["super_admin"],
  options: Pick<
    RequirePermissionOptions,
    "loginPath" | "unauthorisedPath"
  > = {},
): Promise<AuthenticatedUserContext> {
  const userContext =
    await requireAuthenticatedUser({
      loginPath: options.loginPath,
    });

  if (
    !userContext.platformRole ||
    !allowedRoles.includes(userContext.platformRole)
  ) {
    redirect(
      options.unauthorisedPath ??
        "/unauthorised",
    );
  }

  return userContext;
}