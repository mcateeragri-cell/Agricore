import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { deleteJobsSafely } from "@/lib/platform/data/deletion-service";
import { canManageCompany, writeBulkPlatformAudit } from "@/lib/platform/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EntityKey = "jobs" | "customers" | "machines" | "quotes" | "invoices" | "stock" | "users";
type ActionKey = "delete" | "archive" | "deactivate";
type Row = {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  meta?: string;
  protected?: boolean;
  protectionReason?: string;
};

type DbError = { code?: string | null; message?: string | null } | null;
type ActionBody = { entity?: unknown; action?: unknown; ids?: unknown };

const VALID_ENTITIES = new Set<EntityKey>(["jobs", "customers", "machines", "quotes", "invoices", "stock", "users"]);
const VALID_ACTIONS = new Set<ActionKey>(["delete", "archive", "deactivate"]);

function optionalSchemaError(error: DbError) {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    message.includes("column") && message.includes("does not exist")
  );
}

async function safeRows<T>(promise: PromiseLike<{ data: T[] | null; error: DbError }>) {
  const result = await promise;
  if (result.error) throw new Error(result.error.message || "Database query failed.");
  return result.data ?? [];
}

async function optionalDeleteByJob(admin: SupabaseClient, table: string, jobIds: string[]) {
  const { error } = await admin.from(table).delete().in("job_id", jobIds);
  if (error && !optionalSchemaError(error)) throw new Error(`${table}: ${error.message}`);
}

async function optionalNullJobReference(admin: SupabaseClient, table: string, jobIds: string[]) {
  const { error } = await admin.from(table).update({ job_id: null }).in("job_id", jobIds);
  if (error && !optionalSchemaError(error)) throw new Error(`${table}: ${error.message}`);
}

function customerName(row: Record<string, unknown>) {
  return String(row.business_name || row.contact_name || "Unnamed customer");
}

