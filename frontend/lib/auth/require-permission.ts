import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export type AuthenticatedUserContext = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
};

type RequirePermissionOptions = {
  mode?: "any" | "all";
  loginPath?: string;
  unauthorisedPath?: string;
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
    { data: profile, error: profileError },
    { data: roleRecord, error: roleError },
  ] = await Promise.all([
    supabase
      .from("app_user_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("app_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError) {
    console.error(
      "Unable to load authenticated user profile:",
      profileError,
    );
  }

  if (roleError) {
    console.error(
      "Unable to load authenticated user role:",
      roleError,
    );
  }

  const role =
    typeof roleRecord?.role === "string"
      ? roleRecord.role.trim()
      : "";

  let permissions: string[] = [];

  if (role) {
    const {
      data: permissionRows,
      error: permissionsError,
    } = await supabase
      .from("app_role_permissions")
      .select("permission_key")
      .eq("role", role)
      .eq("allowed", true);

    if (permissionsError) {
      console.error(
        "Unable to load authenticated user permissions:",
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

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName:
      profile?.full_name?.trim() ||
      metadataName ||
      user.email?.split("@")[0] ||
      "AgriCore User",
    role,
    permissions,
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