"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  ClipboardList,
  PackageSearch,
  Users,
  Wrench,
} from "lucide-react";

import { useCompanyRegionalSettings } from "@/lib/client/use-company-regional-settings";
import { formatCurrency } from "@/lib/regional-settings";

type KpiPayload = {
  service?: {
    openJobs: number;
    urgentJobs: number;
    waitingParts: number;
    activeEngineers: number;
    scheduledAssignments: number;
    unassignedJobs: number;
  } | null;

  parts?: {
    lowStock: number;
    availableUnits: number;
    stockValue: number;
    openPurchaseOrders: number;
    pendingTransfers: number;
  } | null;

  office?: {
    outstandingBalance: number;
    draftInvoices: number;
    awaitingQuotes: number;
    openJobs: number;
  } | null;

  dealer?: {
    depots: number;
    openJobs: number;
    activeEngineers: number;
    waitingParts: number;
    outstandingBalance: number | null;
  } | null;

  error?: string;
};

type Variant =
  | "dealer"
  | "service"
  | "parts"
  | "office";

type DepotOverview = {
  totals?: {
    loadPercent?: number;
    revenue?: number;
    profit?: number;
    outstanding?: number;
  };
  depots?: unknown[];
};

type KpiItem = [
  icon: typeof Wrench,
  label: string,
  value: string | number,
];

type WidgetConfig = {
  eyebrow: string;
  title: string;
  href: string;
  items: KpiItem[];
};

export default function RoleKpiWidget({
  variant,
}: {
  variant: Variant;
}) {
  const [data, setData] =
    useState<KpiPayload | null>(null);

  const [error, setError] = useState("");

  const [depotOverview, setDepotOverview] =
    useState<DepotOverview | null>(null);

  const {
    regionalSettings,
  } = useCompanyRegionalSettings();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");

        const response = await fetch(
          "/api/dashboard/kpis",
          {
            cache: "no-store",
          },
        );

        const body =
          (await response.json()) as KpiPayload;

        if (!response.ok) {
          throw new Error(
            body.error ||
              "Unable to load KPI data.",
          );
        }

        if (!cancelled) {
          setData(body);
        }

        if (variant === "dealer") {
          const overviewResponse =
            await fetch(
              "/api/enterprise/depots/overview",
              {
                cache: "no-store",
              },
            );

          if (overviewResponse.ok) {
            const overview =
              (await overviewResponse.json()) as DepotOverview;

            if (!cancelled) {
              setDepotOverview(overview);
            }
          }
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load KPI data.",
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [variant]);

  const config =
    useMemo<WidgetConfig>(() => {
      if (variant === "dealer") {
        const row = data?.dealer;
        const totals =
          depotOverview?.totals;

        return {
          eyebrow: "Dealer principal",
          title: "Group operating picture",
          href: "/enterprise/depots",
          items: [
            [
              Building2,
              "Active depots",
              depotOverview?.depots
                ?.length ??
                row?.depots ??
                "—",
            ],
            [
              Wrench,
              "Workshop load",
              totals?.loadPercent == null
                ? "—"
                : `${totals.loadPercent}%`,
            ],
            [
              Banknote,
              "Revenue",
              totals?.revenue == null
                ? "Restricted"
                : formatCurrency(
                    totals.revenue,
                    regionalSettings,
                  ),
            ],
            [
              Banknote,
              "Profit",
              totals?.profit == null
                ? "Restricted"
                : formatCurrency(
                    totals.profit,
                    regionalSettings,
                  ),
            ],
          ],
        };
      }

      if (variant === "service") {
        const row = data?.service;

        return {
          eyebrow: "Service manager",
          title: "Workshop pressure",
          href: "/dispatch",
          items: [
            [
              Wrench,
              "Open jobs",
              row?.openJobs ?? "—",
            ],
            [
              AlertTriangle,
              "Urgent jobs",
              row?.urgentJobs ?? "—",
            ],
            [
              PackageSearch,
              "Waiting parts",
              row?.waitingParts ?? "—",
            ],
            [
              Users,
              "Engineers active",
              row?.activeEngineers ??
                "—",
            ],
          ],
        };
      }

      if (variant === "parts") {
        const row = data?.parts;

        return {
          eyebrow: "Parts manager",
          title: "Parts desk snapshot",
          href: "/stock",
          items: [
            [
              AlertTriangle,
              "Low stock",
              row?.lowStock ?? "—",
            ],
            [
              Banknote,
              "Stock value",
              row
                ? formatCurrency(
                    row.stockValue,
                    regionalSettings,
                  )
                : "—",
            ],
            [
              ClipboardList,
              "Open POs",
              row?.openPurchaseOrders ??
                "—",
            ],
            [
              PackageSearch,
              "Pending transfers",
              row?.pendingTransfers ??
                "—",
            ],
          ],
        };
      }

      const row = data?.office;

      return {
        eyebrow: "Office",
        title: "Commercial workflow",
        href: "/invoices",
        items: [
          [
            Banknote,
            "Outstanding",
            row
              ? formatCurrency(
                  row.outstandingBalance,
                  regionalSettings,
                )
              : "—",
          ],
          [
            ClipboardList,
            "Draft invoices",
            row?.draftInvoices ?? "—",
          ],
          [
            ClipboardList,
            "Quotes awaiting",
            row?.awaitingQuotes ?? "—",
          ],
          [
            Wrench,
            "Open jobs",
            row?.openJobs ?? "—",
          ],
        ],
      };
    }, [
      data,
      depotOverview,
      regionalSettings,
      variant,
    ]);

  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            {config.eyebrow}
          </p>

          <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
            {config.title}
          </h3>
        </div>

        <Link
          href={config.href}
          className="text-xs font-black text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Open
        </Link>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        {config.items.map(
          ([Icon, label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />

              <p className="mt-3 text-xl font-black text-slate-950 dark:text-white">
                {value}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-500">
                {label}
              </p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}