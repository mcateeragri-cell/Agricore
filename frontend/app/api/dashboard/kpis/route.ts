import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { loadEffectiveFeatures } from "@/lib/platform/effective-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLOSED = new Set([
  "completed",
  "complete",
  "closed",
  "cancelled",
  "invoiced",
]);

const PAID = new Set([
  "paid",
  "settled",
  "completed",
]);

const WAITING_PARTS = new Set([
  "waiting_parts",
  "waiting parts",
  "awaiting_parts",
  "awaiting parts",
  "parts_required",
]);

const OPEN_PO = new Set([
  "draft",
  "ordered",
  "part_received",
  "part received",
  "submitted",
]);

const OPEN_QUOTES = new Set([
  "draft",
  "sent",
  "viewed",
]);

const num = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const norm = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase();

function canViewMoney(
  auth: NonNullable<
    Awaited<ReturnType<typeof getAuthenticatedUserContext>>
  >,
): boolean {
  if (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin"
  ) {
    return true;
  }

  if (
    auth.role === "company_admin" ||
    auth.role === "administrator"
  ) {
    return true;
  }

  if (
    auth.role === "technician" ||
    auth.role === "apprentice"
  ) {
    return false;
  }

  return (
    auth.permissions.includes("invoices.view") ||
    auth.permissions.includes("invoices.manage")
  );
}

