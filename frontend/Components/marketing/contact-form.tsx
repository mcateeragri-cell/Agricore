"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { trackMarketingEvent } from "@/lib/marketing/analytics";

export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const attribution = useMemo(() => {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    return {
      sourcePath: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer,
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = {
      enquiryType: form.get("enquiryType"),
      fullName: form.get("fullName"),
      companyName: form.get("companyName"),
      email: form.get("email"),
      phone: form.get("phone"),
      country: form.get("country"),
      teamSize: form.get("teamSize"),
      message: form.get("message"),
      website: form.get("website"),
      ...attribution,
    };

    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send your request.");
      trackMarketingEvent("demo_request_submitted", {
        enquiry_type: String(payload.enquiryType || "demo"),
        country: String(payload.country || ""),
        team_size: String(payload.teamSize || ""),
      });
      setSent(true);
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send your request.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-50">
        <CheckCircle2 className="h-9 w-9 text-emerald-700 dark:text-emerald-300" />
        <h2 className="mt-5 text-2xl font-black">Request received.</h2>
        <p className="mt-3 text-sm font-medium leading-6 text-emerald-900/75 dark:text-emerald-100/75">
          Your enquiry is now in the AgriCore launch inbox. We can use the details you supplied to tailor the conversation around your workshop or field-service operation.
        </p>
        <button type="button" onClick={() => setSent(false)} className="mt-6 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[2rem] border border-emerald-950/10 bg-white p-6 shadow-xl shadow-emerald-950/5 dark:border-white/10 dark:bg-slate-900 sm:p-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.17em] text-emerald-700 dark:text-emerald-300">Request a demo</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Tell us how your business works.</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">We will keep the conversation focused on the workflows that matter to your team.</p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Name
          <input required name="fullName" autoComplete="name" className="rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Business
          <input name="companyName" autoComplete="organization" className="rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Email
          <input required type="email" name="email" autoComplete="email" className="rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Phone <span className="font-medium text-slate-400">optional</span>
          <input name="phone" autoComplete="tel" className="rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Country / region
          <input name="country" autoComplete="country-name" className="rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Team size
          <select name="teamSize" defaultValue="" className="rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="">Select</option>
            <option value="1-2">1–2 people</option>
            <option value="3-5">3–5 people</option>
            <option value="6-10">6–10 people</option>
            <option value="11-25">11–25 people</option>
            <option value="26+">26+ people</option>
          </select>
        </label>
      </div>

      <label className="mt-4 grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
        What would you like to see?
        <textarea required name="message" rows={5} placeholder="For example: 4 field engineers, workshop + callouts, stock, machine service history and invoicing..." className="resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      </label>

      <select name="enquiryType" defaultValue="demo" className="sr-only" aria-label="Enquiry type"><option value="demo">Demo</option></select>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

      <button disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 font-black text-white shadow-lg shadow-emerald-950/10 transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        {busy ? "Sending…" : "Request demo"}
      </button>
      <p className="mt-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">No obligation. Your details are used to respond to this AgriCore enquiry.</p>
    </form>
  );
}
