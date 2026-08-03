import { NextRequest, NextResponse } from "next/server";

import { getTechnicianAuth } from "../../../_shared";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AssignmentRow = {
  id: string;
};

type StockItemRow = {
  id: string;
  part_number: string | null;
  description: string;
  category: string | null;
  manufacturer: string | null;
  supplier: string | null;
  unit_cost: number | null;
  unit_price: number | null;
  quantity_in_stock: number | null;
  minimum_stock: number | null;
  minimum_stock_level: number | null;
  location: string | null;
  storage_location: string | null;
  barcode: string | null;
  active: boolean;
};

type JobPartRow = {
  id: string;
  job_id: string;
  stock_item_id: string | null;
  quantity: number;
  part_number: string | null;
  description: string;
  unit_cost: number;
  unit_price: number;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type AddPartRequest = {
  stockItemId?: unknown;
  quantity?: unknown;
  notes?: unknown;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: jobId } = await context.params;
    const auth = await getTechnicianAuth();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 },
      );
    }

    const assignment = await getAccessibleAssignment(
      auth.supabase,
      jobId,
      auth.user.id,
      auth.companyId,
      auth.isManager,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this job." },
        { status: 403 },
      );
    }

    const search = (
      request.nextUrl.searchParams.get("q") ?? ""
    ).trim();

    let stockQuery = auth.supabase
      .from("stock_items")
      .select(`
        id,
        part_number,
        description,
        category,
        manufacturer,
        supplier,
        unit_cost,
        unit_price,
        quantity_in_stock,
        minimum_stock,
        minimum_stock_level,
        location,
        storage_location,
        barcode,
        active
      `)
      .eq("company_id", auth.companyId)
      .eq("active", true)
      .order("description", { ascending: true })
      .limit(search ? 50 : 100);

    if (search) {
      const safeSearch = escapePostgrestSearch(search);

      stockQuery = stockQuery.or(
        [
          `part_number.ilike.%${safeSearch}%`,
          `description.ilike.%${safeSearch}%`,
          `manufacturer.ilike.%${safeSearch}%`,
          `supplier.ilike.%${safeSearch}%`,
          `barcode.ilike.%${safeSearch}%`,
          `category.ilike.%${safeSearch}%`,
        ].join(","),
      );
    }

    const [partsResult, stockResult] = await Promise.all([
      auth.supabase
        .from("job_parts_used")
        .select(`
          id,
          job_id,
          stock_item_id,
          quantity,
          part_number,
          description,
          unit_cost,
          unit_price,
          supplier,
          notes,
          created_at,
          updated_at
        `)
        .eq("job_id", jobId)
        .eq("company_id", auth.companyId)
        .order("created_at", { ascending: false }),

      stockQuery,
    ]);

    const loadError =
      partsResult.error ?? stockResult.error;

    if (loadError) {
      throw new Error(loadError.message);
    }

    const parts = (
      (partsResult.data ?? []) as JobPartRow[]
    ).map(mapJobPart);

    const stockItems = (
      (stockResult.data ?? []) as StockItemRow[]
    ).map(mapStockItem);

    const partsTotal = parts.reduce(
      (total, part) => total + part.lineTotal,
      0,
    );

    return NextResponse.json(
      {
        parts,
        stockItems,
        partsTotal: roundMoney(partsTotal),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET technician job parts error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load job parts.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: jobId } = await context.params;
    const auth = await getTechnicianAuth();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 },
      );
    }

    const assignment = await getAccessibleAssignment(
      auth.supabase,
      jobId,
      auth.user.id,
      auth.companyId,
      auth.isManager,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this job." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as AddPartRequest;

    const stockItemId =
      typeof body.stockItemId === "string"
        ? body.stockItemId.trim()
        : "";

    const quantity = Number(body.quantity);

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim() || null
        : null;

    if (!stockItemId) {
      return NextResponse.json(
        { error: "Select a stock item." },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return NextResponse.json(
        { error: "Enter a valid quantity greater than zero." },
        { status: 400 },
      );
    }

    const { data: stockData, error: stockError } =
      await auth.supabase
        .from("stock_items")
        .select(`
          id,
          part_number,
          description,
          category,
          manufacturer,
          supplier,
          unit_cost,
          unit_price,
          quantity_in_stock,
          minimum_stock,
          minimum_stock_level,
          location,
          storage_location,
          barcode,
          active
        `)
        .eq("id", stockItemId)
        .eq("company_id", auth.companyId)
        .maybeSingle();

    if (stockError) {
      throw new Error(stockError.message);
    }

    if (!stockData) {
      return NextResponse.json(
        { error: "The selected stock item was not found." },
        { status: 404 },
      );
    }

    const stock = stockData as StockItemRow;

    if (!stock.active) {
      return NextResponse.json(
        { error: "The selected stock item is inactive." },
        { status: 409 },
      );
    }

    const currentQuantity = toNumber(
      stock.quantity_in_stock,
    );

    if (quantity > currentQuantity) {
      return NextResponse.json(
        {
          error: `Only ${formatQuantity(
            currentQuantity,
          )} currently in stock.`,
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();

    const { data: insertedPart, error: partError } =
      await auth.supabase
        .from("job_parts_used")
        .insert({
          company_id: auth.companyId,
          job_id: jobId,
          stock_item_id: stock.id,
          quantity,
          part_number: stock.part_number,
          description: stock.description,
          unit_cost: toNumber(stock.unit_cost),
          unit_price: toNumber(stock.unit_price),
          supplier: stock.supplier,
          notes,
          created_at: now,
          updated_at: now,
        })
        .select(`
          id,
          job_id,
          stock_item_id,
          quantity,
          part_number,
          description,
          unit_cost,
          unit_price,
          supplier,
          notes,
          created_at,
          updated_at
        `)
        .single();

    if (partError) {
      throw new Error(partError.message);
    }

    const jobPart = insertedPart as JobPartRow;
    const newQuantity = currentQuantity - quantity;

    const { error: stockUpdateError } =
      await auth.supabase
        .from("stock_items")
        .update({
          quantity_in_stock: newQuantity,
          updated_at: now,
        })
        .eq("id", stock.id)
        .eq("company_id", auth.companyId);

    if (stockUpdateError) {
      await auth.supabase
        .from("job_parts_used")
        .delete()
        .eq("id", jobPart.id)
        .eq("company_id", auth.companyId);

      throw new Error(stockUpdateError.message);
    }

    const { error: movementError } =
      await auth.supabase
        .from("stock_movements")
        .insert({
          company_id: auth.companyId,
          stock_item_id: stock.id,
          job_id: jobId,
          job_part_id: jobPart.id,
          movement_type: "job_usage",
          quantity: -quantity,
          notes:
            notes ??
            `Used on job by ${auth.fullName}.`,
          created_at: now,
        });

    if (movementError) {
      await Promise.all([
        auth.supabase
          .from("stock_items")
          .update({
            quantity_in_stock: currentQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stock.id)
          .eq("company_id", auth.companyId),

        auth.supabase
          .from("job_parts_used")
          .delete()
          .eq("id", jobPart.id)
          .eq("company_id", auth.companyId),
      ]);

      throw new Error(movementError.message);
    }

    return NextResponse.json(
      {
        message: "Part added and stock updated.",
        part: mapJobPart(jobPart),
        stockItem: {
          ...mapStockItem(stock),
          quantityInStock: newQuantity,
          lowStock:
            newQuantity <= getMinimumStock(stock),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST technician job parts error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to add the part.",
      },
      { status: 500 },
    );
  }
}

async function getAccessibleAssignment(
  supabase: Awaited<
    ReturnType<typeof getTechnicianAuth>
  >["supabase"],
  jobId: string,
  userId: string,
  companyId: string,
  isManager: boolean,
): Promise<AssignmentRow | null> {
  let query = supabase
    .from("job_assignments")
    .select("id")
    .eq("job_id", jobId)
    .eq("company_id", companyId)
    .neq("assignment_status", "cancelled");

  if (!isManager) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query
    .order("scheduled_start", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AssignmentRow | null;
}

function mapStockItem(stock: StockItemRow) {
  const quantityInStock = toNumber(
    stock.quantity_in_stock,
  );

  const minimumStock = getMinimumStock(stock);

  return {
    id: stock.id,
    partNumber: stock.part_number ?? "",
    description: stock.description,
    category: stock.category ?? "",
    manufacturer: stock.manufacturer ?? "",
    supplier: stock.supplier ?? "",
    unitCost: toNumber(stock.unit_cost),
    unitPrice: toNumber(stock.unit_price),
    quantityInStock,
    minimumStock,
    location:
      stock.storage_location ??
      stock.location ??
      "",
    barcode: stock.barcode ?? "",
    lowStock: quantityInStock <= minimumStock,
  };
}

function mapJobPart(part: JobPartRow) {
  const quantity = toNumber(part.quantity);
  const unitCost = toNumber(part.unit_cost);
  const unitPrice = toNumber(part.unit_price);

  return {
    id: part.id,
    jobId: part.job_id,
    stockItemId: part.stock_item_id,
    quantity,
    partNumber: part.part_number ?? "",
    description: part.description,
    unitCost,
    unitPrice,
    supplier: part.supplier ?? "",
    notes: part.notes ?? "",
    lineCost: roundMoney(quantity * unitCost),
    lineTotal: roundMoney(quantity * unitPrice),
    createdAt: part.created_at,
    updatedAt: part.updated_at,
  };
}

function getMinimumStock(stock: StockItemRow) {
  return Math.max(
    toNumber(stock.minimum_stock),
    toNumber(stock.minimum_stock_level),
  );
}

function toNumber(value: number | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}

function escapePostgrestSearch(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/[%_]/g, (character) => `\\${character}`)
    .replace(/[(),]/g, " ");
}