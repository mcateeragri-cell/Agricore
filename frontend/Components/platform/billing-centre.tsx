"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type BillingResponse = {
  billing?: {
    companyName: string;
    plan: { name: string; slug: string; monthlyPrice: number; trialDays: number };
    subscription: {
      status: string;
      trialEndsAt: string | null;
      currentPeriodEndsAt: string | null;
      cancelAtPeriodEnd: boolean;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
    };
  };
  trialDaysRemaining?: number;
  error?: string;
};

function dateLabel(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value))
    : "Not available";
}

export default function BillingCentre() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      const result = (await response.json()) as BillingResponse;
      if (!response.ok) throw new Error(result.error || "Unable to load billing.");
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load billing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const statusLabel = useMemo(() => {
    const value = data?.billing?.subscription.status ?? "trial";
    return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }, [data]);

  async function redirectFrom(endpoint: string, kind: "checkout" | "portal") {
    setBusy(kind);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to continue.");
      window.location.assign(result.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
      setBusy(null);
    }
  }

  if (loading) return <div className="rounded-3xl bg-white p-8 shadow-sm dark:bg-slate-900">Loading billing...</div>;
  const billing = data?.billing;
  if (!billing) return <div className="rounded-3xl bg-white p-8 shadow-sm dark:bg-slate-900">{error || "Billing is unavailable."}</div>;

  const hasStripeSubscription = Boolean(
    billing.subscription.stripeSubscriptionId,
  );
  const nextDate = billing.subscription.status === "trial"
    ? billing.subscription.trialEndsAt
    : billing.subscription.currentPeriodEndsAt;

  return (
    <div className="space-y-6">
      {searchParams.get("checkout") === "success" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          Payment method saved. Stripe is finalising your subscription; this page will update shortly.
        </div>
      ) : null}
      {searchParams.get("checkout") === "cancelled" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Secure checkout was cancelled. Your trial remains unchanged.
        </div>
      ) : null}
      {error ? <div className="rounded-2xl bg-red-50 px-5 py-4 font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Current subscription</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{billing.plan.name}</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">£{billing.plan.monthlyPrice.toFixed(2)} + VAT per month</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{statusLabel}</span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950"><p className="text-xs font-bold uppercase text-slate-500">Trial remaining</p><p className="mt-2 text-2xl font-black">{data?.trialDaysRemaining ?? 0} days</p></div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950"><p className="text-xs font-bold uppercase text-slate-500">Next billing date</p><p className="mt-2 text-base font-black">{dateLabel(nextDate)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950"><p className="text-xs font-bold uppercase text-slate-500">Payment method</p><p className="mt-2 text-base font-black">{hasStripeSubscription ? "Saved securely with Stripe" : "Not added"}</p></div>
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
            <strong>£0 is charged today.</strong> Your card or Apple Pay payment method is stored securely by Stripe. Your paid subscription starts after the trial unless you cancel beforehand.
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!hasStripeSubscription ? (
              <button onClick={() => void redirectFrom("/api/billing/create-checkout-session", "checkout")} disabled={busy !== null} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-60">
                {busy === "checkout" ? "Opening secure checkout..." : "Add card or Apple Pay"}
              </button>
            ) : (
              <button onClick={() => void redirectFrom("/api/billing/customer-portal", "portal")} disabled={busy !== null} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-60">
                {busy === "portal" ? "Opening billing portal..." : "Manage subscription"}
              </button>
            )}
            <button onClick={() => void load()} className="rounded-xl border border-slate-300 px-6 py-3 font-bold dark:border-slate-700">Refresh status</button>
            {(searchParams.get("setup") === "1" || searchParams.get("checkout") === "success") && hasStripeSubscription ? (
              <Link href="/onboarding" className="rounded-xl border border-emerald-700 px-6 py-3 font-black text-emerald-800 dark:text-emerald-200">Continue company setup</Link>
            ) : null}
          </div>
        </div>

        <aside className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">Professional includes</p>
          <ul className="mt-6 space-y-4 text-sm font-semibold text-slate-200">
            {["Customers, machines and jobs", "Quotes and invoicing", "Technician mobile workflow", "Offline field working", "GPS and signatures", "Service programmes"].map((item) => <li key={item} className="flex gap-3"><span className="text-emerald-400">✓</span>{item}</li>)}
          </ul>
          {billing.subscription.cancelAtPeriodEnd ? <p className="mt-8 rounded-xl bg-amber-400/10 p-4 text-sm font-semibold text-amber-200">Cancellation is scheduled for the end of the current billing period.</p> : null}
        </aside>
      </section>
    </div>
  );
}
