import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminSupabaseClient = SupabaseClient;
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type JobPhotoRow = {
  id: string;
  company_id: string;
  job_id: string;
  uploaded_by: string | null;
  file_path: string;
  caption: string | null;
  created_at: string;
};

const ACTIVE_COMPANY_COOKIE = "agricore_company_id";
const PHOTO_BUCKET = "job-photos";
const MAX_PHOTOS_PER_JOB = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: jobId } = await context.params;

    if (!jobId) {
      return NextResponse.json(
        { error: "A job ID is required." },
        { status: 400 },
      );
    }

    const authentication =
      await createAuthenticatedAdminClient(request);

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const { adminClient, userId, companyId, role } = authentication;

    const accessResponse = await checkJobAccess(
      adminClient,
      jobId,
      userId,
      companyId,
      role,
    );

    if (accessResponse instanceof NextResponse) {
      return accessResponse;
    }

    const photos = await loadJobPhotos(
      adminClient,
      jobId,
      companyId,
    );

    return NextResponse.json(
      {
        photos,
        photoCount: photos.length,
        maximumPhotos: MAX_PHOTOS_PER_JOB,
        remainingPhotos: Math.max(
          0,
          MAX_PHOTOS_PER_JOB - photos.length,
        ),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error(
      "Unable to load technician job photos:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load job photos.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  let uploadedFilePath = "";

  try {
    const { id: jobId } = await context.params;

    if (!jobId) {
      return NextResponse.json(
        { error: "A job ID is required." },
        { status: 400 },
      );
    }

    const authentication =
      await createAuthenticatedAdminClient(request);

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const { adminClient, userId, companyId, role } = authentication;

    const accessResponse = await checkJobAccess(
      adminClient,
      jobId,
      userId,
      companyId,
      role,
    );

    if (accessResponse instanceof NextResponse) {
      return accessResponse;
    }

    const { count, error: countError } =
      await adminClient
        .from("job_photos")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("job_id", jobId)
        .eq("company_id", companyId);

    if (countError) {
      throw new Error(
        `Unable to check the job photo limit: ${countError.message}`,
      );
    }

    const currentPhotoCount =
      typeof count === "number" ? count : 0;

    if (currentPhotoCount >= MAX_PHOTOS_PER_JOB) {
      return NextResponse.json(
        {
          error:
            "This job already has the maximum of 10 photos.",
        },
        { status: 409 },
      );
    }

    const formData = await request.formData();
    const fileValue = formData.get("file");
    const captionValue = formData.get("caption");

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "Select a photo to upload." },
        { status: 400 },
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(fileValue.type)) {
      return NextResponse.json(
        {
          error:
            "The selected file must be a JPEG, PNG, WebP, HEIC or HEIF image.",
        },
        { status: 415 },
      );
    }

    if (fileValue.size <= 0) {
      return NextResponse.json(
        { error: "The selected photo is empty." },
        { status: 400 },
      );
    }

    if (fileValue.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error:
            "The selected photo is larger than the current 10 MB upload limit.",
        },
        { status: 413 },
      );
    }

    const caption =
      typeof captionValue === "string"
        ? captionValue.trim()
        : "";

    if (caption.length > 500) {
      return NextResponse.json(
        {
          error:
            "The photo caption cannot be longer than 500 characters.",
        },
        { status: 400 },
      );
    }

    const extension = getFileExtension(fileValue);
    uploadedFilePath =
      `${companyId}/${jobId}/${Date.now()}-${randomUUID()}.${extension}`;

    const fileBuffer = Buffer.from(
      await fileValue.arrayBuffer(),
    );

    const { error: uploadError } =
      await adminClient.storage
        .from(PHOTO_BUCKET)
        .upload(uploadedFilePath, fileBuffer, {
          contentType: fileValue.type,
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      throw new Error(
        `Unable to upload the photo: ${uploadError.message}`,
      );
    }

    const {
      data: insertedPhoto,
      error: insertError,
    } = await adminClient
      .from("job_photos")
      .insert({
        company_id: companyId,
        job_id: jobId,
        uploaded_by: userId,
        file_path: uploadedFilePath,
        caption: caption || null,
      })
      .select(
        "id, company_id, job_id, uploaded_by, file_path, caption, created_at",
      )
      .single();

    if (insertError) {
      await adminClient.storage
        .from(PHOTO_BUCKET)
        .remove([uploadedFilePath]);

      uploadedFilePath = "";

      throw new Error(
        `Unable to save the photo record: ${insertError.message}`,
      );
    }

    uploadedFilePath = "";

    const photo = await addSignedUrl(
      adminClient,
      insertedPhoto as JobPhotoRow,
    );

    const newPhotoCount = currentPhotoCount + 1;

    return NextResponse.json(
      {
        success: true,
        photo,
        photoCount: newPhotoCount,
        maximumPhotos: MAX_PHOTOS_PER_JOB,
        remainingPhotos: Math.max(
          0,
          MAX_PHOTOS_PER_JOB - newPhotoCount,
        ),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error(
      "Unable to upload technician job photo:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to upload the job photo.",
      },
      { status: 500 },
    );
  }
}

