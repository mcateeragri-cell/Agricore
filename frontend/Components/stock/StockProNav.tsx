"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["Inventory", "/stock"],
  ["Movements", "/stock/movements"],
  ["Depot Transfers", "/stock/transfers"],
  ["Purchase Orders", "/stock/purchase-orders"],
  ["Suppliers", "/stock/suppliers"],
] as const;

export default function StockProNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([label, href]) => {
        const active = href === "/stock" ? pathname === href || pathname.startsWith("/stock/") && !pathname.startsWith("/stock/movements") && !pathname.startsWith("/stock/transfers") && !pathname.startsWith("/stock/purchase-orders") && !pathname.startsWith("/stock/suppliers") : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              active
                ? "bg-[#103d2e] text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
