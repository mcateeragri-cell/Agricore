import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

export const dynamic = "force-dynamic";

async function access() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  const admin = createSupabaseAdmin();
  if (!(await isCompanyFeatureEnabled(admin, auth.companyId, "atlas_enterprise_network"))) return { error: NextResponse.json({ error: "Enterprise Network is not enabled for this subscription." }, { status: 403 }) } as const;
  return { auth, admin, error: null } as const;
}

export async function GET() {
  const result = await access(); if (result.error) return result.error; const { auth, admin } = result;
  const [settings, machines, parts, campaigns, stockMachines, stockItems, networkCompanies] = await Promise.all([
    admin.from("enterprise_network_settings").select("*").eq("company_id", auth.companyId).maybeSingle(),
    admin.from("marketplace_machine_listings").select("*,sales_stock_machines(make,model,year,hours,asking_price,status,stock_number)").eq("company_id", auth.companyId).order("updated_at", { ascending: false }),
    admin.from("marketplace_part_listings").select("*,stock_items(part_number,description,quantity_in_stock,unit_price)").eq("company_id", auth.companyId).order("updated_at", { ascending: false }),
    admin.from("dealer_campaigns").select("*").eq("company_id", auth.companyId).order("created_at", { ascending: false }),
    admin.from("sales_stock_machines").select("id,stock_number,make,model,year,hours,asking_price,status").eq("company_id", auth.companyId).neq("status", "sold").order("created_at", { ascending: false }).limit(250),
    admin.from("stock_items").select("id,part_number,description,quantity_in_stock,unit_price,active").eq("company_id", auth.companyId).eq("active", true).order("description").limit(500),
    admin.from("enterprise_network_settings").select("company_id,marketplace_opt_in,benchmark_opt_in").or("marketplace_opt_in.eq.true,benchmark_opt_in.eq.true"),
  ]);
  const firstError = settings.error || machines.error || parts.error || campaigns.error || stockMachines.error || stockItems.error || networkCompanies.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const marketplaceCompanyIds = (networkCompanies.data ?? []).filter((row) => row.marketplace_opt_in).map((row) => row.company_id);
  let publicMachineListings: any[] = [];
  let publicPartListings: any[] = [];
  if (marketplaceCompanyIds.length) {
    const [publicMachines, publicParts] = await Promise.all([
      admin.from("marketplace_machine_listings").select("id,company_id,headline,description,updated_at,sales_stock_machines(make,model,year,hours,asking_price,status,stock_number)").eq("published", true).in("company_id", marketplaceCompanyIds).limit(200),
      admin.from("marketplace_part_listings").select("id,company_id,quantity_available,notes,updated_at,stock_items(part_number,description,unit_price)").eq("published", true).in("company_id", marketplaceCompanyIds).limit(500),
    ]);
    if (!publicMachines.error) publicMachineListings = publicMachines.data ?? [];
    if (!publicParts.error) publicPartListings = publicParts.data ?? [];
  }

  const companyIds = [...new Set([...publicMachineListings, ...publicPartListings].map((row) => row.company_id).filter(Boolean))];
  let companyNames = new Map<string, string>();
  if (companyIds.length) {
    const { data: companies } = await admin.from("companies").select("id,company_name").in("id", companyIds);
    companyNames = new Map((companies ?? []).map((company) => [company.id, company.company_name]));
  }
  publicMachineListings = publicMachineListings.map((row) => ({ ...row, company_name: companyNames.get(row.company_id) || "Participating dealer" }));
  publicPartListings = publicPartListings.map((row) => ({ ...row, company_name: companyNames.get(row.company_id) || "Participating dealer" }));

  let benchmarks: Array<{ make: string; model: string; machines: number; jobs: number }> = [];
  if (settings.data?.benchmark_opt_in) {
    const benchmarkCompanyIds = (networkCompanies.data ?? []).filter((row) => row.benchmark_opt_in).map((row) => row.company_id);
    if (benchmarkCompanyIds.length) {
      const { data: benchmarkMachines } = await admin.from("machines").select("id,company_id,make,model").in("company_id", benchmarkCompanyIds).limit(5000);
      const ids = (benchmarkMachines ?? []).map((row) => row.id);
      const jobCountByMachine = new Map<string, number>();
      if (ids.length) {
        const { data: benchmarkJobs } = await admin.from("jobs").select("machine_id").in("machine_id", ids).limit(10000);
        for (const job of benchmarkJobs ?? []) if (job.machine_id) jobCountByMachine.set(job.machine_id, (jobCountByMachine.get(job.machine_id) ?? 0) + 1);
      }
      const grouped = new Map<string, { make: string; model: string; machines: number; jobs: number }>();
      for (const machine of benchmarkMachines ?? []) {
        const make = String(machine.make ?? "Unknown"); const model = String(machine.model ?? ""); const key = `${make.toLowerCase()}|${model.toLowerCase()}`;
        const current = grouped.get(key) ?? { make, model, machines: 0, jobs: 0 };
        current.machines += 1; current.jobs += jobCountByMachine.get(machine.id) ?? 0; grouped.set(key, current);
      }
      benchmarks = [...grouped.values()].filter((row) => row.machines >= 2).sort((a,b) => b.machines - a.machines).slice(0, 20);
    }
  }

  return NextResponse.json({ settings: settings.data, machineListings: machines.data ?? [], partListings: parts.data ?? [], campaigns: campaigns.data ?? [], stockMachines: stockMachines.data ?? [], stockItems: stockItems.data ?? [], publicMachineListings, publicPartListings, benchmarks });
}

