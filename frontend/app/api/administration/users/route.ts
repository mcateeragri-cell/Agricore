import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { sendCompanyEmail } from "@/lib/communications/email";
import { loadBillingStatus } from "@/lib/platform/billing";

import {
  getAuthenticatedUserContext,
} from "@/lib/auth/require-permission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CompanyRole =
  | "company_admin"
  | "administrator"
  | "service_manager"
  | "office"
  | "parts_manager"
  | "technician"
  | "apprentice"
  | "read_only";

type CreateUserBody = {
  company_id?: unknown;
  email?: unknown;
  temporary_password?: unknown;
  full_name?: unknown;
  phone?: unknown;
  job_title?: unknown;
  role?: unknown;
  is_active?: unknown;
  calendar_colour?: unknown;
  hourly_cost?: unknown;
  charge_out_rate?: unknown;
  contracted_hours_per_week?: unknown;
  holiday_entitlement_days?: unknown;
  notes?: unknown;
};

const VALID_ROLES = new Set<CompanyRole>([
  "company_admin",
  "administrator",
  "service_manager",
  "office",
  "parts_manager",
  "technician",
  "apprentice",
  "read_only",
]);

function createAdminClient(): SupabaseClient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.",
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

function cleanText(
  value: unknown,
  maximumLength = 500,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value
    .trim()
    .slice(0, maximumLength);

  return trimmed || null;
}

function cleanEmail(
  value: unknown,
): string | null {
  return (
    cleanText(value, 320)?.toLowerCase() ??
    null
  );
}

function cleanNumeric(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    throw new Error(
      "Numeric values must be valid non-negative numbers.",
    );
  }

  return parsed;
}

function asRole(
  value: unknown,
): CompanyRole | null {
  return (
    typeof value === "string" &&
    VALID_ROLES.has(
      value as CompanyRole,
    )
  )
    ? (value as CompanyRole)
    : null;
}

function canCreateRole(
  permissions: string[],
  actingRole: CompanyRole | null,
  requestedRole: CompanyRole,
) {
  const canManageAll =
    actingRole === "company_admin" ||
    actingRole === "administrator" ||
    permissions.includes(
      "users.manage_all",
    );

  if (canManageAll) {
    return true;
  }

  return (
    permissions.includes(
      "users.manage_technicians",
    ) &&
    (
      requestedRole === "technician" ||
      requestedRole === "apprentice"
    )
  );
}

async function findUserByEmail(
  adminClient: SupabaseClient,
  email: string,
): Promise<User | null> {
  for (
    let page = 1;
    page <= 20;
    page += 1
  ) {
    const { data, error } =
      await adminClient.auth.admin.listUsers({
        page,
        perPage: 100,
      });

    if (error) {
      throw new Error(
        `Unable to search authentication users: ${error.message}`,
      );
    }

    const match = (
      data.users ?? []
    ).find(
      (user) =>
        user.email?.toLowerCase() ===
        email,
    );

    if (match) {
      return match;
    }

    if (
      (data.users ?? []).length < 100
    ) {
      break;
    }
  }

  return null;
}

async function loadTargetCompanyAccess(
  adminClient: SupabaseClient,
  actingUserId: string,
  companyId: string,
) {
  const [
    companyResult,
    membershipResult,
    profileResult,
    roleResult,
  ] = await Promise.all([
    adminClient
      .from("companies")
      .select(
        "id, company_name, is_active",
      )
      .eq("id", companyId)
      .eq("is_active", true)
      .maybeSingle(),

    adminClient
      .from("company_members")
      .select("is_active")
      .eq("company_id", companyId)
      .eq("user_id", actingUserId)
      .maybeSingle(),

    adminClient
      .from(
        "company_member_profiles",
      )
      .select("is_active")
      .eq("company_id", companyId)
      .eq("user_id", actingUserId)
      .maybeSingle(),

    adminClient
      .from("company_member_roles")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", actingUserId)
      .maybeSingle(),
  ]);

  const firstError =
    companyResult.error ||
    membershipResult.error ||
    profileResult.error ||
    roleResult.error;

  if (firstError) {
    throw new Error(
      `Unable to verify company access: ${firstError.message}`,
    );
  }

  if (!companyResult.data) {
    return null;
  }

  if (
    membershipResult.data
      ?.is_active !== true ||
    profileResult.data
      ?.is_active === false
  ) {
    return null;
  }

  const actingRole = asRole(
    roleResult.data?.role,
  );

  if (!actingRole) {
    return null;
  }

  const {
    data: permissionRows,
    error: permissionsError,
  } = await adminClient
    .from(
      "company_role_permissions",
    )
    .select(
      "permission_key, allowed",
    )
    .eq("company_id", companyId)
    .eq("role", actingRole)
    .eq("allowed", true);

  if (permissionsError) {
    throw new Error(
      `Unable to load company permissions: ${permissionsError.message}`,
    );
  }

  return {
    companyId:
      companyResult.data.id,
    companyName:
      companyResult.data.company_name,
    actingRole,
    permissions: Array.from(
      new Set(
        (permissionRows ?? [])
          .map(
            (row) =>
              row.permission_key,
          )
          .filter(Boolean),
      ),
    ),
  };
}

