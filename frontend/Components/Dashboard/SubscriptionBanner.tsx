"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StatusPayload = {
  billing?: {
    subscription: {
      status: string;
      cancelAtPeriodEnd: boolean;
      graceEndsAt: string | null;
    };
  };
  trialDaysRemaining?: number;
};

export default function SubscriptionBanner() {
  const [payload, setPayload] = useState<StatusPayload | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/billing/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as StatusPayload;
      })
      .then((value) => {
        if (active && value) setPayload(value);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const subscription = payload?.billing?.subscription;
  if (!subscription) return null;

  if (subscription.status === "trial") {
    const days = payload?.trialDaysRemaining ?? 0;
    if (days > 7) return null;
    return (
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
        <div>
          <p className="font-black">Your AgriCore trial ends in {days} {days === 1 ? "day" : "days"}.</p>
          <p className="mt-1 text-sm font-medium opacity-80">Keep your payment method ready so service continues automatically after the trial.</p>
        </div>
        <Link href="/settings/billing" className="shrink-0 rounded-xl bg-amber-900 px-4 py-2 text-center text-sm font-black text-white dark:bg-amber-300 dark:text-amber-950">Review billing</Link>
      </div>
    );
  }

  if (subscription.status === "suspended") {
    return (
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-950 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-100">
        <div>
          <p className="font-black">Your subscription needs payment attention.</p>
          <p className="mt-1 text-sm font-medium opacity-80">Update the payment method in Stripe to prevent interruption to AgriCore.</p>
        </div>
        <Link href="/settings/billing" className="shrink-0 rounded-xl bg-red-700 px-4 py-2 text-center text-sm font-black text-white">Fix billing</Link>
      </div>
    );
  }

  if (subscription.cancelAtPeriodEnd) {
    return (
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-300 bg-white px-5 py-4 text-slate-900 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div>
          <p className="font-black">AgriCore is scheduled to cancel at the end of the current period.</p>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">You can keep the subscription active from Billing & Subscription before the period ends.</p>
        </div>
        <Link href="/settings/billing" className="shrink-0 rounded-xl bg-slate-950 px-4 py-2 text-center text-sm font-black text-white dark:bg-white dark:text-slate-950">Manage subscription</Link>
      </div>
    );
  }

  return null;
}
