import { NextRequest, NextResponse } from "next/server";

import {
  getAuthenticatedUserContext,
} from "@/lib/auth/require-permission";
import {
  createSupabaseServerClient,
} from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
]);

type AuthenticatedContext = NonNullable<
  Awaited<ReturnType<typeof getAuthenticatedUserContext>>
>;

type LogoAuthResult =
  | {
      context: AuthenticatedContext;
      response: null;
    }
  | {
      context: null;
      response: NextResponse;
    };

function hasSettingsAccess(
  permissions: string[],
): boolean {
  return permissions.includes(
    "settings.manage",
  );
}

async function getAuth(): Promise<LogoAuthResult> {
  const context =
    await getAuthenticatedUserContext();

  if (!context) {
    return {
      context: null,
      response: NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      ),
    };
  }

  if (!hasSettingsAccess(context.permissions)) {
    return {
      context: null,
      response: NextResponse.json(
        {
          error:
            "You do not have permission to manage company branding.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    context,
    response: null,
  };
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const auth = await getAuth();

  if (!auth.context) {
    return auth.response;
  }

  const formData = await request.formData();
  const file = formData.get("logo");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No logo supplied." },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use a PNG or JPEG logo." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Logo must be 3 MB or smaller." },
      { status: 400 },
    );
  }

  const supabase =
    await createSupabaseServerClient();

  const { data: current, error: currentError } =
    await supabase
      .from("company_settings")
      .select("logo_path")
      .eq("company_id", auth.context.companyId)
      .maybeSingle();

  if (currentError) {
    return NextResponse.json(
      { error: currentError.message },
      { status: 500 },
    );
  }

  if (!current) {
    return NextResponse.json(
      {
        error:
          "Company settings have not been created for the active company.",
      },
      { status: 404 },
    );
  }

  const extension =
    file.type === "image/png" ? "png" : "jpg";

  const path =
    `${auth.context.companyId}/logo-${Date.now()}.${extension}`;

  const bytes = new Uint8Array(
    await file.arrayBuffer(),
  );

  const { error: uploadError } =
    await supabase.storage
      .from("company-branding")
      .upload(path, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 },
    );
  }

  const { error: updateError } =
    await supabase
      .from("company_settings")
      .update({
        logo_path: path,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", auth.context.companyId);

  if (updateError) {
    await supabase.storage
      .from("company-branding")
      .remove([path]);

    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  if (current.logo_path) {
    const { error: removeOldError } =
      await supabase.storage
        .from("company-branding")
        .remove([current.logo_path]);

    if (removeOldError) {
      console.error(
        "Unable to remove old company logo:",
        removeOldError,
      );
    }
  }

  const { data: signed, error: signedUrlError } =
    await supabase.storage
      .from("company-branding")
      .createSignedUrl(path, 60 * 60);

  if (signedUrlError) {
    console.error(
      "Unable to create signed logo URL:",
      signedUrlError,
    );
  }

  return NextResponse.json(
    {
      logoPath: path,
      logoUrl: signed?.signedUrl ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function DELETE(): Promise<NextResponse> {
  const auth = await getAuth();

  if (!auth.context) {
    return auth.response;
  }

  const supabase =
    await createSupabaseServerClient();

  const { data: current, error: readError } =
    await supabase
      .from("company_settings")
      .select("logo_path")
      .eq("company_id", auth.context.companyId)
      .maybeSingle();

  if (readError) {
    return NextResponse.json(
      { error: readError.message },
      { status: 500 },
    );
  }

  if (!current) {
    return NextResponse.json(
      {
        error:
          "Company settings have not been created for the active company.",
      },
      { status: 404 },
    );
  }

  if (current.logo_path) {
    const { error: removeError } =
      await supabase.storage
        .from("company-branding")
        .remove([current.logo_path]);

    if (removeError) {
      return NextResponse.json(
        { error: removeError.message },
        { status: 500 },
      );
    }
  }

  const { error: updateError } =
    await supabase
      .from("company_settings")
      .update({
        logo_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", auth.context.companyId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}