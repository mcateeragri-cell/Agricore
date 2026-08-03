import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminClient = SupabaseClient;

type CreateCompanyBody = {
  companyName?: unknown;
  slug?: unknown;
  businessType?: unknown;
  email?: unknown;
  phone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  townCity?: unknown;
  countyRegion?: unknown;
  postcode?: unknown;

  administratorName?: unknown;
  administratorEmail?: unknown;
  administratorPassword?: unknown;
};

const PLATFORM_ROLES = new Set([
  "super_admin",
]);

function cleanText(
  value: unknown,
  maximumLength = 250,
) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function cleanEmail(value: unknown) {
  return cleanText(value, 320).toLowerCase();
}

function cleanSlug(value: unknown) {
  return cleanText(value, 100)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getBearerToken(
  request: NextRequest,
) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] =
    authorization.split(" ");

  return scheme?.toLowerCase() === "bearer" &&
    token
    ? token
    : null;
}

function createAdminClient() {
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
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}

async function authenticatePlatformAdmin(
  request: NextRequest,
  adminClient: AdminClient,
) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return {
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
      user: null,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      response: NextResponse.json(
        {
          error:
            "Your session has expired. Please sign in again.",
        },
        { status: 401 },
      ),
      user: null,
    };
  }

  const {
    data: platformRole,
    error: platformRoleError,
  } = await adminClient
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (platformRoleError) {
    return {
      response: NextResponse.json(
        { error: platformRoleError.message },
        { status: 500 },
      ),
      user: null,
    };
  }

  if (
    !platformRole ||
    !PLATFORM_ROLES.has(platformRole.role)
  ) {
    return {
      response: NextResponse.json(
        {
          error:
            "Only an AgriCore super administrator can create companies.",
        },
        { status: 403 },
      ),
      user: null,
    };
  }

  return {
    response: null,
    user,
  };
}

async function findUserByEmail(
  adminClient: AdminClient,
  email: string,
): Promise<User | null> {
  for (
    let page = 1;
    page <= 20;
    page += 1
  ) {
    const {
      data,
      error,
    } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw new Error(
        `Unable to search authentication users: ${error.message}`,
      );
    }

    const users = data.users ?? [];

    const existing = users.find(
      (user) =>
        user.email?.toLowerCase() === email,
    );

    if (existing) {
      return existing;
    }

    if (users.length < 100) {
      break;
    }
  }

  return null;
}

