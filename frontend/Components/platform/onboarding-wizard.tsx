"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CompanySettings = {
  company_name: string;
  contact_line: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  town_city: string | null;
  county: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  vat_number: string | null;
  company_registration: string | null;
  invoice_footer: string | null;
  payment_terms_days: number | null;
  primary_colour: string | null;
  secondary_colour: string | null;
};

type PaymentSettings = {
  provider: "none" | "bank_transfer" | "revolut";
  bank_name: string | null;
  account_name: string | null;
  sort_code: string | null;
  account_number: string | null;
  iban: string | null;
  bic: string | null;
  payment_instructions: string | null;
};

type OnboardingRecord = {
  current_step: number;
  business_details_complete: boolean;
  invoice_settings_complete: boolean;
  payment_settings_complete: boolean;
  team_setup_complete: boolean;
  completed_at: string | null;
};

type Props = {
  firstName: string;
  companyName: string;
};

const STEPS = [
  "Welcome",
  "Business details",
  "Invoices",
  "Payments",
  "Your team",
  "Finish",
] as const;

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function text(value: string | null | undefined) {
  return value ?? "";
}

export default function OnboardingWizard({ firstName, companyName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [payments, setPayments] = useState<PaymentSettings | null>(null);
  const [progress, setProgress] = useState<OnboardingRecord | null>(null);

  const percent = useMemo(() => Math.round(((step - 1) / 5) * 100), [step]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [companyResponse, paymentResponse, onboardingResponse] =
          await Promise.all([
            fetch("/api/settings/company", { cache: "no-store" }),
            fetch("/api/settings/payments", { cache: "no-store" }),
            fetch("/api/platform/onboarding", { cache: "no-store" }),
          ]);

        const companyResult = await companyResponse.json();
        const paymentResult = await paymentResponse.json();
        const onboardingResult = await onboardingResponse.json();

        if (!companyResponse.ok) throw new Error(companyResult.error || "Unable to load company settings.");
        if (!paymentResponse.ok) throw new Error(paymentResult.error || "Unable to load payment settings.");
        if (!onboardingResponse.ok) throw new Error(onboardingResult.error || "Unable to load onboarding progress.");

        if (!cancelled) {
          setCompany(companyResult.settings as CompanySettings);
          setPayments((paymentResult.settings ?? { provider: "none" }) as PaymentSettings);
          setProgress(onboardingResult.onboarding as OnboardingRecord);
          setStep(Math.max(1, Math.min(6, Number(onboardingResult.onboarding.current_step) || 1)));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load onboarding.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateProgress(update: Record<string, unknown>) {
    const response = await fetch("/api/platform/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to save onboarding progress.");
    setProgress(result.onboarding as OnboardingRecord);
  }

  async function moveTo(nextStep: number) {
    await updateProgress({ currentStep: nextStep });
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save company details.");
      setCompany(result.settings as CompanySettings);
      await updateProgress({ businessDetailsComplete: true, currentStep: 3 });
      setStep(3);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save company details.");
    } finally {
      setSaving(false);
    }
  }

  async function saveInvoices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save invoice settings.");
      setCompany(result.settings as CompanySettings);
      await updateProgress({ invoiceSettingsComplete: true, currentStep: 4 });
      setStep(4);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save invoice settings.");
    } finally {
      setSaving(false);
    }
  }

  async function savePayments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payments) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payments),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save payment settings.");
      setPayments(result.settings as PaymentSettings);
      await updateProgress({ paymentSettingsComplete: true, currentStep: 5 });
      setStep(5);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save payment settings.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    setSaving(true);
    setError("");
    try {
      await updateProgress({ completed: true, currentStep: 6 });
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to finish onboarding.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl bg-white p-8 shadow-xl dark:bg-slate-900">Loading your company setup...</div>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-3xl bg-emerald-950 p-6 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Setup progress</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <ol className="mt-7 space-y-3">
          {STEPS.map((label, index) => {
            const number = index + 1;
            const active = number === step;
            const complete = number < step || (number === 6 && Boolean(progress?.completed_at));
            return (
              <li key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold ${active ? "bg-white text-emerald-950" : "text-emerald-100"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${complete ? "bg-emerald-400 text-emerald-950" : active ? "bg-emerald-700 text-white" : "bg-white/10"}`}>
                  {complete ? "✓" : number}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900 sm:p-9">
        {error ? <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

        {step === 1 ? (
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Welcome to AgriCore</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Your workspace is ready, {firstName}.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">We created {companyName}, your administrator account and your 14-day Professional trial. This short setup will configure the essentials before your first live job.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {["Company details", "Invoices and payments", "Invite your team"].map((item) => <div key={item} className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">✓ {item}</div>)}
            </div>
            <button onClick={() => void moveTo(2)} className="mt-8 rounded-xl bg-emerald-700 px-6 py-3 font-black text-white hover:bg-emerald-800">Start setup</button>
          </div>
        ) : null}

        {step === 2 && company ? (
          <form onSubmit={saveBusiness} className="space-y-5">
            <header><p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Step 2</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Business details</h1><p className="mt-2 text-slate-600 dark:text-slate-300">These details appear on documents and customer communications.</p></header>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Company name</span><input required className={inputClass} value={company.company_name} onChange={(event) => setCompany({ ...company, company_name: event.target.value })} /></label>
              <label><span className="mb-2 block text-sm font-bold">Phone</span><input className={inputClass} value={text(company.phone)} onChange={(event) => setCompany({ ...company, phone: event.target.value })} /></label>
              <label><span className="mb-2 block text-sm font-bold">Email</span><input type="email" className={inputClass} value={text(company.email)} onChange={(event) => setCompany({ ...company, email: event.target.value })} /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Address</span><input className={inputClass} value={text(company.address_line_1)} onChange={(event) => setCompany({ ...company, address_line_1: event.target.value })} /></label>
              <label><span className="mb-2 block text-sm font-bold">Town or city</span><input className={inputClass} value={text(company.town_city)} onChange={(event) => setCompany({ ...company, town_city: event.target.value })} /></label>
              <label><span className="mb-2 block text-sm font-bold">Postcode</span><input className={inputClass} value={text(company.postcode)} onChange={(event) => setCompany({ ...company, postcode: event.target.value })} /></label>
              <label><span className="mb-2 block text-sm font-bold">VAT number</span><input className={inputClass} value={text(company.vat_number)} onChange={(event) => setCompany({ ...company, vat_number: event.target.value })} /></label>
              <label><span className="mb-2 block text-sm font-bold">Company registration</span><input className={inputClass} value={text(company.company_registration)} onChange={(event) => setCompany({ ...company, company_registration: event.target.value })} /></label>
            </div>
            <div className="flex justify-between gap-3"><button type="button" onClick={() => void moveTo(1)} className="rounded-xl border px-5 py-3 font-bold">Back</button><button disabled={saving} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button></div>
          </form>
        ) : null}

        {step === 3 && company ? (
          <form onSubmit={saveInvoices} className="space-y-5">
            <header><p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Step 3</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Invoice setup</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Set your default payment terms and invoice footer.</p></header>
            <label><span className="mb-2 block text-sm font-bold">Payment terms (days)</span><input type="number" min="0" className={inputClass} value={company.payment_terms_days ?? 7} onChange={(event) => setCompany({ ...company, payment_terms_days: Number(event.target.value) })} /></label>
            <label><span className="mb-2 block text-sm font-bold">Invoice footer</span><textarea rows={4} className={inputClass} value={text(company.invoice_footer)} onChange={(event) => setCompany({ ...company, invoice_footer: event.target.value })} placeholder="Thank you for your business." /></label>
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">Your logo, colours and detailed invoice branding can be refined later in Company Settings.</p>
            <div className="flex justify-between gap-3"><button type="button" onClick={() => void moveTo(2)} className="rounded-xl border px-5 py-3 font-bold">Back</button><button disabled={saving} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button></div>
          </form>
        ) : null}

        {step === 4 && payments ? (
          <form onSubmit={savePayments} className="space-y-5">
            <header><p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Step 4</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">How do customers pay you?</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Choose a default. Revolut credentials can be added securely later in Company Settings.</p></header>
            <label><span className="mb-2 block text-sm font-bold">Payment method</span><select className={inputClass} value={payments.provider} onChange={(event) => setPayments({ ...payments, provider: event.target.value as PaymentSettings["provider"] })}><option value="none">No online payment method</option><option value="bank_transfer">Bank transfer</option><option value="revolut">Revolut Business</option></select></label>
            {payments.provider !== "none" ? <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-bold">Bank name</span><input className={inputClass} value={text(payments.bank_name)} onChange={(event) => setPayments({ ...payments, bank_name: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Account name</span><input className={inputClass} value={text(payments.account_name)} onChange={(event) => setPayments({ ...payments, account_name: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Sort code</span><input className={inputClass} value={text(payments.sort_code)} onChange={(event) => setPayments({ ...payments, sort_code: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Account number</span><input className={inputClass} value={text(payments.account_number)} onChange={(event) => setPayments({ ...payments, account_number: event.target.value })} /></label></div> : null}
            <div className="flex justify-between gap-3"><button type="button" onClick={() => void moveTo(3)} className="rounded-xl border px-5 py-3 font-bold">Back</button><button disabled={saving} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button></div>
          </form>
        ) : null}

        {step === 5 ? (
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Step 5</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Invite your team</h1><p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">Add office staff, service managers, technicians and apprentices. You can skip this and invite them later.</p>
            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30"><h2 className="text-lg font-black">User management is ready</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Open the Users page in a new tab to add staff now. Return here when finished.</p><Link target="_blank" href="/administration/users" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">Open Users</Link></div>
            <div className="mt-7 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => void moveTo(4)} className="rounded-xl border px-5 py-3 font-bold">Back</button><div className="flex gap-3"><button type="button" onClick={() => void updateProgress({ teamSetupComplete: false, currentStep: 6 }).then(() => setStep(6))} className="rounded-xl border px-5 py-3 font-bold">Skip for now</button><button type="button" onClick={() => void updateProgress({ teamSetupComplete: true, currentStep: 6 }).then(() => setStep(6))} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white">Team added</button></div></div>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-800">✓</div><p className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Setup complete</p><h1 className="mt-2 text-4xl font-black text-slate-950 dark:text-white">You&apos;re ready to use AgriCore.</h1><p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">Start by adding your first customer, machine or job. You can return to Company Settings at any time to refine your branding and payment integrations.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><button disabled={saving} onClick={() => void finish()} className="rounded-xl bg-emerald-700 px-7 py-3 font-black text-white disabled:opacity-60">{saving ? "Opening AgriCore..." : "Open dashboard"}</button><Link href="/jobs/new" className="rounded-xl border border-slate-300 px-7 py-3 font-black text-slate-800 dark:border-slate-700 dark:text-white">Create first job</Link></div></div>
        ) : null}
      </section>
    </div>
  );
}
