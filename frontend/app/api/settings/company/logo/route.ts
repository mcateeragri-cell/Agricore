import { NextRequest, NextResponse } from "next/server";
import { getOfficeAuth } from "../../../office/_shared";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);

export async function POST(request: NextRequest) {
  const auth = await getOfficeAuth();

  if (!auth.user || !auth.canReview) {
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("logo");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No logo supplied" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use a PNG or JPEG logo" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Logo must be smaller than 3 MB" },
      { status: 400 }
    );
  }

  const extension = file.type === "image/png" ? "png" : "jpg";
  const path = `company/logo-${Date.now()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { data: current, error: currentError } = await auth.supabase
    .from("company_settings")
    .select("logo_path")
    .eq("id", 1)
    .single();

  if (currentError) {
    return NextResponse.json(
      { error: currentError.message },
      { status: 500 }
    );
  }

  const { error: uploadError } = await auth.supabase.storage
    .from("company-branding")
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const { error: updateError } = await auth.supabase
    .from("company_settings")
    .update({ logo_path: path })
    .eq("id", 1);

  if (updateError) {
    await auth.supabase.storage
      .from("company-branding")
      .remove([path]);

    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  if (current.logo_path) {
    const { error: removeOldError } = await auth.supabase.storage
      .from("company-branding")
      .remove([current.logo_path]);

    if (removeOldError) {
      console.error("Unable to remove old company logo:", removeOldError);
    }
  }

  const { data: signed, error: signedUrlError } =
    await auth.supabase.storage
      .from("company-branding")
      .createSignedUrl(path, 60 * 60);

  if (signedUrlError) {
    console.error("Unable to create signed logo URL:", signedUrlError);
  }

  return NextResponse.json({
    logoPath: path,
    logoUrl: signed?.signedUrl ?? null,
  });
}

export async function DELETE() {
  const auth = await getOfficeAuth();

  if (!auth.user || !auth.canReview) {
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401 }
    );
  }

  const { data: current, error: readError } = await auth.supabase
    .from("company_settings")
    .select("logo_path")
    .eq("id", 1)
    .single();

  if (readError) {
    return NextResponse.json(
      { error: readError.message },
      { status: 500 }
    );
  }

  if (current.logo_path) {
    const { error: removeError } = await auth.supabase.storage
      .from("company-branding")
      .remove([current.logo_path]);

    if (removeError) {
      return NextResponse.json(
        { error: removeError.message },
        { status: 500 }
      );
    }
  }

  const { error: updateError } = await auth.supabase
    .from("company_settings")
    .update({ logo_path: null })
    .eq("id", 1);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}