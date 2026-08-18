import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canViewWebsiteEnquiries } from "@/lib/website-enquiries/access";
import {
  cleanWebsiteEmail,
  cleanWebsiteText,
  machinePartsFromDescription,
} from "@/lib/website-enquiries/normalise";

type CustomerRow = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postcode: string | null;
};

type MachineRow = {
  id: string;
  customer_id: string;
  make: string | null;
  model: string | null;
  registration: string | null;
  serial_number: string | null;
};

function normalisePhone(value: unknown) {
  return cleanWebsiteText(value, 80).replace(/\D/g, "");
}

function normaliseWords(value: unknown) {
  return cleanWebsiteText(value, 220).toLowerCase().replace(/\s+/g, " ").trim();
}

function customerLabel(row: CustomerRow) {
  return row.business_name || row.contact_name || "Customer";
}

function machineLabel(row: MachineRow) {
  return [row.make, row.model, row.registration].filter(Boolean).join(" ") || row.serial_number || "Machine";
}

function customerScore(enquiry: Record<string, any>, row: CustomerRow) {
  let score = 0;
  const reasons: string[] = [];

  const enquiryEmail = cleanWebsiteEmail(enquiry.email);
  const customerEmail = cleanWebsiteEmail(row.email);
  if (enquiryEmail && customerEmail && enquiryEmail === customerEmail) {
    score += 100;
    reasons.push("Same email");
  }

  const enquiryPhone = normalisePhone(enquiry.phone);
  const customerPhone = normalisePhone(row.phone);
  if (enquiryPhone && customerPhone) {
    if (enquiryPhone === customerPhone) {
      score += 95;
      reasons.push("Same phone");
    } else if (enquiryPhone.length >= 8 && customerPhone.endsWith(enquiryPhone.slice(-8))) {
      score += 75;
      reasons.push("Phone ending matches");
    }
  }

  const enquiryBusiness = normaliseWords(enquiry.business_name);
  const enquiryContact = normaliseWords(enquiry.contact_name);
  const business = normaliseWords(row.business_name);
  const contact = normaliseWords(row.contact_name);

  if (enquiryBusiness && business) {
    if (enquiryBusiness === business) {
      score += 70;
      reasons.push("Same business name");
    } else if (business.includes(enquiryBusiness) || enquiryBusiness.includes(business)) {
      score += 35;
      reasons.push("Similar business name");
    }
  }

  if (enquiryContact && contact) {
    if (enquiryContact === contact) {
      score += 55;
      reasons.push("Same contact name");
    } else if (contact.includes(enquiryContact) || enquiryContact.includes(contact)) {
      score += 25;
      reasons.push("Similar contact name");
    }
  }

  return { score, reasons };
}

function machineScore(description: string, row: MachineRow) {
  const haystack = normaliseWords(description);
  if (!haystack) return { score: 0, reasons: [] as string[] };

  let score = 0;
  const reasons: string[] = [];
  const make = normaliseWords(row.make);
  const model = normaliseWords(row.model);
  const reg = normaliseWords(row.registration);
  const serial = normaliseWords(row.serial_number);
  const parsed = machinePartsFromDescription(description);

  if (reg && haystack.includes(reg)) {
    score += 120;
    reasons.push("Registration matches");
  }
  if (serial && haystack.includes(serial)) {
    score += 120;
    reasons.push("Serial number matches");
  }
  if (make && model && haystack.includes(make) && haystack.includes(model)) {
    score += 90;
    reasons.push("Make and model match");
  } else {
    if (make && haystack.includes(make)) {
      score += 30;
      reasons.push("Make matches");
    }
    if (model && haystack.includes(model)) {
      score += 45;
      reasons.push("Model matches");
    }
  }

  if (parsed.make && parsed.model) {
    if (normaliseWords(parsed.make) === make) score += 20;
    if (normaliseWords(parsed.model) === model) score += 30;
  }

  return { score, reasons };
}