async function listRows(admin: SupabaseClient, companyId: string, entity: EntityKey): Promise<Row[]> {
  if (entity === "jobs") {
    const jobs = await safeRows<any>(
      admin.from("jobs")
        .select("id,job_number,status,priority,fault_reported,engineer_name,created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1000),
    );
    const ids = jobs.map((r) => r.id);
    const invoices = ids.length
      ? await safeRows<any>(admin.from("invoices").select("id,job_id,invoice_number").eq("company_id", companyId).in("job_id", ids))
      : [];
    const byJob = new Map(invoices.filter((r) => r.job_id).map((r) => [r.job_id, r]));
    return jobs.map((r) => {
      const invoice = byJob.get(r.id);
      return {
        id: r.id,
        primary: r.job_number || "Unnumbered job",
        secondary: r.fault_reported || r.engineer_name || "No description",
        status: r.status || "open",
        meta: r.engineer_name || r.priority || "",
        protected: Boolean(invoice),
        protectionReason: invoice ? `Linked to invoice ${invoice.invoice_number || "record"}` : undefined,
      };
    });
  }

  if (entity === "customers") {
    const rows = await safeRows<any>(
      admin.from("customers")
        .select("id,business_name,contact_name,email,phone,created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1000),
    );
    const ids = rows.map((r) => r.id);
    const [machines, jobs, quotes, invoices] = await Promise.all([
      ids.length ? safeRows<any>(admin.from("machines").select("id,customer_id").eq("company_id", companyId).in("customer_id", ids)) : [],
      ids.length ? safeRows<any>(admin.from("jobs").select("id,customer_id").eq("company_id", companyId).in("customer_id", ids)) : [],
      ids.length ? safeRows<any>(admin.from("quotes").select("id,customer_id").eq("company_id", companyId).in("customer_id", ids)) : [],
      ids.length ? safeRows<any>(admin.from("invoices").select("id,customer_id").eq("company_id", companyId).in("customer_id", ids)) : [],
    ]);
    const refs = new Map<string, number>();
    for (const item of [...machines, ...jobs, ...quotes, ...invoices]) {
      if (item.customer_id) refs.set(item.customer_id, (refs.get(item.customer_id) ?? 0) + 1);
    }
    return rows.map((r) => ({
      id: r.id,
      primary: customerName(r),
      secondary: [r.contact_name, r.email, r.phone].filter(Boolean).join(" · "),
      status: refs.has(r.id) ? "In use" : "Unused",
      protected: refs.has(r.id),
      protectionReason: refs.has(r.id) ? `${refs.get(r.id)} linked business record(s)` : undefined,
    }));
  }

  if (entity === "machines") {
    const rows = await safeRows<any>(
      admin.from("machines")
        .select("id,make,model,registration,serial_number,created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1000),
    );
    const ids = rows.map((r) => r.id);
    const [jobs, quotes, machineSales] = await Promise.all([
      ids.length ? safeRows<any>(admin.from("jobs").select("id,machine_id").eq("company_id", companyId).in("machine_id", ids)) : [],
      ids.length ? safeRows<any>(admin.from("quotes").select("id,machine_id").eq("company_id", companyId).in("machine_id", ids)) : [],
      ids.length ? safeRows<any>(admin.from("sales_machine_sales").select("id,customer_machine_id").eq("company_id", companyId).in("customer_machine_id", ids)) : [],
    ]);
    const refs = new Map<string, number>();
    for (const item of [...jobs, ...quotes]) {
      if (item.machine_id) refs.set(item.machine_id, (refs.get(item.machine_id) ?? 0) + 1);
    }
    for (const sale of machineSales) {
      if (sale.customer_machine_id) refs.set(sale.customer_machine_id, (refs.get(sale.customer_machine_id) ?? 0) + 1);
    }
    return rows.map((r) => ({
      id: r.id,
      primary: [r.make, r.model].filter(Boolean).join(" ") || "Unnamed machine",
      secondary: [r.registration, r.serial_number].filter(Boolean).join(" · "),
      status: refs.has(r.id) ? "In use" : "Unused",
      protected: refs.has(r.id),
      protectionReason: refs.has(r.id) ? `${refs.get(r.id)} linked job/quote/machinery-sale record(s)` : undefined,
    }));
  }

  if (entity === "quotes") {
    const rows = await safeRows<any>(
      admin.from("quotes").select("id,quote_number,title,status,total,created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1000),
    );
    const deletable = new Set(["draft", "rejected", "cancelled"]);
    return rows.map((r) => {
      const status = String(r.status || "draft").toLowerCase();
      return {
        id: r.id,
        primary: r.quote_number || "Unnumbered quote",
        secondary: r.title || (r.total != null ? `Total ${r.total}` : ""),
        status,
        protected: !deletable.has(status),
        protectionReason: !deletable.has(status) ? "Sent/accepted quotations are retained for audit history" : undefined,
      };
    });
  }

  if (entity === "invoices") {
    const rows = await safeRows<any>(
      admin.from("invoices").select("id,invoice_number,status,total,customer_name,created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1000),
    );
    const ids = rows.map((r) => r.id);
    const [machineSales, counterSales] = await Promise.all([
      ids.length ? safeRows<any>(admin.from("sales_machine_sales").select("invoice_id").eq("company_id", companyId).in("invoice_id", ids)) : [],
      ids.length ? safeRows<any>(admin.from("parts_counter_sales").select("invoice_id").eq("company_id", companyId).in("invoice_id", ids)) : [],
    ]);
    const transactional = new Set<string>([
      ...machineSales.map((r) => r.invoice_id).filter(Boolean),
      ...counterSales.map((r) => r.invoice_id).filter(Boolean),
    ]);
    return rows.map((r) => {
      const status = String(r.status || "draft").toLowerCase();
      const transactionProtected = transactional.has(r.id);
      const protectedRecord = status !== "draft" || transactionProtected;
      return {
        id: r.id,
        primary: r.invoice_number || "Unnumbered invoice",
        secondary: [r.customer_name, r.total != null ? `Total ${r.total}` : ""].filter(Boolean).join(" · "),
        status,
        protected: protectedRecord,
        protectionReason: transactionProtected
          ? "Linked to a completed machinery/parts sale transaction"
          : status !== "draft" ? "Only unlinked draft invoices can be permanently deleted" : undefined,
      };
    });
  }

  if (entity === "stock") {
    const rows = await safeRows<any>(
      admin.from("stock_items").select("id,part_number,description,active,quantity_in_stock,created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1000),
    );
    return rows.map((r) => ({
      id: r.id,
      primary: r.part_number || r.description || "Unnamed stock item",
      secondary: r.part_number ? r.description || "" : `Quantity ${r.quantity_in_stock ?? 0}`,
      status: r.active === false ? "Archived" : "Active",
      protected: r.active === false,
      protectionReason: r.active === false ? "Already archived" : undefined,
    }));
  }

  const memberships = await safeRows<any>(
    admin.from("company_members").select("company_id,user_id,is_active,joined_at").eq("company_id", companyId).order("joined_at", { ascending: false }),
  );
  const userIds = memberships.map((r) => r.user_id).filter(Boolean);
  const [profiles, roles] = await Promise.all([
    userIds.length ? safeRows<any>(admin.from("company_member_profiles").select("user_id,full_name,job_title,phone,is_active").eq("company_id", companyId).in("user_id", userIds)) : [],
    userIds.length ? safeRows<any>(admin.from("company_member_roles").select("user_id,role").eq("company_id", companyId).in("user_id", userIds)) : [],
  ]);
  const profileByUser = new Map(profiles.map((r) => [r.user_id, r]));
  const roleByUser = new Map(roles.map((r) => [r.user_id, r.role]));
  const authUsers: any[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(error.message);
    authUsers.push(...(data.users ?? []));
    if ((data.users ?? []).length < 100) break;
  }
  const authById = new Map(authUsers.map((u) => [u.id, u]));
  return memberships.map((membership) => {
    const profile = profileByUser.get(membership.user_id) as any;
    const authUser = authById.get(membership.user_id) as any;
    const role = roleByUser.get(membership.user_id) || "";
    const active = membership.is_active !== false && profile?.is_active !== false;
    return {
      id: membership.user_id,
      primary: profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email || "Unnamed user",
      secondary: [authUser?.email, profile?.job_title].filter(Boolean).join(" · "),
      status: active ? "Active" : "Inactive",
      meta: role,
      protected: !active,
      protectionReason: !active ? "Already inactive" : undefined,
    };
  });
}

async function deleteCustomers(admin: SupabaseClient, companyId: string, ids: string[]) {
  const refs = await Promise.all([
    safeRows<any>(admin.from("machines").select("customer_id").eq("company_id", companyId).in("customer_id", ids)),
    safeRows<any>(admin.from("jobs").select("customer_id").eq("company_id", companyId).in("customer_id", ids)),
    safeRows<any>(admin.from("quotes").select("customer_id").eq("company_id", companyId).in("customer_id", ids)),
    safeRows<any>(admin.from("invoices").select("customer_id").eq("company_id", companyId).in("customer_id", ids)),
  ]);
  const protectedIds = new Set<string>();
  refs.flat().forEach((r) => r.customer_id && protectedIds.add(r.customer_id));
  const deletable = ids.filter((id) => !protectedIds.has(id));
  if (deletable.length) {
    const { error } = await admin.from("customers").delete().eq("company_id", companyId).in("id", deletable);
    if (error) throw new Error(error.message);
  }
  return { processed: deletable.length, failed: ids.filter((id) => protectedIds.has(id)).map((id) => ({ id, error: "Customer has linked business history and was not deleted." })) };
}

async function deleteMachines(admin: SupabaseClient, companyId: string, ids: string[]) {
  const [jobs, quotes, machineSales] = await Promise.all([
    safeRows<any>(admin.from("jobs").select("machine_id").eq("company_id", companyId).in("machine_id", ids)),
    safeRows<any>(admin.from("quotes").select("machine_id").eq("company_id", companyId).in("machine_id", ids)),
    safeRows<any>(admin.from("sales_machine_sales").select("customer_machine_id").eq("company_id", companyId).in("customer_machine_id", ids)),
  ]);
  const protectedIds = new Set<string>();
  [...jobs, ...quotes].forEach((r) => r.machine_id && protectedIds.add(r.machine_id));
  machineSales.forEach((r) => r.customer_machine_id && protectedIds.add(r.customer_machine_id));
  const deletable = ids.filter((id) => !protectedIds.has(id));
  if (deletable.length) {
    const { error } = await admin.from("machines").delete().eq("company_id", companyId).in("id", deletable);
    if (error) throw new Error(error.message);
  }
  return { processed: deletable.length, failed: ids.filter((id) => protectedIds.has(id)).map((id) => ({ id, error: "Machine has linked job, quote or machinery-sale history and was not deleted." })) };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth)) return NextResponse.json({ error: "Company administrator access is required." }, { status: 403 });
  const entity = request.nextUrl.searchParams.get("entity") as EntityKey | null;
  if (!entity || !VALID_ENTITIES.has(entity)) return NextResponse.json({ error: "Select a valid data type." }, { status: 400 });
  try {
    return NextResponse.json({ rows: await listRows(createSupabaseAdmin(), auth.companyId, entity) });
  } catch (error) {
    console.error("Unable to load data management rows:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load records." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth)) return NextResponse.json({ error: "Company administrator access is required." }, { status: 403 });

  let body: ActionBody;
  try { body = (await request.json()) as ActionBody; }
  catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }

  const entity = typeof body.entity === "string" ? body.entity as EntityKey : null;
  const action = typeof body.action === "string" ? body.action as ActionKey : null;
  const ids = Array.isArray(body.ids) ? Array.from(new Set(body.ids.filter((id): id is string => typeof id === "string" && id.length > 0))).slice(0, 500) : [];
  if (!entity || !VALID_ENTITIES.has(entity) || !action || !VALID_ACTIONS.has(action) || ids.length === 0) {
    return NextResponse.json({ error: "Choose a valid action and at least one record." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  try {
    if (entity === "jobs" && action === "delete") {
      return NextResponse.json(await deleteJobsSafely(admin, auth.companyId, auth.userId, ids));
    }
    if (entity === "customers" && action === "delete") {
      const result = await deleteCustomers(admin, auth.companyId, ids);
      await writeBulkPlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "customer", action: "delete", ids, processed: result.processed });
      return NextResponse.json(result);
    }
    if (entity === "machines" && action === "delete") {
      const result = await deleteMachines(admin, auth.companyId, ids);
      await writeBulkPlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "machine", action: "delete", ids, processed: result.processed });
      return NextResponse.json(result);
    }

    if (entity === "quotes" && action === "delete") {
      const rows = await safeRows<any>(admin.from("quotes").select("id,status").eq("company_id", auth.companyId).in("id", ids));
      const allowed = rows.filter((r) => ["draft", "rejected", "cancelled"].includes(String(r.status || "draft").toLowerCase())).map((r) => r.id);
      const denied = ids.filter((id) => !allowed.includes(id));
      if (allowed.length) {
        await admin.from("quote_items").delete().in("quote_id", allowed);
        const { error } = await admin.from("quotes").delete().eq("company_id", auth.companyId).in("id", allowed);
        if (error) throw new Error(error.message);
      }
      await writeBulkPlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "quote", action: "delete", ids: allowed, processed: allowed.length });
      return NextResponse.json({ processed: allowed.length, failed: denied.map((id) => ({ id, error: "Only draft, rejected or cancelled quotes can be deleted." })) });
    }

    if (entity === "invoices" && action === "delete") {
      const rows = await safeRows<any>(admin.from("invoices").select("id,status").eq("company_id", auth.companyId).in("id", ids));
      const draftIds = rows.filter((r) => String(r.status || "draft").toLowerCase() === "draft").map((r) => r.id);
      const [machineSales, counterSales] = await Promise.all([
        draftIds.length ? safeRows<any>(admin.from("sales_machine_sales").select("invoice_id").eq("company_id", auth.companyId).in("invoice_id", draftIds)) : [],
        draftIds.length ? safeRows<any>(admin.from("parts_counter_sales").select("invoice_id").eq("company_id", auth.companyId).in("invoice_id", draftIds)) : [],
      ]);
      const linked = new Set<string>([
        ...machineSales.map((r) => r.invoice_id).filter(Boolean),
        ...counterSales.map((r) => r.invoice_id).filter(Boolean),
      ]);
      const allowed = draftIds.filter((id) => !linked.has(id));
      const denied = ids.filter((id) => !allowed.includes(id));
      if (allowed.length) {
        await admin.from("invoice_items").delete().eq("company_id", auth.companyId).in("invoice_id", allowed);
        const { error } = await admin.from("invoices").delete().eq("company_id", auth.companyId).in("id", allowed);
        if (error) throw new Error(error.message);
      }
      await writeBulkPlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "invoice", action: "delete", ids: allowed, processed: allowed.length });
      return NextResponse.json({ processed: allowed.length, failed: denied.map((id) => ({ id, error: linked.has(id) ? "Invoice is linked to a machinery or parts sale transaction and was not deleted." : "Only unlinked draft invoices can be deleted." })) });
    }

    if (entity === "stock" && action === "archive") {
      const { error } = await admin.from("stock_items").update({ active: false, updated_at: new Date().toISOString() }).eq("company_id", auth.companyId).in("id", ids);
      if (error) throw new Error(error.message);
      await writeBulkPlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "stock_item", action: "archive", ids, processed: ids.length });
      return NextResponse.json({ processed: ids.length, failed: [] });
    }

    if (entity === "users" && action === "deactivate") {
      const memberships = await safeRows<any>(admin.from("company_members").select("user_id,is_active").eq("company_id", auth.companyId).in("user_id", ids));
      const own = memberships.filter((r) => r.user_id === auth.userId).map((r) => r.user_id);
      const allowed = memberships.filter((r) => r.user_id !== auth.userId && r.is_active !== false).map((r) => r.user_id);
      if (allowed.length) {
        const now = new Date().toISOString();
        const { error: membershipError } = await admin.from("company_members").update({ is_active: false, updated_at: now }).eq("company_id", auth.companyId).in("user_id", allowed);
        if (membershipError) throw new Error(membershipError.message);
        const { error: profileError } = await admin.from("company_member_profiles").update({ is_active: false, updated_at: now }).eq("company_id", auth.companyId).in("user_id", allowed);
        if (profileError && !optionalSchemaError(profileError)) throw new Error(profileError.message);
      }
      await writeBulkPlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "user", action: "deactivate", ids: allowed, processed: allowed.length });
      return NextResponse.json({ processed: allowed.length, failed: own.map((id) => ({ id, error: "You cannot deactivate your own active company membership." })) });
    }

    return NextResponse.json({ error: "That action is not supported for this record type." }, { status: 400 });
  } catch (error) {
    console.error("Data management action failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Data-management action failed." }, { status: 500 });
  }
}
