import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  getAuthenticatedUserContext,
} from "@/lib/auth/require-permission";
import {
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { loadEffectiveFeatures } from "@/lib/platform/effective-features";

const ACTIVE_COMPANY_COOKIE =
  "agricore_company_id";

type CompanyMembershipRow = {
  company_id: string;
  joined_at: string | null;
};

type CompanyRow = {
  id: string;
  company_name: string;
  slug: string;
};

type SwitchCompanyRequest = {
  companyId?: unknown;
};

function cleanText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

async function loadAvailableCompanies(
  userId: string,
) {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: membershipRows,
    error: membershipsError,
  } = await supabase
    .from("company_members")
    .select("company_id, joined_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("joined_at", {
      ascending: true,
    });

  if (membershipsError) {
    throw new Error(
      `Unable to load company memberships: ${membershipsError.message}`,
    );
  }

  const memberships =
    (membershipRows as
      | CompanyMembershipRow[]
      | null) ?? [];

  if (memberships.length === 0) {
    return [];
  }

  const companyIds = memberships.map(
    (membership) =>
      membership.company_id,
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
    throw new Error(
      `Unable to load companies: ${companiesError.message}`,
    );
  }

  const companies =
    (companyRows as CompanyRow[] | null) ??
    [];

  const companyById = new Map(
    companies.map((company) => [
      company.id,
      company,
    ]),
  );

  return memberships.flatMap(
    (membership) => {
      const company = companyById.get(
        membership.company_id,
      );

      if (!company) {
        return [];
      }

      return [
        {
          id: company.id,
          name: cleanText(
            company.company_name,
          ),
          slug: cleanText(company.slug),
        },
      ];
    },
  );
}

export async function GET() {
  try {
    const context =
      await getAuthenticatedUserContext();

    if (!context) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 },
      );
    }

    const companies =
      await loadAvailableCompanies(
        context.userId,
      );

    const featureState = await loadEffectiveFeatures(
      createSupabaseAdmin(),
      context.companyId,
    );

    return NextResponse.json(
      {
        user: {
          id: context.userId,
          email: context.email,
          fullName: context.fullName,
          role: context.role || null,
          platformRole:
            context.platformRole,
          permissions:
            context.permissions,
        },
        activeCompany: {
          id: context.companyId,
          name: context.companyName,
          slug: context.companySlug,
        },
        enabledFeatures: featureState.enabledFeatures,
        billingMode: featureState.billingMode,
        companies,
        requiresCompanySelection:
          companies.length > 1,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Unable to load AgriCore company context:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load company context.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const context =
      await getAuthenticatedUserContext();

    if (!context) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 },
      );
    }

    let body: SwitchCompanyRequest;

    try {
      body =
        (await request.json()) as
          SwitchCompanyRequest;
    } catch {
      return NextResponse.json(
        {
          error:
            "A valid JSON request body is required.",
        },
        { status: 400 },
      );
    }

    const requestedCompanyId =
      cleanText(body.companyId);

    if (!requestedCompanyId) {
      return NextResponse.json(
        {
          error:
            "companyId is required.",
        },
        { status: 400 },
      );
    }

    const companies =
      await loadAvailableCompanies(
        context.userId,
      );

    const selectedCompany =
      companies.find(
        (company) =>
          company.id ===
          requestedCompanyId,
      );

    if (!selectedCompany) {
      return NextResponse.json(
        {
          error:
            "You do not have an active membership for that company.",
        },
        { status: 403 },
      );
    }

    const cookieStore =
      await cookies();

    cookieStore.set(
      ACTIVE_COMPANY_COOKIE,
      selectedCompany.id,
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
        maxAge:
          60 * 60 * 24 * 365,
      },
    );

    return NextResponse.json(
      {
        activeCompany:
          selectedCompany,
        companies,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Unable to switch AgriCore company:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to switch company.",
      },
      { status: 500 },
    );
  }
}