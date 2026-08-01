import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateCustomerBody = {
  contactName?: unknown;
  businessName?: unknown;
  customerType?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  postcode?: unknown;
  vatNumber?: unknown;
  notes?: unknown;
};

const CUSTOMER_EDIT_PERMISSION = "customers.edit";

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

function canEditCustomer(permissions: string[]) {
  return permissions.includes(CUSTOMER_EDIT_PERMISSION);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await getAuthenticatedUserContext();

  if (!auth) {
    return NextResponse.json(
      {
        error: "You must be signed in to edit a customer.",
      },
      {
        status: 401,
      },
    );
  }

  if (!canEditCustomer(auth.permissions)) {
    return NextResponse.json(
      {
        error:
          "Your account is not authorised to edit customer records.",
      },
      {
        status: 403,
      },
    );
  }

  const { id: customerId } = await context.params;

  if (!customerId) {
    return NextResponse.json(
      {
        error: "A customer ID is required.",
      },
      {
        status: 400,
      },
    );
  }

  let body: UpdateCustomerBody;

  try {
    body = (await request.json()) as UpdateCustomerBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "The customer update request is not valid JSON.",
      },
      {
        status: 400,
      },
    );
  }

  const contactName = cleanText(body.contactName, 160);
  const businessName = cleanText(body.businessName, 200);
  const customerType =
    cleanText(body.customerType, 80) || "Farm";
  const phone = cleanText(body.phone, 80);
  const email = cleanText(body.email, 254).toLowerCase();
  const address = cleanText(body.address, 1000);
  const postcode = cleanText(
    body.postcode,
    20,
  ).toUpperCase();
  const vatNumber = cleanText(
    body.vatNumber,
    50,
  ).toUpperCase();
  const notes = cleanText(body.notes, 5000);

  if (!contactName && !businessName) {
    return NextResponse.json(
      {
        error:
          "Enter either a contact name or a business name.",
      },
      {
        status: 400,
      },
    );
  }

  if (email && !email.includes("@")) {
    return NextResponse.json(
      {
        error: "Enter a valid email address.",
      },
      {
        status: 400,
      },
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("customers")
    .update({
      contact_name: contactName || null,
      business_name: businessName || null,
      customer_type: customerType,
      phone: phone || null,
      email: email || null,
      address: address || null,
      postcode: postcode || null,
      vat_number: vatNumber || null,
      notes: notes || null,
    })
    .eq("id", customerId)
    .eq("company_id", auth.companyId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Unable to update customer:", error);

    return NextResponse.json(
      {
        error: `Unable to update customer: ${error.message}`,
      },
      {
        status: 500,
      },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error:
          "The customer could not be found in the active company.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    customer: {
      id: data.id,
      name: data.contact_name ?? "",
      businessName: data.business_name ?? "",
      customerType: data.customer_type ?? "Farm",
      phone: data.phone ?? "",
      email: data.email ?? "",
      address: data.address ?? "",
      postcode: data.postcode ?? "",
      vatNumber: data.vat_number ?? "",
      notes: data.notes ?? "",
    },
  });
}