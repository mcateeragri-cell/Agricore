"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { formatCurrency, formatDate, type RegionalSettings } from "@/lib/regional-settings";
import { planPolicy } from "@/lib/platform/plan-policy";

type PaymentMethod = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
} | null;

type PublicPlan = { id:string; name:string; slug:string; monthlyPrice:number; yearlyPrice:number; trialDays:number; maxUsers:number; maxStorageGb:number; currencyCode:string; stripeMonthlyPriceId:string|null };

type BillingResponse = {
  billing?: {
    companyName: string;
    billingMode: "subscription" | "internal" | "demo";
    regional: RegionalSettings;
    plan: {
      name: string;
      slug: string;
      monthlyPrice: number;
      trialDays: number;
      maxUsers: number;
      maxStorageGb: number;
      currencyCode: string;
    };
    usage: { users: number; customers: number; machines: number; jobs: number; aiRequestsThisMonth: number };
    subscription: {
      status: string;
      trialEndsAt: string | null;
      currentPeriodEndsAt: string | null;
      cancelAtPeriodEnd: boolean;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      lastInvoiceStatus: string | null;
      lastPaymentAt: string | null;
      paymentFailedAt: string | null;
      graceEndsAt: string | null;
      lastStripeSyncAt: string | null;
    };
  };
  paymentMethod?: PaymentMethod;
  plans?: PublicPlan[];
  trialDaysRemaining?: number;
  error?: string;
};

