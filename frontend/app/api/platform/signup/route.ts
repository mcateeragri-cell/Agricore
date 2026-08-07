import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignupBody = {
  companyName?: unknown;
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  termsAccepted?: unknown;
  website?: unknown;
};

const ALL_PERMISSIONS = [
  "users.view",
  "users.manage_all",
  "users.manage_technicians",
  "roles.manage",
  "settings.manage",
  "service_templates.view",
  "service_templates.manage",
  "service_templates.approve",
  "service_programmes.view",
  "service_programmes.manage",
  "ai_diagnostics.use",
  "customers.edit",
  "machines.edit",
  "jobs.view_all",
  "jobs.assign",
  "jobs.edit",
  "jobs.review",
  "calendar.manage",
  "invoices.view",
  "invoices.manage",
] as const;

function cleanText(value: unknown, max = 250) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function cleanEmail(value: unknown) {
  return cleanText(value, 320).toLowerCase();
}

function makeSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "company"
  );
}

function createClients() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const anonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      "AgriCore signup is not fully configured.",
    );
  }

  return {
    publicClient: createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),

    adminClient: createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
  };
}

type AdminClient =
  ReturnType<typeof createClients>["adminClient"];

async function uniqueSlug(
  adminClient: AdminClient,
  base: string,
): Promise<string> {
  const safeBase = base || "company";

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const slug =
      attempt === 0
        ? safeBase
        : `${safeBase}-${attempt + 1}`;

    const {
      data: existingCompany,
      error: lookupError,
    } = await adminClient
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (!existingCompany) {
      return slug;
    }
  }

  return `${safeBase}-${crypto
    .randomUUID()
    .slice(0, 8)}`;
}

