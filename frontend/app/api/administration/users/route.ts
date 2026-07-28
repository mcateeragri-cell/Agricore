import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type AppRole =
  | "administrator"
  | "service_manager"
  | "office"
  | "parts_manager"
  | "technician"
  | "apprentice"
  | "read_only";

type CreateUserBody = {
  email?: string;
  temporary_password?: string;
  full_name?: string;
  phone?: string;
  job_title?: string;
  role?: AppRole;
  is_active?: boolean;
  calendar_colour?: string;
  hourly_cost?: string | number | null;
  charge_out_rate?: string | number | null;
  contracted_hours_per_week?: string | number | null;
  holiday_entitlement_days?: string | number | null;
  notes?: string;
};

const VALID_ROLES: AppRole[] = [
  "administrator",
  "service_manager",
  "office",
  "parts_manager",
  "technician",
  "apprentice",
  "read_only",
];

function createSupabaseClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured.",
    );
  }

  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured.",
    );
  }

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured.",
    );
  }

  const authClient = createClient(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const adminClient = createClient(
    supabaseUrl,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  return {
    authClient,
    adminClient,
  };
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanNumeric(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      "A numeric field contains an invalid value.",
    );
  }

  if (parsed < 0) {
    throw new Error("Numeric values cannot be negative.");
  }

  return parsed;
}

function getBearerToken(
  request: NextRequest,
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token?.trim()
  ) {
    return null;
  }

  return token.trim();
}

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        {
          error:
            "You must be signed in before creating a staff account.",
        },
        { status: 401 },
      );
    }

    /*
     * Supabase API keys begin with sb_publishable_ or
     * sb_secret_. Neither is a signed-in user's access token.
     */
    if (
      token.startsWith("sb_publishable_") ||
      token.startsWith("sb_secret_")
    ) {
      return NextResponse.json(
        {
          error:
            "The frontend sent a Supabase API key instead of the signed-in user's access token.",
        },
        { status: 401 },
      );
    }

    const { authClient, adminClient } =
      createSupabaseClients();

    const {
      data: { user: actingUser },
      error: actingUserError,
    } = await authClient.auth.getUser(token);

    if (actingUserError || !actingUser) {
      console.error(
        "Unable to verify acting user:",
        actingUserError,
      );

      return NextResponse.json(
        {
          error:
            actingUserError?.message ??
            "Your login session is invalid or has expired. Sign out and sign back in.",
        },
        { status: 401 },
      );
    }

    const {
      data: actingRoleRecord,
      error: actingRoleError,
    } = await adminClient
      .from("app_user_roles")
      .select("role")
      .eq("user_id", actingUser.id)
      .maybeSingle();

    if (actingRoleError) {
      throw actingRoleError;
    }

    if (!actingRoleRecord?.role) {
      return NextResponse.json(
        {
          error:
            "Your account does not have an application role.",
        },
        { status: 403 },
      );
    }

    const {
      data: permissionRecords,
      error: permissionError,
    } = await adminClient
      .from("app_role_permissions")
      .select("permission_key, allowed")
      .eq("role", actingRoleRecord.role)
      .in("permission_key", [
        "users.manage_all",
        "users.manage_technicians",
      ]);

    if (permissionError) {
      throw permissionError;
    }

    const allowedPermissions = new Set(
      (permissionRecords ?? [])
        .filter((permission) => permission.allowed)
        .map((permission) => permission.permission_key),
    );

    const canManageAll = allowedPermissions.has(
      "users.manage_all",
    );

    const canManageTechnicians =
      allowedPermissions.has(
        "users.manage_technicians",
      );

    if (!canManageAll && !canManageTechnicians) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to create users.",
        },
        { status: 403 },
      );
    }

    const body =
      (await request.json()) as CreateUserBody;

    const email =
      cleanText(body.email)?.toLowerCase() ?? null;
    const password = cleanText(
      body.temporary_password,
    );
    const fullName = cleanText(body.full_name);
    const requestedRole = body.role;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 },
      );
    }

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 },
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        {
          error:
            "The temporary password must contain at least 8 characters.",
        },
        { status: 400 },
      );
    }

    if (
      !requestedRole ||
      !VALID_ROLES.includes(requestedRole)
    ) {
      return NextResponse.json(
        {
          error:
            "A valid application role is required.",
        },
        { status: 400 },
      );
    }

    if (
      !canManageAll &&
      !["technician", "apprentice"].includes(
        requestedRole,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You can only create Technician or Apprentice accounts.",
        },
        { status: 403 },
      );
    }

    const hourlyCost = cleanNumeric(body.hourly_cost);
    const chargeOutRate = cleanNumeric(
      body.charge_out_rate,
    );
    const contractedHours = cleanNumeric(
      body.contracted_hours_per_week,
    );
    const holidayEntitlement = cleanNumeric(
      body.holiday_entitlement_days,
    );

    const {
      data: createdUserData,
      error: createAuthError,
    } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createAuthError) {
      return NextResponse.json(
        { error: createAuthError.message },
        { status: 400 },
      );
    }

    if (!createdUserData.user) {
      throw new Error(
        "Supabase did not return the newly created user.",
      );
    }

    createdAuthUserId = createdUserData.user.id;

    const { error: profileError } =
      await adminClient
        .from("app_user_profiles")
        .insert({
          user_id: createdAuthUserId,
          full_name: fullName,
          phone: cleanText(body.phone),
          job_title: cleanText(body.job_title),
          is_active: body.is_active ?? true,
          calendar_colour:
            cleanText(body.calendar_colour) ??
            "#103d2e",
          hourly_cost: hourlyCost,
          charge_out_rate: chargeOutRate,
          contracted_hours_per_week:
            contractedHours,
          holiday_entitlement_days:
            holidayEntitlement,
          notes: cleanText(body.notes),
        });

    if (profileError) {
      throw new Error(
        `Unable to create staff profile: ${profileError.message}`,
      );
    }

    const { error: roleError } = await adminClient
      .from("app_user_roles")
      .insert({
        user_id: createdAuthUserId,
        role: requestedRole,
      });

    if (roleError) {
      throw new Error(
        `Unable to assign staff role: ${roleError.message}`,
      );
    }

    return NextResponse.json(
      {
        user_id: createdAuthUserId,
        message:
          "Staff account created successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Create staff user failed:",
      error,
    );

    try {
      if (createdAuthUserId) {
        const { adminClient } =
          createSupabaseClients();

        await adminClient
          .from("app_user_roles")
          .delete()
          .eq("user_id", createdAuthUserId);

        await adminClient
          .from("app_user_profiles")
          .delete()
          .eq("user_id", createdAuthUserId);

        await adminClient.auth.admin.deleteUser(
          createdAuthUserId,
        );
      }
    } catch (rollbackError) {
      console.error(
        "Unable to roll back failed user creation:",
        rollbackError,
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create staff account.";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}