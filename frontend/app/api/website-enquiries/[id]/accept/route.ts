import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canViewWebsiteEnquiries } from "@/lib/website-enquiries/access";
import {
  cleanWebsiteEmail,
  cleanWebsiteText,
  machinePartsFromDescription,
  priorityFromWebsiteUrgency,
} from "@/lib/website-enquiries/normalise";

function enquiryJobDescription(enquiry: Record<string, any>) {
  const lines = [
    enquiry.enquiry_type ? `Website enquiry: ${enquiry.enquiry_type}` : "Website enquiry",
    enquiry.message,
    enquiry.location ? `Location: ${enquiry.location}` : "",
    enquiry.urgency ? `Urgency: ${enquiry.urgency}` : "",
    enquiry.requested_dates ? `Requested dates: ${enquiry.requested_dates}` : "",
    enquiry.work_environment ? `Work setting: ${enquiry.work_environment}` : "",
    enquiry.brands ? `Brands: ${enquiry.brands}` : "",
    enquiry.source_reference ? `Website reference: ${enquiry.source_reference}` : "",
  ].filter(Boolean);
  return lines.join("\n\n").slice(0, 5000);
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    if (!canViewWebsiteEnquiries(auth)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const admin = createSupabaseAdmin();

    const { data: enquiry, error: enquiryError } = await admin
      .from("website_enquiries")
      .select("*")
      .eq("id", id)
      .eq("company_id", auth.companyId)
      .maybeSingle();
    if (enquiryError) throw new Error(enquiryError.message);
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });

    if (enquiry.status === "accepted" && enquiry.accepted_job_id) {
      const { data: existingJob } = await admin
        .from("jobs")
        .select("id,job_number,status")
        .eq("id", enquiry.accepted_job_id)
        .eq("company_id", auth.companyId)
        .maybeSingle();
      return NextResponse.json({ ok: true, alreadyAccepted: true, job: existingJob });
    }
    if (enquiry.status === "rejected") {
      return NextResponse.json({ error: "Rejected enquiries must be reopened before acceptance." }, { status: 409 });
    }

    let branchId = cleanWebsiteText(enquiry.branch_id, 80) || null;
    if (!branchId) {
      const { data: branch, error: branchError } = await admin
        .from("company_branches")
        .select("id")
        .eq("company_id", auth.companyId)
        .eq("active", true)
        .order("is_head_office", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (branchError) throw new Error(branchError.message);
      branchId = branch?.id ?? null;
    }
    if (!branchId) return NextResponse.json({ error: "No active branch is available for this company." }, { status: 409 });

    const allowedBranchIds = auth.operationsScope === "company"
      ? null
      : new Set(auth.accessibleOperationalBranchIds);
    if (allowedBranchIds && !allowedBranchIds.has(branchId)) {
      return NextResponse.json({ error: "This enquiry belongs to a depot outside your operational access." }, { status: 403 });
    }

    let customerId = cleanWebsiteText(enquiry.customer_id, 80);
    if (!customerId) {
      const email = cleanWebsiteEmail(enquiry.email);
      const phone = cleanWebsiteText(enquiry.phone, 80);
      let customer: { id: string } | null = null;

      if (email) {
        const { data, error } = await admin
          .from("customers")
          .select("id")
          .eq("company_id", auth.companyId)
          .ilike("email", email)
          .limit(1)
          .maybeSingle();
        if (error) throw new Error(error.message);
        customer = data;
      }
      if (!customer && phone) {
        const { data, error } = await admin
          .from("customers")
          .select("id")
          .eq("company_id", auth.companyId)
          .eq("phone", phone)
          .limit(1)
          .maybeSingle();
        if (error) throw new Error(error.message);
        customer = data;
      }

      if (!customer) {
        const { data, error } = await admin
          .from("customers")
          .insert({
            company_id: auth.companyId,
            branch_id: branchId,
            business_name: cleanWebsiteText(enquiry.business_name, 160),
            contact_name: cleanWebsiteText(enquiry.contact_name, 120),
            customer_type: "Farm",
            phone,
            email,
            address: cleanWebsiteText(enquiry.location, 300),
            postcode: "",
            vat_number: "",
            notes: `Created from website enquiry ${cleanWebsiteText(enquiry.source_reference, 120) || enquiry.id}.`,
          })
          .select("id")
          .single();
        if (error) throw new Error(`Unable to create customer: ${error.message}`);
        customer = data;
      }
      customerId = customer.id;
    }

    let machineId = cleanWebsiteText(enquiry.machine_id, 80);
    const machineDescription = cleanWebsiteText(enquiry.machine_description, 260);
    if (!machineId && machineDescription) {
      const { make, model } = machinePartsFromDescription(machineDescription);
      if (make && model) {
        const { data: existingMachine, error: machineLookupError } = await admin
          .from("machines")
          .select("id")
          .eq("company_id", auth.companyId)
          .eq("customer_id", customerId)
          .ilike("make", make)
          .ilike("model", model)
          .limit(1)
          .maybeSingle();
        if (machineLookupError) throw new Error(machineLookupError.message);

        if (existingMachine) {
          machineId = existingMachine.id;
        } else {
          const { data: createdMachine, error: machineError } = await admin
            .from("machines")
            .insert({
              company_id: auth.companyId,
              branch_id: branchId,
              customer_id: customerId,
              make,
              model,
              machine_type: "Other",
              year: null,
              registration: "",
              serial_number: "",
              hours: null,
              usage_profile: "medium",
              estimated_hours_per_week: 25,
              notes: `Created from website enquiry. Original description: ${machineDescription}`,
            })
            .select("id")
            .single();
          if (machineError) throw new Error(`Unable to create machine: ${machineError.message}`);
          machineId = createdMachine.id;
        }
      }
    }

    const { data: job, error: jobError } = await admin
      .from("jobs")
      .insert({
        company_id: auth.companyId,
        branch_id: branchId,
        customer_id: customerId,
        machine_id: machineId || null,
        engineer_name: null,
        priority: priorityFromWebsiteUrgency(enquiry.urgency),
        status: "open",
        fault_reported: enquiryJobDescription(enquiry),
        machine_hours: null,
      })
      .select("id,job_number,status,branch_id")
      .single();
    if (jobError) throw new Error(`Unable to create job: ${jobError.message}`);

    const { error: updateError } = await admin
      .from("website_enquiries")
      .update({
        status: "accepted",
        customer_id: customerId,
        machine_id: machineId || null,
        accepted_job_id: job.id,
        accepted_by: auth.userId,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", auth.companyId);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true, job });
  } catch (error) {
    console.error("Unable to accept website enquiry:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to accept website enquiry." }, { status: 500 });
  }
}
