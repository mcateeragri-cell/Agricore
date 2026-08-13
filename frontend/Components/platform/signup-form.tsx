"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

type SignupResponse = {
  success?: boolean;
  error?: string;
  confirmationRequired?: boolean;
  company?: { id: string; name: string; slug: string };
};

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = ["starter","professional","enterprise"].includes(searchParams.get("plan") || "") ? String(searchParams.get("plan")) : "professional";
  const planPrice = requestedPlan === "starter" ? 49 : requestedPlan === "enterprise" ? 225 : 89;
  const planName = requestedPlan === "starter" ? "Starter" : requestedPlan === "enterprise" ? "Enterprise" : "Professional";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const form = new FormData(event.currentTarget);
    const payload = {
      companyName: String(form.get("companyName") ?? "").trim(),
      fullName: String(form.get("fullName") ?? "").trim(),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      password: String(form.get("password") ?? ""),
      termsAccepted: form.get("termsAccepted") === "on",
      website: String(form.get("website") ?? ""),
      planSlug: requestedPlan,
    };

    try {
      const response = await fetch("/api/platform/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as SignupResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to create your account.");
      }

      if (result.confirmationRequired) {
        setSuccess(
          "Your company has been created. Check your email, confirm your address, then sign in to finish setup.",
        );
        event.currentTarget.reset();
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });
      if (loginError) throw loginError;

      if (result.company?.id) {
        await fetch("/api/auth/company-context", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId: result.company.id }),
        });
      }

      router.replace(`/settings/billing?setup=1&plan=${requestedPlan}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <input name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">Company name</span>
        <input name="companyName" type="text" autoComplete="organization" required maxLength={200} placeholder="Example Agricultural Services Ltd" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">Your full name</span>
        <input name="fullName" type="text" autoComplete="name" required maxLength={200} placeholder="Your name" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">Work email</span>
        <input name="email" type="email" autoComplete="email" required maxLength={320} placeholder="you@company.com" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">Password</span>
        <input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={200} required placeholder="At least 10 characters" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      </label>

      <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <input name="termsAccepted" type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-700" />
        <span>I agree to the AgriCore terms of service and privacy policy, and understand that the <strong>{planName}</strong> subscription at <strong>£{planPrice} + VAT per month</strong> will begin automatically after the 14-day free trial unless I cancel beforehand.</span>
      </label>

      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}
      {success ? <div className="rounded-xl bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><p>{success}</p><Link href="/login" className="mt-3 inline-block font-black underline">Continue to sign in</Link></div> : null}

      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-emerald-700 px-5 py-4 text-base font-black text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-60">
        {submitting ? "Creating your company..." : "Start free trial"}
      </button>
    </form>
  );
}