async function addCustomers(
  admin: ReturnType<typeof createSupabaseAdmin>,
  companyId: string,
  target: Map<string, CustomerRow>,
  column: "email" | "phone" | "business_name" | "contact_name",
  value: string,
  mode: "eq" | "ilike",
) {
  if (!value) return;

  let query = admin
    .from("customers")
    .select("id,business_name,contact_name,phone,email,address,postcode")
    .eq("company_id", companyId)
    .limit(12);

  query = mode === "eq"
    ? query.eq(column, value)
    : query.ilike(column, `%${value}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as CustomerRow[]) target.set(row.id, row);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    if (!canViewWebsiteEnquiries(auth)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const admin = createSupabaseAdmin();

    const { data: enquiry, error: enquiryError } = await admin
      .from("website_enquiries")
      .select("id,company_id,customer_id,machine_id,contact_name,business_name,phone,email,location,machine_description,status")
      .eq("id", id)
      .eq("company_id", auth.companyId)
      .maybeSingle();

    if (enquiryError) throw new Error(enquiryError.message);
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });

    const customerRows = new Map<string, CustomerRow>();
    const email = cleanWebsiteEmail(enquiry.email);
    const phone = cleanWebsiteText(enquiry.phone, 80);
    const businessName = cleanWebsiteText(enquiry.business_name, 160);
    const contactName = cleanWebsiteText(enquiry.contact_name, 120);

    if (enquiry.customer_id) {
      const { data } = await admin
        .from("customers")
        .select("id,business_name,contact_name,phone,email,address,postcode")
        .eq("company_id", auth.companyId)
        .eq("id", enquiry.customer_id)
        .maybeSingle();
      if (data) customerRows.set(data.id, data as CustomerRow);
    }

    await Promise.all([
      addCustomers(admin, auth.companyId, customerRows, "email", email, "eq"),
      addCustomers(admin, auth.companyId, customerRows, "phone", phone, "eq"),
      addCustomers(admin, auth.companyId, customerRows, "business_name", businessName, "ilike"),
      addCustomers(admin, auth.companyId, customerRows, "contact_name", contactName, "ilike"),
    ]);

    const phoneDigits = normalisePhone(phone);
    if (phoneDigits.length >= 8) {
      const { data, error } = await admin
        .from("customers")
        .select("id,business_name,contact_name,phone,email,address,postcode")
        .eq("company_id", auth.companyId)
        .ilike("phone", `%${phoneDigits.slice(-8)}%`)
        .limit(12);
      if (!error) {
        for (const row of (data ?? []) as CustomerRow[]) customerRows.set(row.id, row);
      }
    }

    const customers = Array.from(customerRows.values())
      .map((row) => {
        const match = customerScore(enquiry, row);
        return {
          id: row.id,
          label: customerLabel(row),
          businessName: row.business_name,
          contactName: row.contact_name,
          phone: row.phone,
          email: row.email,
          address: row.address,
          postcode: row.postcode,
          score: match.score,
          reasons: match.reasons,
        };
      })
      .filter((row) => row.score > 0 || row.id === enquiry.customer_id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const customerIds = customers.map((row) => row.id);
    const machineDescription = cleanWebsiteText(enquiry.machine_description, 260);
    let machines: Array<{
      id: string;
      customerId: string;
      label: string;
      make: string | null;
      model: string | null;
      registration: string | null;
      serialNumber: string | null;
      score: number;
      reasons: string[];
    }> = [];

    if (customerIds.length > 0) {
      const { data, error } = await admin
        .from("machines")
        .select("id,customer_id,make,model,registration,serial_number")
        .eq("company_id", auth.companyId)
        .in("customer_id", customerIds)
        .limit(200);

      if (error) throw new Error(error.message);

      machines = ((data ?? []) as MachineRow[])
        .map((row) => {
          const match = machineScore(machineDescription, row);
          return {
            id: row.id,
            customerId: row.customer_id,
            label: machineLabel(row),
            make: row.make,
            model: row.model,
            registration: row.registration,
            serialNumber: row.serial_number,
            score: match.score,
            reasons: match.reasons,
          };
        })
        .sort((a, b) => b.score - a.score);
    }

    return NextResponse.json({
      enquiry: {
        id: enquiry.id,
        contactName: enquiry.contact_name,
        businessName: enquiry.business_name,
        phone: enquiry.phone,
        email: enquiry.email,
        location: enquiry.location,
        machineDescription,
      },
      customers,
      machines,
    });
  } catch (error) {
    console.error("Unable to prepare website enquiry matches:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to prepare customer matches." },
      { status: 500 },
    );
  }
}