async function createAuthenticatedAdminClient(
  request: NextRequest,
): Promise<
  | {
      adminClient: AdminSupabaseClient;
      userId: string;
      companyId: string;
      role: string;
    }
  | NextResponse
> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Photo API configuration is missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "You must be signed in to view or upload job photos.",
      },
      { status: 401 },
    );
  }

  const adminClient: AdminSupabaseClient =
    createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json(
      {
        error:
          "Your session has expired. Please sign in again.",
      },
      { status: 401 },
    );
  }

  const requestedCompanyId =
    request.cookies
      .get(ACTIVE_COMPANY_COOKIE)
      ?.value?.trim() ?? "";

  let companyId = "";

  if (requestedCompanyId) {
    const {
      data: requestedMembership,
      error: requestedMembershipError,
    } = await adminClient
      .from("company_members")
      .select("company_id")
      .eq("company_id", requestedCompanyId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (requestedMembershipError) {
      return NextResponse.json(
        {
          error:
            `Unable to resolve the active company: ${requestedMembershipError.message}`,
        },
        { status: 500 },
      );
    }

    if (requestedMembership) {
      companyId =
        requestedMembership.company_id;
    }
  }

  if (!companyId) {
    const {
      data: memberships,
      error: membershipsError,
    } = await adminClient
      .from("company_members")
      .select("company_id, joined_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("joined_at", {
        ascending: true,
      })
      .limit(1);

    if (membershipsError) {
      return NextResponse.json(
        {
          error:
            `Unable to resolve the active company: ${membershipsError.message}`,
        },
        { status: 500 },
      );
    }

    companyId =
      Array.isArray(memberships) &&
      typeof memberships[0]?.company_id ===
        "string"
        ? memberships[0].company_id
        : "";
  }

  if (!companyId) {
    return NextResponse.json(
      {
        error:
          "No active company is available for this account.",
      },
      { status: 403 },
    );
  }

  const {
    data: roleRow,
    error: roleError,
  } = await adminClient
    .from("company_member_roles")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError) {
    return NextResponse.json(
      {
        error:
          `Unable to load the company role: ${roleError.message}`,
      },
      { status: 500 },
    );
  }

  return {
    adminClient,
    userId: user.id,
    companyId,
    role:
      typeof roleRow?.role === "string"
        ? roleRow.role
        : "",
  };
}

async function checkJobAccess(
  adminClient: AdminSupabaseClient,
  jobId: string,
  userId: string,
  companyId: string,
  role: string,
): Promise<true | NextResponse> {
  const [
    jobResult,
    assignmentResult,
  ] = await Promise.all([
    adminClient
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .eq("company_id", companyId)
      .maybeSingle(),

    adminClient
      .from("job_assignments")
      .select("id")
      .eq("job_id", jobId)
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .neq("assignment_status", "cancelled")
      .limit(1),
  ]);

  if (jobResult.error) {
    throw new Error(
      `Unable to check the job: ${jobResult.error.message}`,
    );
  }

  if (!jobResult.data) {
    return NextResponse.json(
      { error: "The requested job could not be found." },
      { status: 404 },
    );
  }

  if (assignmentResult.error) {
    throw new Error(
      `Unable to check the job assignment: ${assignmentResult.error.message}`,
    );
  }

  const officeRoles = new Set([
    "company_admin",
    "administrator",
    "service_manager",
    "office",
  ]);

  const isAssigned =
    Array.isArray(assignmentResult.data) &&
    assignmentResult.data.length > 0;

  if (!isAssigned && !officeRoles.has(role)) {
    return NextResponse.json(
      {
        error:
          "You are not assigned to this job.",
      },
      { status: 403 },
    );
  }

  return true;
}

async function loadJobPhotos(
  adminClient: AdminSupabaseClient,
  jobId: string,
  companyId: string,
) {
  const { data, error } = await adminClient
    .from("job_photos")
    .select(
      "id, company_id, job_id, uploaded_by, file_path, caption, created_at",
    )
    .eq("job_id", jobId)
    .eq("company_id", companyId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Unable to load job photos: ${error.message}`,
    );
  }

  const rows = (data ?? []) as JobPhotoRow[];

  return Promise.all(
    rows.map((row) =>
      addSignedUrl(adminClient, row),
    ),
  );
}

async function addSignedUrl(
  adminClient: AdminSupabaseClient,
  row: JobPhotoRow,
) {
  const {
    data,
    error,
  } = await adminClient.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(
      row.file_path,
      SIGNED_URL_LIFETIME_SECONDS,
    );

  if (error) {
    console.error(
      `Unable to create a signed URL for ${row.file_path}:`,
      error,
    );
  }

  return {
    id: row.id,
    companyId: row.company_id,
    jobId: row.job_id,
    uploadedBy: row.uploaded_by,
    filePath: row.file_path,
    caption: row.caption ?? "",
    createdAt: row.created_at,
    url: data?.signedUrl ?? "",
  };
}

function getBearerToken(
  request: NextRequest,
): string {
  const authorization =
    request.headers.get("authorization") ?? "";

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return "";
  }

  return authorization.slice(7).trim();
}

function getFileExtension(
  file: File,
): string {
  const typeExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };

  return typeExtensions[file.type] ?? "jpg";
}