export async function POST(request: NextRequest) {
  const result = await access(); if (result.error) return result.error; const { auth, admin } = result;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? "");
  if (action === "settings") {
    const { error } = await admin.from("enterprise_network_settings").upsert({ company_id: auth.companyId, network_opt_in: Boolean(body.network_opt_in), marketplace_opt_in: Boolean(body.marketplace_opt_in), benchmark_opt_in: Boolean(body.benchmark_opt_in), updated_at: new Date().toISOString() }, { onConflict: "company_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ saved: true });
  }
  if (action === "machine_listing") {
    const stockMachineId = String(body.stock_machine_id ?? ""); if (!stockMachineId) return NextResponse.json({ error: "Stock machine is required." }, { status: 400 });
    const { data: machine } = await admin.from("sales_stock_machines").select("id").eq("id", stockMachineId).eq("company_id", auth.companyId).maybeSingle(); if (!machine) return NextResponse.json({ error: "Stock machine not found." }, { status: 404 });
    const { error } = await admin.from("marketplace_machine_listings").upsert({ company_id: auth.companyId, stock_machine_id: stockMachineId, published: body.published !== false, headline: String(body.headline ?? "").trim() || null, description: String(body.description ?? "").trim() || null, updated_at: new Date().toISOString() }, { onConflict: "company_id,stock_machine_id" }); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ saved: true });
  }
  if (action === "part_listing") {
    const stockItemId = String(body.stock_item_id ?? ""); if (!stockItemId) return NextResponse.json({ error: "Stock item is required." }, { status: 400 });
    const { data: item } = await admin.from("stock_items").select("id").eq("id", stockItemId).eq("company_id", auth.companyId).maybeSingle(); if (!item) return NextResponse.json({ error: "Stock item not found." }, { status: 404 });
    const { error } = await admin.from("marketplace_part_listings").upsert({ company_id: auth.companyId, stock_item_id: stockItemId, published: body.published !== false, quantity_available: Number(body.quantity_available ?? 0), notes: String(body.notes ?? "").trim() || null, updated_at: new Date().toISOString() }, { onConflict: "company_id,stock_item_id" }); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ saved: true });
  }
  if (action === "campaign") {
    const title = String(body.title ?? "").trim(); if (!title) return NextResponse.json({ error: "Campaign title is required." }, { status: 400 });
    const { error } = await admin.from("dealer_campaigns").insert({ company_id: auth.companyId, title, manufacturer: String(body.manufacturer ?? "").trim() || null, campaign_type: String(body.campaign_type ?? "service_campaign"), reference: String(body.reference ?? "").trim() || null, description: String(body.description ?? "").trim() || null, status: "active", created_by: auth.userId }); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ saved: true }, { status: 201 });
  }
  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
