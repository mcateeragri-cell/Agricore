import { NextRequest, NextResponse } from "next/server";

import { getTechnicianAuth } from "../../../../_shared";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
    partId: string;
  }>;
};

type AssignmentRow = {
  id: string;
};

type JobPartRow = {
  id: string;
  job_id: string;
  stock_item_id: string | null;
  quantity: number | null;
  part_number: string | null;
  description: string;
  unit_cost: number | null;
  unit_price: number | null;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type StockItemRow = {
  id: string;
  quantity_in_stock: number | null;
};

type UpdatePartRequest = {
  quantity?: unknown;
  notes?: unknown;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: jobId, partId } = await context.params;
    const auth = await getTechnicianAuth();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 },
      );
    }

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: 500 },
      );
    }

    const assignment = await getAccessibleAssignment(
      auth.supabase,
      jobId,
      auth.user.id,
      auth.isManager,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this job." },
        { status: 403 },
      );
    }

    const part = await getJobPart(
      auth.supabase,
      jobId,
      partId,
    );

    if (!part) {
      return NextResponse.json(
        { error: "The job part was not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as UpdatePartRequest;

    const newQuantity = Number(body.quantity);
    const notes =
      typeof body.notes === "string"
        ? body.notes.trim() || null
        : part.notes;

    if (
      !Number.isFinite(newQuantity) ||
      newQuantity <= 0
    ) {
      return NextResponse.json(
        { error: "Enter a valid quantity greater than zero." },
        { status: 400 },
      );
    }

    const oldQuantity = toNumber(part.quantity);
    const quantityDifference = newQuantity - oldQuantity;
    const now = new Date().toISOString();

    let stock: StockItemRow | null = null;
    let originalStockQuantity = 0;
    let updatedStockQuantity = 0;

    if (part.stock_item_id && quantityDifference !== 0) {
      const { data: stockData, error: stockError } =
        await auth.supabase
          .from("stock_items")
          .select("id, quantity_in_stock")
          .eq("id", part.stock_item_id)
          .maybeSingle();

      if (stockError) {
        throw new Error(stockError.message);
      }

      if (!stockData) {
        return NextResponse.json(
          {
            error:
              "The linked stock item could not be found.",
          },
          { status: 404 },
        );
      }

      stock = stockData as StockItemRow;
      originalStockQuantity = toNumber(
        stock.quantity_in_stock,
      );

      if (
        quantityDifference > 0 &&
        quantityDifference > originalStockQuantity
      ) {
        return NextResponse.json(
          {
            error: `Only ${formatQuantity(
              originalStockQuantity,
            )} additional stock is available.`,
          },
          { status: 409 },
        );
      }

      updatedStockQuantity =
        originalStockQuantity - quantityDifference;

      const { error: stockUpdateError } =
        await auth.supabase
          .from("stock_items")
          .update({
            quantity_in_stock: updatedStockQuantity,
            updated_at: now,
          })
          .eq("id", stock.id);

      if (stockUpdateError) {
        throw new Error(stockUpdateError.message);
      }
    }

    const { data: updatedPart, error: partUpdateError } =
      await auth.supabase
        .from("job_parts_used")
        .update({
          quantity: newQuantity,
          notes,
          updated_at: now,
        })
        .eq("id", partId)
        .eq("job_id", jobId)
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
        .maybeSingle();

    if (partUpdateError || !updatedPart) {
      if (stock) {
        await auth.supabase
          .from("stock_items")
          .update({
            quantity_in_stock: originalStockQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stock.id);
      }

      if (partUpdateError) {
        throw new Error(partUpdateError.message);
      }

      return NextResponse.json(
        { error: "The job part could not be updated." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      message: "Part updated.",
      part: mapJobPart(updatedPart as JobPartRow),
      quantityInStock: stock
        ? updatedStockQuantity
        : null,
    });
  } catch (error) {
    console.error(
      "PATCH technician job part error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update the part.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: jobId, partId } = await context.params;
    const auth = await getTechnicianAuth();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 },
      );
    }

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: 500 },
      );
    }

    const assignment = await getAccessibleAssignment(
      auth.supabase,
      jobId,
      auth.user.id,
      auth.isManager,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this job." },
        { status: 403 },
      );
    }

    const part = await getJobPart(
      auth.supabase,
      jobId,
      partId,
    );

    if (!part) {
      return NextResponse.json(
        { error: "The job part was not found." },
        { status: 404 },
      );
    }

    const quantityToReturn = toNumber(part.quantity);
    const now = new Date().toISOString();

    let stock: StockItemRow | null = null;
    let originalStockQuantity = 0;

    if (part.stock_item_id) {
      const { data: stockData, error: stockError } =
        await auth.supabase
          .from("stock_items")
          .select("id, quantity_in_stock")
          .eq("id", part.stock_item_id)
          .maybeSingle();

      if (stockError) {
        throw new Error(stockError.message);
      }

      if (!stockData) {
        return NextResponse.json(
          {
            error:
              "The linked stock item could not be found.",
          },
          { status: 404 },
        );
      }

      stock = stockData as StockItemRow;
      originalStockQuantity = toNumber(
        stock.quantity_in_stock,
      );

      const { error: stockUpdateError } =
        await auth.supabase
          .from("stock_items")
          .update({
            quantity_in_stock:
              originalStockQuantity + quantityToReturn,
            updated_at: now,
          })
          .eq("id", stock.id);

      if (stockUpdateError) {
        throw new Error(stockUpdateError.message);
      }

    }

    const { error: detachMovementError } =
      await auth.supabase
        .from("stock_movements")
        .update({ job_part_id: null })
        .eq("job_part_id", partId);

    if (detachMovementError) {
      if (stock) {
        await auth.supabase
          .from("stock_items")
          .update({
            quantity_in_stock: originalStockQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stock.id);
      }

      throw new Error(detachMovementError.message);
    }

    const { error: deleteError } = await auth.supabase
      .from("job_parts_used")
      .delete()
      .eq("id", partId)
      .eq("job_id", jobId);

    if (deleteError) {
      if (stock) {
        await auth.supabase
          .from("stock_items")
          .update({
            quantity_in_stock: originalStockQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stock.id);
      }

      throw new Error(deleteError.message);
    }

    return NextResponse.json({
      message: "Part removed and stock returned.",
    });
  } catch (error) {
    console.error(
      "DELETE technician job part error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove the part.",
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
  isManager: boolean,
): Promise<AssignmentRow | null> {
  let query = supabase
    .from("job_assignments")
    .select("id")
    .eq("job_id", jobId)
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

async function getJobPart(
  supabase: Awaited<
    ReturnType<typeof getTechnicianAuth>
  >["supabase"],
  jobId: string,
  partId: string,
): Promise<JobPartRow | null> {
  const { data, error } = await supabase
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
    .eq("id", partId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as JobPartRow | null;
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