export async function POST(
  request: NextRequest,
) {
  let createdUserId: string | null = null;
  let createdCompanyId: string | null = null;

  try {
    const body =
      (await request.json()) as SignupBody;

    const companyName = cleanText(
      body.companyName,
      200,
    );

    const fullName = cleanText(
      body.fullName,
      200,
    );

    const email = cleanEmail(body.email);

    const password = cleanText(
      body.password,
      200,
    );

    const honeypot = cleanText(
      body.website,
      200,
    );

    if (honeypot) {
      return NextResponse.json(
        {
          success: true,
        },
        {
          status: 201,
        },
      );
    }

    if (
      !companyName ||
      !fullName ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Company name, your name, email and password are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !email.includes("@") ||
      password.length < 10
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid email and a password of at least 10 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (body.termsAccepted !== true) {
      return NextResponse.json(
        {
          error:
            "You must accept the terms and privacy policy.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      publicClient,
      adminClient,
    } = createClients();

    const signupRedirectUrl = new URL(
      "/login",
      request.url,
    );

    signupRedirectUrl.searchParams.set(
      "verified",
      "1",
    );

    signupRedirectUrl.searchParams.set(
      "redirectTo",
      "/settings/billing?setup=1",
    );

    const {
      data: signupData,
      error: signupError,
    } = await publicClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          signupRedirectUrl.toString(),

        data: {
          full_name: fullName,
          agricore_signup: true,
        },
      },
    });

    if (signupError || !signupData.user) {
      const message =
        signupError?.message ||
        "Unable to create your account.";

      return NextResponse.json(
        {
          error: message,
        },
        {
          status: 409,
        },
      );
    }

    if (
      signupData.user.identities?.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "An account already exists for that email address.",
        },
        {
          status: 409,
        },
      );
    }

    createdUserId = signupData.user.id;

    const slug = await uniqueSlug(
      adminClient,
      makeSlug(companyName),
    );

    const {
      data: company,
      error: companyError,
    } = await adminClient
      .from("companies")
      .insert({
        company_name: companyName,
        slug,
        email,
        business_type:
          "Agricultural engineering",
        created_by: createdUserId,
        is_active: true,
      })
      .select("id, company_name, slug")
      .single();

    if (companyError || !company) {
      throw new Error(
        companyError?.message ||
          "Unable to create your company.",
      );
    }

    createdCompanyId = company.id;

    const now = new Date().toISOString();

    const coreResults = await Promise.all([
      adminClient
        .from("company_members")
        .insert({
          company_id: company.id,
          user_id: createdUserId,
          is_active: true,
          updated_at: now,
        }),

      adminClient
        .from("company_member_profiles")
        .insert({
          company_id: company.id,
          user_id: createdUserId,
          full_name: fullName,
          job_title:
            "Company Administrator",
          is_active: true,
          updated_at: now,
        }),

      adminClient
        .from("company_member_roles")
        .insert({
          company_id: company.id,
          user_id: createdUserId,
          role: "company_admin",
          updated_at: now,
        }),

      adminClient
        .from("company_settings")
        .insert({
          company_id: company.id,
          company_name: companyName,
          contact_line:
            "Agricultural Engineering & Field Service",
          email,
          primary_colour: "#103D2E",
          secondary_colour: "#E8EFEA",
          payment_terms_days: 7,
          updated_at: now,
        }),

      adminClient
        .from("company_payment_settings")
        .insert({
          company_id: company.id,
        }),

      adminClient
        .from(
          "company_field_operations_settings",
        )
        .insert({
          company_id: company.id,
        }),

      adminClient
        .from("company_onboarding")
        .insert({
          company_id: company.id,
          current_step: 1,
        }),
    ]);

    const failedCoreResult =
      coreResults.find(
        (result) => result.error,
      );

    if (failedCoreResult?.error) {
      throw new Error(
        failedCoreResult.error.message,
      );
    }

    const {
      data: plan,
      error: planError,
    } = await adminClient
      .from("subscription_plans")
      .select("id, trial_days")
      .eq("slug", "professional")
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      throw new Error(
        planError?.message ||
          "Professional trial plan is unavailable.",
      );
    }

    const trialDays =
      Number(plan.trial_days) || 14;

    const trialEndsAt = new Date(
      Date.now() +
        trialDays * 86_400_000,
    ).toISOString();

    const {
      error: subscriptionError,
    } = await adminClient
      .from("company_subscriptions")
      .insert({
        company_id: company.id,
        plan_id: plan.id,
        status: "trial",
        trial_started_at: now,
        trial_ends_at: trialEndsAt,
      });

    if (subscriptionError) {
      throw new Error(
        subscriptionError.message,
      );
    }

    const {
      data: defaultFeatures,
      error: featureError,
    } = await adminClient
      .from("platform_features")
      .select("feature_key")
      .eq("default_enabled", true);

    if (featureError) {
      throw new Error(featureError.message);
    }

    if (defaultFeatures?.length) {
      const featureRows =
        defaultFeatures.map((feature) => ({
          company_id: company.id,
          feature_key: feature.feature_key,
          enabled: true,
        }));

      const {
        error: companyFeaturesError,
      } = await adminClient
        .from("company_features")
        .upsert(featureRows, {
          onConflict:
            "company_id,feature_key",
        });

      if (companyFeaturesError) {
        throw new Error(
          companyFeaturesError.message,
        );
      }
    }

    const {
      error: permissionsError,
    } = await adminClient
      .from("company_role_permissions")
      .upsert(
        ALL_PERMISSIONS.map(
          (permission) => ({
            company_id: company.id,
            role: "company_admin",
            permission_key: permission,
            allowed: true,
          }),
        ),
        {
          onConflict:
            "company_id,role,permission_key",
        },
      );

    if (permissionsError) {
      throw new Error(
        permissionsError.message,
      );
    }

    return NextResponse.json(
      {
        success: true,

        company: {
          id: company.id,
          name: company.company_name,
          slug: company.slug,
        },

        confirmationRequired:
          signupData.session === null,

        trialEndsAt,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Public AgriCore signup failed:",
      error,
    );

    try {
      const { adminClient } =
        createClients();

      if (createdCompanyId) {
        await adminClient
          .from("companies")
          .delete()
          .eq("id", createdCompanyId);
      }

      if (createdUserId) {
        await adminClient.auth.admin.deleteUser(
          createdUserId,
        );
      }
    } catch (cleanupError) {
      console.error(
        "Signup cleanup failed:",
        cleanupError,
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create your AgriCore account.",
      },
      {
        status: 500,
      },
    );
  }
}