type BillingInvoice = {
  id: string;
  number: string | null;
  createdAt: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

type HistoryResponse = { invoices?: BillingInvoice[]; error?: string };

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cardLabel(method: PaymentMethod) {
  if (!method) return "Not added";
  const brand = titleCase(method.brand);
  return `${brand} •••• ${method.last4}`;
}

export default function BillingCentre() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<BillingResponse | null>(null);
  const [history, setHistory] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [statusResponse, historyResponse] = await Promise.all([
        fetch("/api/billing/status", { cache: "no-store" }),
        fetch("/api/billing/history", { cache: "no-store" }),
      ]);
      const statusResult = (await statusResponse.json()) as BillingResponse;
      const historyResult = (await historyResponse.json()) as HistoryResponse;
      if (!statusResponse.ok) throw new Error(statusResult.error || "Unable to load billing.");
      if (!historyResponse.ok) throw new Error(historyResult.error || "Unable to load billing history.");
      setData(statusResult);
      setHistory(historyResult.invoices ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load billing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const statusLabel = useMemo(
    () => titleCase(data?.billing?.subscription.status ?? "trial"),
    [data],
  );

  async function redirectFrom(endpoint: string, kind: "checkout" | "portal", body?: Record<string, unknown>) {
    setBusy(kind);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to continue.");
      window.location.assign(result.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
      setBusy(null);
    }
  }


  async function upgradePlan(planSlug: string) {
    if (!window.confirm(`Upgrade AgriCore to ${planSlug === "professional" ? "Professional" : "Enterprise"}? Stripe will apply the plan change and any applicable proration immediately.`)) return;
    setBusy(`upgrade-${planSlug}`);
    setError("");
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upgrade_plan", planSlug }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to upgrade subscription.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upgrade subscription.");
    } finally {
      setBusy(null);
    }
  }

  async function subscriptionAction(action: "cancel_at_period_end" | "reactivate") {
    const isCancel = action === "cancel_at_period_end";
    if (isCancel && !window.confirm("Cancel AgriCore at the end of the current billing period? You will keep access until then.")) return;

    setBusy(isCancel ? "cancel" : "reactivate");
    setError("");
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update subscription.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update subscription.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">Loading billing…</div>;
  }

  const billing = data?.billing;
  if (!billing) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">{error || "Billing is unavailable."}</div>;
  }

  const hasStripeSubscription = Boolean(billing.subscription.stripeSubscriptionId);
  const nextDate = billing.subscription.status === "trial"
    ? billing.subscription.trialEndsAt
    : billing.subscription.currentPeriodEndsAt;
  const regional = billing.regional;
  const paymentMethod = data?.paymentMethod ?? null;
  const paymentProblem = billing.subscription.status === "suspended" || Boolean(billing.subscription.paymentFailedAt);

  if (billing.billingMode !== "subscription") {
    const isInternal = billing.billingMode === "internal";
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">{isInternal ? "AgriCore internal licence" : "Demo workspace"}</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{billing.companyName}</h2>
              <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
                {isInternal
                  ? "This company is platform-owned and has permanent AgriCore access. No subscription, trial expiry or Stripe payment is required."
                  : "This synthetic demo workspace has full presentation access and is excluded from subscription billing."}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {isInternal ? "Lifetime access" : "Billing exempt"}
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-500">Access</p>
              <p className="mt-2 text-xl font-black">Full</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-500">Subscription charge</p>
              <p className="mt-2 text-xl font-black">{formatCurrency(0, regional)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-500">Users</p>
              <p className="mt-2 text-xl font-black">{billing.usage.users}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
            {isInternal
              ? "Stripe checkout, payment-failure enforcement and trial lockout are disabled for this company. Normal customer companies continue to use the standard subscription lifecycle."
              : "Demo companies remain isolated from Stripe and can be regenerated or deleted from Platform → Demo workspaces."}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {searchParams.get("checkout") === "success" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          Payment method saved. AgriCore is syncing your Stripe subscription now.
        </div>
      ) : null}
      {searchParams.get("checkout") === "cancelled" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Secure checkout was cancelled. Your trial remains unchanged.
        </div>
      ) : null}
      {paymentProblem ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          <strong>Payment needs attention.</strong> Open the secure billing portal to update your payment method. {billing.subscription.graceEndsAt ? `Grace period ends ${formatDate(billing.subscription.graceEndsAt, regional)}.` : ""}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl bg-red-50 px-5 py-4 font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Current subscription</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{billing.plan.name}</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                {formatCurrency(billing.plan.monthlyPrice, { ...regional, currency_code: billing.plan.currencyCode })} + {regional.tax_name} per month
              </p>
            </div>
            <span className={`rounded-full px-4 py-2 text-sm font-black ${paymentProblem ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"}`}>{statusLabel}</span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-500">Trial remaining</p>
              <p className="mt-2 text-2xl font-black">{billing.subscription.status === "trial" ? `${data?.trialDaysRemaining ?? 0} days` : "Complete"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-500">Next billing date</p>
              <p className="mt-2 text-base font-black">{nextDate ? formatDate(nextDate, regional, { day: "numeric", month: "long", year: "numeric" }) : "Not available"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-500">Payment method</p>
              <p className="mt-2 text-base font-black">{cardLabel(paymentMethod)}</p>
              {paymentMethod ? <p className="mt-1 text-xs font-semibold text-slate-500">Expires {String(paymentMethod.expMonth).padStart(2, "0")}/{String(paymentMethod.expYear).slice(-2)}</p> : null}
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-500">Users</p>
              <p className="mt-2 text-2xl font-black">{billing.usage.users}{billing.plan.maxUsers > 0 && billing.plan.maxUsers < 9000 ? ` / ${billing.plan.maxUsers}` : ""}</p>
            </div>
          </div>

          {!hasStripeSubscription ? (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              <strong>{formatCurrency(0, { ...regional, currency_code: billing.plan.currencyCode })} is charged today.</strong> Your card or Apple Pay payment method is stored securely by Stripe. Your paid subscription starts after the 14-day trial unless you cancel beforehand.
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {!hasStripeSubscription ? (
              <button onClick={() => void redirectFrom("/api/billing/create-checkout-session", "checkout", { planSlug: billing.plan.slug })} disabled={busy !== null} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-60">
                {busy === "checkout" ? "Opening secure checkout…" : "Add card or Apple Pay"}
              </button>
            ) : (
              <button onClick={() => void redirectFrom("/api/billing/customer-portal", "portal")} disabled={busy !== null} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-60">
                {busy === "portal" ? "Opening billing portal…" : "Manage card & invoices"}
              </button>
            )}
            <button onClick={() => void load()} disabled={busy !== null} className="rounded-xl border border-slate-300 px-6 py-3 font-bold dark:border-slate-700">Refresh status</button>
            {hasStripeSubscription && !billing.subscription.cancelAtPeriodEnd ? (
              <button onClick={() => void subscriptionAction("cancel_at_period_end")} disabled={busy !== null} className="rounded-xl border border-red-300 px-6 py-3 font-bold text-red-700 dark:border-red-900 dark:text-red-300">
                {busy === "cancel" ? "Scheduling…" : "Cancel at period end"}
              </button>
            ) : null}
            {hasStripeSubscription && billing.subscription.cancelAtPeriodEnd ? (
              <button onClick={() => void subscriptionAction("reactivate")} disabled={busy !== null} className="rounded-xl border border-emerald-700 px-6 py-3 font-black text-emerald-800 dark:text-emerald-200">
                {busy === "reactivate" ? "Reactivating…" : "Keep subscription"}
              </button>
            ) : null}
            {(searchParams.get("setup") === "1" || searchParams.get("checkout") === "success") && hasStripeSubscription ? (
              <Link href="/onboarding" className="rounded-xl border border-emerald-700 px-6 py-3 font-black text-emerald-800 dark:text-emerald-200">Continue company setup</Link>
            ) : null}
          </div>
        </div>

        <aside className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">{billing.plan.name} includes</p>
          <ul className="mt-6 space-y-4 text-sm font-semibold text-slate-200">
            {(billing.plan.slug === "starter" ? ["Customers, machines and jobs","Quotes and invoicing","Calendar and service programmes","Basic stock workflow","Limited AI Workshop Assistant"] : billing.plan.slug === "enterprise" ? ["Everything in Professional","Financial Control","Purchase ledger & bank reconciliation","Accountant workspace","Enterprise dealer capabilities","API access and priority support"] : ["Customers, machines and jobs", "Quotes and invoicing", "Reports and Stock Pro", "Technician Pro mobile workflow", "Offline field working", "GPS, photos and signatures", "Service programmes", "AI Workshop Assistant & Atlas Intelligence"]).map((item) => (
              <li key={item} className="flex gap-3"><span className="text-emerald-400">✓</span>{item}</li>
            ))}
          </ul>
          {billing.subscription.cancelAtPeriodEnd ? (
            <p className="mt-8 rounded-xl bg-amber-400/10 p-4 text-sm font-semibold text-amber-200">Cancellation is scheduled for the end of the current billing period. Choose Keep subscription to reverse it before then.</p>
          ) : null}
        </aside>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Usage</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Your AgriCore workspace</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Team members", billing.usage.users, billing.plan.maxUsers > 0 && billing.plan.maxUsers < 9000 ? billing.plan.maxUsers : null],
            ["Customers", billing.usage.customers, null],
            ["Machines", billing.usage.machines, null],
            ["Jobs", billing.usage.jobs, null],
            ["AI this month", billing.usage.aiRequestsThisMonth, planPolicy(billing.plan.slug).aiDiagnosticsPerMonth],
          ].map(([label,value,limit]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950"><p className="text-xs font-bold uppercase text-slate-500">{String(label)}</p><p className="mt-2 text-2xl font-black">{Number(value).toLocaleString()}{limit ? ` / ${Number(limit).toLocaleString()}` : ""}</p></div>)}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Plans</p><h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Grow when you need to</h2></div><Link href="/pricing" className="text-sm font-black text-emerald-700 dark:text-emerald-300">Full comparison →</Link></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {(data?.plans ?? []).map((plan, index, plans) => {
            const current = plan.slug === billing.plan.slug;
            const currentIndex = plans.findIndex((item) => item.slug === billing.plan.slug);
            const isNext = index === currentIndex + 1;
            const features = plan.slug === "starter" ? ["Core CRM & job workflow","Quotes, invoices & basic stock","Limited AI Workshop Assistant"] : plan.slug === "professional" ? ["Full workshop operations","Stock Pro, dispatch & field tools","Atlas Intelligence & higher AI usage"] : ["Everything in Professional","Financial Control & accountant workspace","Enterprise capabilities & API access"];
            return <article key={plan.slug} className={`rounded-3xl border p-6 ${current ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">{plan.name}</h3><p className="mt-2 text-3xl font-black">{formatCurrency(plan.monthlyPrice, { ...regional, currency_code: plan.currencyCode })}<span className="text-sm font-bold text-slate-500">/mo</span></p></div>{current ? <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-black text-white">Current</span> : null}</div><ul className="mt-5 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-emerald-600">✓</span>{feature}</li>)}</ul>{!hasStripeSubscription && !current ? <button onClick={() => void redirectFrom("/api/billing/create-checkout-session", "checkout", { planSlug: plan.slug })} disabled={busy !== null} className="mt-6 w-full rounded-xl bg-emerald-700 px-4 py-3 font-black text-white disabled:opacity-60">Choose {plan.name}</button> : null}{hasStripeSubscription && isNext ? <button onClick={() => void upgradePlan(plan.slug)} disabled={busy !== null} className="mt-6 w-full rounded-xl bg-emerald-700 px-4 py-3 font-black text-white disabled:opacity-60">{busy === `upgrade-${plan.slug}` ? "Upgrading…" : `Upgrade to ${plan.name}`}</button> : null}{hasStripeSubscription && index > currentIndex + 1 ? <p className="mt-6 text-xs font-semibold text-slate-500">Upgrade through {plans[currentIndex + 1]?.name ?? "the next plan"} first.</p> : null}</article>;
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Billing history</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Stripe invoices & receipts</h2>
          </div>
          {hasStripeSubscription ? <button onClick={() => void redirectFrom("/api/billing/customer-portal", "portal")} disabled={busy !== null} className="text-sm font-black text-emerald-700 dark:text-emerald-300">Open full billing portal →</button> : null}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Invoice</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Documents</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No Stripe invoices yet. Trial invoices will appear here when Stripe creates them.</td></tr>
              ) : history.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-3 py-4 font-semibold">{invoice.createdAt ? formatDate(invoice.createdAt, regional) : "—"}</td>
                  <td className="px-3 py-4">{invoice.number || invoice.id}</td>
                  <td className="px-3 py-4 font-black">{formatCurrency(invoice.amountDue || invoice.amountPaid, { ...regional, currency_code: invoice.currency })}</td>
                  <td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">{invoice.status}</span></td>
                  <td className="px-3 py-4">
                    <div className="flex gap-3">
                      {invoice.hostedInvoiceUrl ? <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="font-bold text-emerald-700 dark:text-emerald-300">View</a> : null}
                      {invoice.invoicePdf ? <a href={invoice.invoicePdf} target="_blank" rel="noreferrer" className="font-bold text-emerald-700 dark:text-emerald-300">PDF</a> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
