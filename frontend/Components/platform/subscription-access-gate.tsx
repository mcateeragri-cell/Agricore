"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AccessPayload = {
  access?: "full" | "blocked";
  reason?: string;
  canManageBilling?: boolean;
};

const allowedWhileBlocked = ["/settings/billing", "/account", "/help", "/login", "/signup"];

export default function SubscriptionAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [payload, setPayload] = useState<AccessPayload | null>(null);

  useEffect(() => {
    if (allowedWhileBlocked.some((route) => pathname === route || pathname.startsWith(`${route}/`)) || pathname.startsWith("/platform")) {
      setPayload({ access: "full" });
      return;
    }
    let active = true;
    fetch("/api/billing/access", { cache: "no-store" })
      .then(async (response) => response.ok ? ((await response.json()) as AccessPayload) : null)
      .then((value) => { if (active && value) setPayload(value); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [pathname]);

  if (payload?.access !== "blocked") return <>{children}</>;

  const trialExpired = payload.reason === "trial_expired";
  return (
    <div className="min-h-[70vh] p-4 sm:p-8">
      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl dark:border-amber-900 dark:bg-slate-900">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Subscription required</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{trialExpired ? "Your 14-day AgriCore trial has ended" : "AgriCore access is paused"}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {trialExpired
            ? "Your company data is safe. Activate the subscription to continue working in AgriCore."
            : "Your company data is safe. Billing needs attention before normal access can continue."}
        </p>
        {payload.canManageBilling ? (
          <Link href="/settings/billing" className="mt-6 inline-flex rounded-xl bg-emerald-700 px-6 py-3 font-black text-white">Open Billing & Subscription</Link>
        ) : (
          <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">Ask your company administrator to update the AgriCore subscription.</p>
        )}
      </div>
    </div>
  );
}