export async function GET() {
  try {
    const auth = await getAuthenticatedUserContext();

    if (!auth) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const admin = createSupabaseAdmin();

    const { enabledFeatures } = await loadEffectiveFeatures(
      admin,
      auth.companyId,
    );

    const features = new Set(enabledFeatures);

    const opsBranchIds = auth.activeBranchId
      ? [auth.activeBranchId]
      : auth.accessibleOperationalBranchIds;

    const financeBranchIds = auth.activeFinanceBranchId
      ? [auth.activeFinanceBranchId]
      : auth.accessibleFinanceBranchIds;

    const moneyAllowed =
      canViewMoney(auth) &&
      auth.financeScope !== "none";

    const jobsQuery = admin
      .from("jobs")
      .select(
        "id,status,priority,branch_id,engineer_name,created_at",
      )
      .eq("company_id", auth.companyId);

    if (opsBranchIds.length > 0) {
      jobsQuery.in("branch_id", opsBranchIds);
    }

    const assignmentsQuery = admin
      .from("job_assignments")
      .select(
        "id,job_id,user_id,branch_id,scheduled_start,scheduled_end,assignment_status",
      )
      .eq("company_id", auth.companyId)
      .neq("assignment_status", "cancelled");

    if (opsBranchIds.length > 0) {
      assignmentsQuery.in("branch_id", opsBranchIds);
    }

    const promises: PromiseLike<any>[] = [
      jobsQuery,
      assignmentsQuery,
    ];

    const indexes: Record<string, number> = {
      jobs: 0,
      assignments: 1,
    };

    if (features.has("stock")) {
      indexes.stock = promises.length;

      let stockQuery = admin
        .from("stock_branch_balances")
        .select(
          "stock_item_id,branch_id,quantity_in_stock,quantity_reserved,minimum_stock",
        )
        .eq("company_id", auth.companyId);

      if (opsBranchIds.length > 0) {
        stockQuery = stockQuery.in(
          "branch_id",
          opsBranchIds,
        );
      }

      promises.push(stockQuery);

      indexes.stockItems = promises.length;

      promises.push(
        admin
          .from("stock_items")
          .select("id,unit_cost")
          .eq("company_id", auth.companyId)
          .eq("active", true),
      );

      indexes.purchaseOrders = promises.length;

      let purchaseOrdersQuery = admin
        .from("purchase_orders")
        .select("id,status,branch_id,total")
        .eq("company_id", auth.companyId);

      if (opsBranchIds.length > 0) {
        purchaseOrdersQuery =
          purchaseOrdersQuery.in(
            "branch_id",
            opsBranchIds,
          );
      }

      promises.push(purchaseOrdersQuery);

      indexes.transfers = promises.length;

      const transfersQuery = admin
        .from("stock_transfers")
        .select(
          "id,status,from_branch_id,to_branch_id,created_at",
        )
        .eq("company_id", auth.companyId);

      promises.push(transfersQuery);
    }

    if (
      features.has("quotes") &&
      moneyAllowed
    ) {
      indexes.quotes = promises.length;

      promises.push(
        admin
          .from("quotes")
          .select(
            "id,status,total,created_at",
          )
          .eq("company_id", auth.companyId),
      );
    }

    if (
      features.has("invoices") &&
      moneyAllowed
    ) {
      indexes.invoices = promises.length;

      let invoicesQuery = admin
        .from("invoices")
        .select(
          "id,status,total,amount_paid,branch_id,created_at",
        )
        .eq("company_id", auth.companyId);

      if (financeBranchIds.length > 0) {
        invoicesQuery = invoicesQuery.in(
          "branch_id",
          financeBranchIds,
        );
      }

      promises.push(invoicesQuery);
    }

    if (features.has("multi_branch")) {
      indexes.branches = promises.length;

      promises.push(
        admin
          .from("company_branches")
          .select("id,name,active")
          .eq("company_id", auth.companyId)
          .eq("active", true),
      );
    }

    const results = await Promise.all(promises);

    const failedResult = results.find(
      (result) => result?.error,
    );

    if (failedResult?.error) {
      throw new Error(
        failedResult.error.message,
      );
    }

    const jobs =
      results[indexes.jobs]?.data ?? [];

    const assignments =
      results[indexes.assignments]?.data ?? [];

    const openJobs = jobs.filter(
      (job: any) =>
        !CLOSED.has(norm(job.status)),
    );

    const urgentJobs = openJobs.filter(
      (job: any) =>
        [
          "urgent",
          "critical",
          "emergency",
          "high",
        ].includes(norm(job.priority)),
    ).length;

    const waitingParts = openJobs.filter(
      (job: any) =>
        WAITING_PARTS.has(
          norm(job.status),
        ),
    ).length;

    const assignedJobIds = new Set(
      assignments
        .map((row: any) =>
          String(row.job_id ?? ""),
        )
        .filter(Boolean),
    );

    const activeEngineerIds = new Set(
      assignments
        .filter((row: any) => {
          const status = norm(
            row.assignment_status,
          );

          return ![
            "cancelled",
            "completed",
          ].includes(status);
        })
        .map((row: any) =>
          String(row.user_id ?? ""),
        )
        .filter(Boolean),
    );

    const response: Record<
      string,
      unknown
    > = {
      service: {
        openJobs: openJobs.length,
        urgentJobs,
        waitingParts,
        activeEngineers:
          activeEngineerIds.size,
        scheduledAssignments:
          assignments.length,
        unassignedJobs: Math.max(
          0,
          openJobs.length -
            assignedJobIds.size,
        ),
      },
      parts: null,
      office: null,
      dealer: null,
    };

    if (features.has("stock")) {
      const balances =
        results[indexes.stock]?.data ??
        [];

      const stockItems =
        results[indexes.stockItems]
          ?.data ?? [];

      const purchaseOrders =
        results[indexes.purchaseOrders]
          ?.data ?? [];

      const transfers =
        results[indexes.transfers]
          ?.data ?? [];

      const costByItem =
        new Map<string, number>();

      for (const row of stockItems) {
        costByItem.set(
          String(row.id),
          num(row.unit_cost),
        );
      }

      const lowStock =
        balances.filter(
          (row: any) =>
            num(row.quantity_in_stock) -
              num(
                row.quantity_reserved,
              ) <=
            num(row.minimum_stock),
        ).length;

      const availableUnits =
        balances.reduce(
          (
            sum: number,
            row: any,
          ) =>
            sum +
            Math.max(
              0,
              num(
                row.quantity_in_stock,
              ) -
                num(
                  row.quantity_reserved,
                ),
            ),
          0,
        );

      const stockValue =
        balances.reduce(
          (
            sum: number,
            row: any,
          ) => {
            const quantity = Math.max(
              0,
              num(
                row.quantity_in_stock,
              ),
            );

            const unitCost =
              costByItem.get(
                String(
                  row.stock_item_id,
                ),
              ) ?? 0;

            return (
              sum +
              quantity * unitCost
            );
          },
          0,
        );

      const openPurchaseOrders =
        purchaseOrders.filter(
          (row: any) =>
            OPEN_PO.has(
              norm(row.status),
            ),
        ).length;

      const pendingTransfers =
        transfers.filter(
          (row: any) =>
            ![
              "completed",
              "cancelled",
              "received",
            ].includes(
              norm(row.status),
            ),
        ).length;

      response.parts = {
        lowStock,
        availableUnits:
          round(availableUnits),
        stockValue:
          round(stockValue),
        openPurchaseOrders,
        pendingTransfers,
      };
    }

    if (moneyAllowed) {
      const quotes =
        indexes.quotes !== undefined
          ? results[indexes.quotes]
              ?.data ?? []
          : [];

      const invoices =
        indexes.invoices !== undefined
          ? results[indexes.invoices]
              ?.data ?? []
          : [];

      const outstandingBalance =
        invoices.reduce(
          (
            sum: number,
            row: any,
          ) => {
            const status = norm(
              row.status,
            );

            if (
              PAID.has(status) ||
              status === "void"
            ) {
              return sum;
            }

            return (
              sum +
              Math.max(
                0,
                num(row.total) -
                  num(
                    row.amount_paid,
                  ),
              )
            );
          },
          0,
        );

      const draftInvoices =
        invoices.filter(
          (row: any) =>
            norm(row.status) ===
            "draft",
        ).length;

      const awaitingQuotes =
        quotes.filter(
          (row: any) =>
            OPEN_QUOTES.has(
              norm(row.status),
            ),
        ).length;

      response.office = {
        outstandingBalance:
          round(
            outstandingBalance,
          ),
        draftInvoices,
        awaitingQuotes,
        openJobs:
          openJobs.length,
      };
    }

    if (
      features.has(
        "multi_branch",
      )
    ) {
      const branches =
        results[indexes.branches]
          ?.data ?? [];

      response.dealer = {
        depots: branches.length,
        openJobs:
          openJobs.length,
        activeEngineers:
          activeEngineerIds.size,
        waitingParts,
        outstandingBalance:
          moneyAllowed &&
          response.office
            ? (
                response.office as {
                  outstandingBalance: number;
                }
              )
                .outstandingBalance
            : null,
      };
    }

    return NextResponse.json(
      response,
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load role KPI data.",
      },
      { status: 500 },
    );
  }
}