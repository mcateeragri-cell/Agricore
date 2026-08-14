import Link from "next/link";
import {
  FilePlus2,
  ReceiptText,
  Tractor,
  UserPlus2,
} from "lucide-react";

const commonActions = [
  {
    label: "New job",
    detail: "Start a job card",
    href: "/jobs/new",
    icon: FilePlus2,
    primary: true,
  },
  {
    label: "Customer",
    detail: "Find or add customer",
    href: "/customers",
    icon: UserPlus2,
    primary: false,
  },
  {
    label: "Machine",
    detail: "Open machine register",
    href: "/machines",
    icon: Tractor,
    primary: false,
  },
] as const;

export default function QuickActions({
  showFinancialActions = true,
  enabledFeatures = [],
}: {
  showFinancialActions?: boolean;
  enabledFeatures?: string[];
}) {
  const actions = (showFinancialActions && enabledFeatures.includes("quotes")
    ? [
        ...commonActions,
        {
          label: "New quote",
          detail: "Prepare a quotation",
          href: "/quotes/new",
          icon: ReceiptText,
          primary: false,
        },
      ]
    : commonActions
  ).filter((action) => {
    if (action.href.startsWith("/jobs")) return enabledFeatures.includes("jobs");
    if (action.href.startsWith("/customers")) return enabledFeatures.includes("customers");
    if (action.href.startsWith("/machines")) return enabledFeatures.includes("machines");
    if (action.href.startsWith("/quotes")) return enabledFeatures.includes("quotes");
    return true;
  });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            Quick actions
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">
            Get straight to work
          </h2>
        </div>
        <p className="hidden text-xs font-semibold text-slate-400 sm:block">
          Common tasks, one click away
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className={`group flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                action.primary
                  ? "border-emerald-700 bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-900 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  action.primary
                    ? "bg-white/15"
                    : "bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black">{action.label}</span>
                <span
                  className={`mt-0.5 block truncate text-xs font-semibold ${
                    action.primary
                      ? "text-emerald-100"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {action.detail}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