export async function POST(
  request: NextRequest,
) {
  const auth =
    await getAuthenticatedUserContext();

  if (!auth) {
    return NextResponse.json(
      {
        error:
          "Authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  let body: CreateUserBody;

  try {
    body =
      (await request.json()) as
        CreateUserBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "A valid JSON request body is required.",
      },
      {
        status: 400,
      },
    );
  }

  const requestedCompanyId =
    cleanText(body.company_id, 100) ??
    auth.companyId;

  const email =
    cleanEmail(body.email);

  const fullName =
    cleanText(body.full_name, 200);

  const temporaryPassword =
    cleanText(
      body.temporary_password,
      200,
    );

  const requestedRole =
    asRole(body.role);

  if (!requestedCompanyId) {
    return NextResponse.json(
      {
        error:
          "Select the company this staff member should belong to.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !email ||
    !email.includes("@")
  ) {
    return NextResponse.json(
      {
        error:
          "Enter a valid email address.",
      },
      {
        status: 400,
      },
    );
  }

  if (!fullName) {
    return NextResponse.json(
      {
        error:
          "Full name is required.",
      },
      {
        status: 400,
      },
    );
  }

  if (!requestedRole) {
    return NextResponse.json(
      {
        error:
          "A valid company role is required.",
      },
      {
        status: 400,
      },
    );
  }

  let hourlyCost: number | null;
  let chargeOutRate: number | null;
  let contractedHours: number | null;
  let holidayEntitlement: number | null;

  try {
    hourlyCost =
      cleanNumeric(body.hourly_cost);

    chargeOutRate =
      cleanNumeric(
        body.charge_out_rate,
      );

    contractedHours =
      cleanNumeric(
        body.contracted_hours_per_week,
      );

    holidayEntitlement =
      cleanNumeric(
        body.holiday_entitlement_days,
      );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "A numeric value is invalid.",
      },
      {
        status: 400,
      },
    );
  }

  const adminClient =
    createAdminClient();

  let createdAuthUserId:
    | string
    | null = null;

  let targetUser: User | null =
    null;

  try {
    const targetAccess =
      await loadTargetCompanyAccess(
        adminClient,
        auth.userId,
        requestedCompanyId,
      );

    if (!targetAccess) {
      return NextResponse.json(
        {
          error:
            "You do not have an active membership in the selected company.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      !canCreateRole(
        targetAccess.permissions,
        targetAccess.actingRole,
        requestedRole,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to create that role in the selected company.",
        },
        {
          status: 403,
        },
      );
    }

    const billing = await loadBillingStatus(requestedCompanyId);
    if (billing.billingMode === "subscription" && billing.plan.maxUsers > 0 && billing.plan.maxUsers < 9000 && billing.usage.users >= billing.plan.maxUsers) {
      return NextResponse.json(
        { error: `${billing.plan.name} supports up to ${billing.plan.maxUsers} users. Upgrade your AgriCore subscription to add another team member.`, upgradeRequired: true },
        { status: 409 },
      );
    }

    targetUser =
      await findUserByEmail(
        adminClient,
        email,
      );

    if (!targetUser) {
      if (
        !temporaryPassword ||
        temporaryPassword.length < 8
      ) {
        return NextResponse.json(
          {
            error:
              "A temporary password of at least 8 characters is required for a new account.",
          },
          {
            status: 400,
          },
        );
      }

      const { data, error } =
        await adminClient
          .auth.admin.createUser({
            email,
            password:
              temporaryPassword,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
            },
          });

      if (
        error ||
        !data.user
      ) {
        throw new Error(
          error?.message ||
            "Unable to create the user account.",
        );
      }

      targetUser = data.user;
      createdAuthUserId =
        data.user.id;
    }

    if (targetUser) {
      const existingMetadata =
        targetUser.user_metadata ?? {};

      const { error: metadataError } =
        await adminClient.auth.admin.updateUserById(
          targetUser.id,
          {
            user_metadata: {
              ...existingMetadata,
              full_name: fullName,
            },
          },
        );

      if (metadataError) {
        throw new Error(
          `Unable to update the user profile: ${metadataError.message}`,
        );
      }
    }

    const {
      data: existingMembership,
      error:
        membershipLookupError,
    } = await adminClient
      .from("company_members")
      .select(
        "company_id, user_id",
      )
      .eq(
        "company_id",
        requestedCompanyId,
      )
      .eq(
        "user_id",
        targetUser.id,
      )
      .maybeSingle();

    if (membershipLookupError) {
      throw membershipLookupError;
    }

    if (existingMembership) {
      return NextResponse.json(
        {
          error:
            "This user already belongs to the selected company.",
        },
        {
          status: 409,
        },
      );
    }

    const now =
      new Date().toISOString();

    const {
      error: membershipError,
    } = await adminClient
      .from("company_members")
      .insert({
        company_id:
          requestedCompanyId,
        user_id:
          targetUser.id,
        is_active:
          body.is_active !== false,
        joined_at: now,
        updated_at: now,
      });

    if (membershipError) {
      throw new Error(
        `Unable to create company membership: ${membershipError.message}`,
      );
    }

    const [
      profileResult,
      roleResult,
    ] = await Promise.all([
      adminClient
        .from(
          "company_member_profiles",
        )
        .upsert(
          {
            company_id:
              requestedCompanyId,
            user_id:
              targetUser.id,
            full_name:
              fullName,
            phone:
              cleanText(
                body.phone,
                50,
              ),
            job_title:
              cleanText(
                body.job_title,
                100,
              ),
            is_active:
              body.is_active !==
              false,
            calendar_colour:
              cleanText(
                body.calendar_colour,
                20,
              ) ?? "#103D2E",
            hourly_cost:
              hourlyCost,
            charge_out_rate:
              chargeOutRate,
            contracted_hours_per_week:
              contractedHours,
            holiday_entitlement_days:
              holidayEntitlement,
            notes:
              cleanText(
                body.notes,
                2000,
              ),
            updated_at: now,
          },
          {
            onConflict:
              "company_id,user_id",
          },
        ),

      adminClient
        .from(
          "company_member_roles",
        )
        .upsert(
          {
            company_id:
              requestedCompanyId,
            user_id:
              targetUser.id,
            role: requestedRole,
            updated_at: now,
          },
          {
            onConflict:
              "company_id,user_id",
          },
        ),
    ]);

    if (profileResult.error) {
      throw new Error(
        `Unable to create the company profile: ${profileResult.error.message}`,
      );
    }

    if (roleResult.error) {
      throw new Error(
        `Unable to assign the company role: ${roleResult.error.message}`,
      );
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://app.getagricore.com";
      await sendCompanyEmail({
        companyId: requestedCompanyId,
        to: email,
        recipientName: fullName,
        templateKey: "staff_invitation",
        variables: {
          first_name: fullName.split(/\s+/)[0] || "there",
          company_name: targetAccess.companyName,
          role_name: requestedRole.replace(/_/g, " "),
          action_url: `${appUrl}/login`,
        },
        createdBy: auth.userId,
        idempotencyKey: `staff-invite:${requestedCompanyId}:${targetUser.id}:${now}`,
      });
    } catch (emailError) {
      console.error("Unable to send staff invitation email:", emailError);
    }

    return NextResponse.json(
      {
        user_id:
          targetUser.id,
        company_id:
          requestedCompanyId,
        company_name:
          targetAccess.companyName,
        existing_auth_user:
          createdAuthUserId === null,
        message:
          createdAuthUserId === null
            ? `Existing AgriCore user added to ${targetAccess.companyName}.`
            : `Staff account created for ${targetAccess.companyName}.`,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Create company user failed:",
      error,
    );

    if (targetUser) {
      await Promise.all([
        adminClient
          .from(
            "company_member_roles",
          )
          .delete()
          .eq(
            "company_id",
            requestedCompanyId,
          )
          .eq(
            "user_id",
            targetUser.id,
          ),

        adminClient
          .from(
            "company_member_profiles",
          )
          .delete()
          .eq(
            "company_id",
            requestedCompanyId,
          )
          .eq(
            "user_id",
            targetUser.id,
          ),

        adminClient
          .from(
            "company_members",
          )
          .delete()
          .eq(
            "company_id",
            requestedCompanyId,
          )
          .eq(
            "user_id",
            targetUser.id,
          ),
      ]);
    }

    if (createdAuthUserId) {
      await adminClient
        .auth.admin.deleteUser(
          createdAuthUserId,
        );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the staff account.",
      },
      {
        status: 500,
      },
    );
  }
}