async function copyDefaultPermissions(
  adminClient: AdminClient,
  sourceCompanyId: string | null,
  targetCompanyId: string,
) {
  if (!sourceCompanyId) {
    return;
  }

  const {
    data: permissionRows,
    error: permissionError,
  } = await adminClient
    .from("company_role_permissions")
    .select(
      "role, permission_key, allowed",
    )
    .eq("company_id", sourceCompanyId);

  if (permissionError) {
    throw new Error(
      `Unable to copy default company permissions: ${permissionError.message}`,
    );
  }

  if (!permissionRows?.length) {
    return;
  }

  const {
    error: insertError,
  } = await adminClient
    .from("company_role_permissions")
    .upsert(
      permissionRows.map((row) => ({
        company_id: targetCompanyId,
        role: row.role,
        permission_key:
          row.permission_key,
        allowed: row.allowed,
      })),
      {
        onConflict:
          "company_id,role,permission_key",
      },
    );

  if (insertError) {
    throw new Error(
      `Unable to create default company permissions: ${insertError.message}`,
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  try {
    const adminClient =
      createAdminClient();

    const auth =
      await authenticatePlatformAdmin(
        request,
        adminClient,
      );

    if (auth.response) {
      return auth.response;
    }

    const {
      data: companies,
      error,
    } = await adminClient
      .from("companies")
      .select(`
        id,
        company_name,
        slug,
        business_type,
        email,
        phone,
        town_city,
        county_region,
        postcode,
        is_active,
        created_at,
        updated_at
      `)
      .order("company_name", {
        ascending: true,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        companies: companies ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load companies.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  let createdCompanyId: string | null = null;
  let createdAuthUserId: string | null = null;

  try {
    const adminClient =
      createAdminClient();

    const auth =
      await authenticatePlatformAdmin(
        request,
        adminClient,
      );

    if (auth.response || !auth.user) {
      return auth.response;
    }

    let body: CreateCompanyBody;

    try {
      body =
        (await request.json()) as CreateCompanyBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "A valid JSON request body is required.",
        },
        { status: 400 },
      );
    }

    const companyName =
      cleanText(body.companyName, 200);

    const slug =
      cleanSlug(body.slug || companyName);

    const administratorName =
      cleanText(
        body.administratorName,
        200,
      );

    const administratorEmail =
      cleanEmail(
        body.administratorEmail,
      );

    const administratorPassword =
      cleanText(
        body.administratorPassword,
        200,
      );

    if (
      !companyName ||
      !slug ||
      !administratorName ||
      !administratorEmail
    ) {
      return NextResponse.json(
        {
          error:
            "Company name, slug, administrator name and administrator email are required.",
        },
        { status: 400 },
      );
    }

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        slug,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The company slug may contain lowercase letters, numbers and hyphens only.",
        },
        { status: 400 },
      );
    }

    if (
      !administratorEmail.includes("@")
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid administrator email address.",
        },
        { status: 400 },
      );
    }

    let administratorUser =
      await findUserByEmail(
        adminClient,
        administratorEmail,
      );

    if (
      !administratorUser &&
      administratorPassword.length < 10
    ) {
      return NextResponse.json(
        {
          error:
            "A temporary password of at least 10 characters is required for a new administrator.",
        },
        { status: 400 },
      );
    }

    const {
      data: existingCompany,
      error: existingCompanyError,
    } = await adminClient
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingCompanyError) {
      throw new Error(
        existingCompanyError.message,
      );
    }

    if (existingCompany) {
      return NextResponse.json(
        {
          error:
            "A company already uses this slug.",
        },
        { status: 409 },
      );
    }

    if (!administratorUser) {
      const {
        data: createdUserData,
        error: createUserError,
      } =
        await adminClient.auth.admin.createUser({
          email: administratorEmail,
          password:
            administratorPassword,
          email_confirm: true,
          user_metadata: {
            full_name:
              administratorName,
          },
        });

      if (
        createUserError ||
        !createdUserData.user
      ) {
        throw new Error(
          createUserError?.message ||
            "Unable to create the company administrator.",
        );
      }

      administratorUser =
        createdUserData.user;

      createdAuthUserId =
        createdUserData.user.id;
    }

    const {
      data: company,
      error: companyError,
    } = await adminClient
      .from("companies")
      .insert({
        company_name: companyName,
        slug,
        business_type:
          cleanText(
            body.businessType,
            100,
          ) || null,
        email:
          cleanEmail(body.email) ||
          null,
        phone:
          cleanText(body.phone, 50) ||
          null,
        address_line_1:
          cleanText(
            body.addressLine1,
            200,
          ) || null,
        address_line_2:
          cleanText(
            body.addressLine2,
            200,
          ) || null,
        town_city:
          cleanText(
            body.townCity,
            100,
          ) || null,
        county_region:
          cleanText(
            body.countyRegion,
            100,
          ) || null,
        postcode:
          cleanText(
            body.postcode,
            30,
          ).toUpperCase() || null,
        created_by: auth.user.id,
        is_active: true,
      })
      .select("*")
      .single();

    if (companyError || !company) {
      throw new Error(
        companyError?.message ||
          "Unable to create the company.",
      );
    }

    createdCompanyId = company.id;

    const {
      error: membershipError,
    } = await adminClient
      .from("company_members")
      .upsert(
        {
          company_id: company.id,
          user_id:
            administratorUser.id,
          is_active: true,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "company_id,user_id",
        },
      );

    if (membershipError) {
      throw new Error(
        `Unable to create administrator membership: ${membershipError.message}`,
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
            company_id: company.id,
            user_id:
              administratorUser.id,
            full_name:
              administratorName,
            is_active: true,
            job_title:
              "Company Administrator",
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "company_id,user_id",
          },
        ),

      adminClient
        .from("company_member_roles")
        .upsert(
          {
            company_id: company.id,
            user_id:
              administratorUser.id,
            role: "company_admin",
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "company_id,user_id",
          },
        ),
    ]);

    if (profileResult.error) {
      throw new Error(
        `Unable to create administrator profile: ${profileResult.error.message}`,
      );
    }

    if (roleResult.error) {
      throw new Error(
        `Unable to create administrator role: ${roleResult.error.message}`,
      );
    }

    const {
      data: sourceMembership,
    } = await adminClient
      .from("company_members")
      .select("company_id")
      .eq("user_id", auth.user.id)
      .eq("is_active", true)
      .order("joined_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    await copyDefaultPermissions(
      adminClient,
      sourceMembership?.company_id ??
        null,
      company.id,
    );

    return NextResponse.json(
      {
        company,
        administrator: {
          id: administratorUser.id,
          email:
            administratorUser.email ??
            administratorEmail,
          existingUser:
            createdAuthUserId === null,
        },
        message:
          "Company and first administrator created successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Create platform company error:",
      error,
    );

    /*
     * Best-effort cleanup for a partially completed onboarding.
     * Deleting the company cascades membership/profile/role rows.
     */
    try {
      const adminClient =
        createAdminClient();

      if (createdCompanyId) {
        await adminClient
          .from("companies")
          .delete()
          .eq("id", createdCompanyId);
      }

      if (
        createdAuthUserId &&
        !createdCompanyId
      ) {
        await adminClient.auth.admin.deleteUser(
          createdAuthUserId,
        );
      }
    } catch (cleanupError) {
      console.error(
        "Company onboarding cleanup failed:",
        cleanupError,
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the company.",
      },
      { status: 500 },
    );
  }
}