"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

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
  companyId: string;
};

type StartMode = "empty" | "sample" | "import" | null;
type ImportKind = "customers" | "machines";

const STEPS = ["Welcome", "Your Business", "Billing Setup", "Your Team", "Your Data", "Your First Job"] as const;
const SAMPLE_MARKER = "AGRICORE_SAMPLE_DATA";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function text(value: string | null | undefined) {
  return value ?? "";
}

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function rowObjects(csv: string) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.toLowerCase().trim().replace(/\s+/g, "_"));
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

export default function OnboardingWizard({ firstName, companyName, companyId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [payments, setPayments] = useState<PaymentSettings | null>(null);
  const [progress, setProgress] = useState<OnboardingRecord | null>(null);
  const [startMode, setStartMode] = useState<StartMode>(null);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [importKind, setImportKind] = useState<ImportKind>("customers");
  const [counts, setCounts] = useState({ customers: 0, machines: 0, jobs: 0 });

  const percent = useMemo(() => Math.round((step / STEPS.length) * 100), [step]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [companyResponse, paymentResponse, onboardingResponse, customersResult, machinesResult, jobsResult] = await Promise.all([
          fetch("/api/settings/company", { cache: "no-store" }),
          fetch("/api/settings/payments", { cache: "no-store" }),
          fetch("/api/platform/onboarding", { cache: "no-store" }),
          supabase.from("customers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
          supabase.from("machines").select("id", { count: "exact", head: true }).eq("company_id", companyId),
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", companyId),
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
          setCounts({ customers: customersResult.count ?? 0, machines: machinesResult.count ?? 0, jobs: jobsResult.count ?? 0 });
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load onboarding.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [companyId]);

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
    setError("");
    setSuccess("");
    await updateProgress({ currentStep: nextStep });
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/settings/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(company) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save company details.");
      setCompany(result.settings as CompanySettings);
      await updateProgress({ businessDetailsComplete: true, currentStep: 3 });
      setStep(3);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save company details."); }
    finally { setSaving(false); }
  }

  async function saveBilling(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company || !payments) return;
    setSaving(true); setError("");
    try {
      const [companyResponse, paymentResponse] = await Promise.all([
        fetch("/api/settings/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(company) }),
        fetch("/api/settings/payments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payments) }),
      ]);
      const companyResult = await companyResponse.json();
      const paymentResult = await paymentResponse.json();
      if (!companyResponse.ok) throw new Error(companyResult.error || "Unable to save invoice settings.");
      if (!paymentResponse.ok) throw new Error(paymentResult.error || "Unable to save payment settings.");
      setCompany(companyResult.settings as CompanySettings);
      setPayments(paymentResult.settings as PaymentSettings);
      await updateProgress({ invoiceSettingsComplete: true, paymentSettingsComplete: true, currentStep: 4 });
      setStep(4);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save billing setup."); }
    finally { setSaving(false); }
  }

  async function createSampleData() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const customerRows = Array.from({ length: 5 }, (_, index) => ({
        company_id: companyId,
        business_name: `Sample ${["Hill Farm", "Dairy Farm", "Contracting", "Estates", "Agri Services"][index]}`,
        contact_name: `Sample Contact ${index + 1}`,
        customer_type: index === 2 ? "Contractor" : "Farm",
        email: `sample-${index + 1}@example.invalid`,
        phone: `SAMPLE-${String(index + 1).padStart(3, "0")}`,
        address: `${index + 1} Sample Road`,
        postcode: `SAMPLE ${index + 1}`,
        notes: `${SAMPLE_MARKER} · Safe synthetic onboarding data.`,
      }));
      const { data: customers, error: customerError } = await supabase.from("customers").insert(customerRows).select("id,business_name");
      if (customerError) throw new Error(`Unable to add sample customers: ${customerError.message}`);
      if (!customers?.length) throw new Error("Sample customers were not created.");

      const templates = [
        ["New Holland", "T7.225", "Tractor"], ["John Deere", "6155R", "Tractor"], ["JCB", "542-70", "Telehandler"],
        ["Massey Ferguson", "7726", "Tractor"], ["Kuhn", "FC 3160", "Mower"], ["CLAAS", "Arion 650", "Tractor"],
        ["Case IH", "Puma 240", "Tractor"], ["Krone", "Comprima", "Baler"], ["Fendt", "724", "Tractor"], ["Kverneland", "Exacta", "Spreader"],
      ] as const;
      const machineRows = templates.map(([make, model, machineType], index) => ({
        company_id: companyId,
        customer_id: customers[index % customers.length].id,
        make, model, machine_type: machineType,
        year: 2017 + (index % 8),
        registration: `SAMPLE-${String(index + 1).padStart(3, "0")}`,
        serial_number: `SAMPLE-${make.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}-${10000 + index}`,
        hours: 900 + index * 620,
        usage_profile: index % 3 === 0 ? "heavy" : "medium",
        estimated_hours_per_week: 20 + (index % 5) * 5,
        notes: `${SAMPLE_MARKER} · Synthetic onboarding machine.`,
      }));
      const { data: machines, error: machineError } = await supabase.from("machines").insert(machineRows).select("id,customer_id,hours");
      if (machineError) throw new Error(`Unable to add sample machines: ${machineError.message}`);
      if (!machines?.length) throw new Error("Sample machines were not created.");

      const jobRows = Array.from({ length: 12 }, (_, index) => {
        const machine = machines[index % machines.length];
        const completed = index > 4;
        return {
          company_id: companyId,
          customer_id: machine.customer_id,
          machine_id: machine.id,
          engineer_name: `Sample Engineer ${1 + (index % 3)}`,
          priority: index === 0 ? "urgent" : index % 4 === 0 ? "high" : "normal",
          status: completed ? "completed" : index % 2 === 0 ? "in_progress" : "open",
          fault_reported: `[SAMPLE] ${["Annual service", "Hydraulic leak", "Air conditioning fault", "Electrical diagnostic", "PTO repair", "Pre-season inspection"][index % 6]}`,
          machine_hours: Number(machine.hours ?? 0) + index * 8,
          opened_date: new Date(Date.now() - (14 - index) * 86400000).toISOString().slice(0, 10),
          completed_date: completed ? new Date(Date.now() - (8 - Math.min(index - 5, 7)) * 86400000).toISOString().slice(0, 10) : null,
        };
      });
      const { error: jobError } = await supabase.from("jobs").insert(jobRows);
      if (jobError) throw new Error(`Unable to add sample jobs: ${jobError.message}`);

      setCounts({ customers: customers.length, machines: machines.length, jobs: jobRows.length });
      setSampleLoaded(true);
      setStartMode("sample");
      setSuccess("Sample data added. You can explore AgriCore now and remove the sample records later.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load sample data.");
    } finally { setSaving(false); }
  }

  async function removeSampleData() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const { data: sampleCustomers, error: customerLookupError } = await supabase.from("customers").select("id").eq("company_id", companyId).like("notes", `${SAMPLE_MARKER}%`);
      if (customerLookupError) throw new Error(customerLookupError.message);
      const customerIds = (sampleCustomers ?? []).map((row) => row.id);
      const { data: sampleMachines, error: machineLookupError } = await supabase.from("machines").select("id").eq("company_id", companyId).like("notes", `${SAMPLE_MARKER}%`);
      if (machineLookupError) throw new Error(machineLookupError.message);
      const machineIds = (sampleMachines ?? []).map((row) => row.id);

      if (customerIds.length) {
        const { error: jobsError } = await supabase.from("jobs").delete().eq("company_id", companyId).in("customer_id", customerIds).like("fault_reported", "[SAMPLE]%");
        if (jobsError) throw new Error(`Unable to remove sample jobs: ${jobsError.message}`);
      }
      if (machineIds.length) {
        const { error: machinesError } = await supabase.from("machines").delete().eq("company_id", companyId).in("id", machineIds);
        if (machinesError) throw new Error(`Unable to remove sample machines: ${machinesError.message}`);
      }
      if (customerIds.length) {
        const { error: customersError } = await supabase.from("customers").delete().eq("company_id", companyId).in("id", customerIds);
        if (customersError) throw new Error(`Unable to remove sample customers: ${customersError.message}`);
      }
      setCounts({ customers: 0, machines: 0, jobs: 0 });
      setSampleLoaded(false);
      setSuccess("Sample onboarding data removed.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to remove sample data."); }
    finally { setSaving(false); }
  }

  async function importCsv(file: File) {
    setSaving(true); setError(""); setSuccess("");
    try {
      const objects = rowObjects(await file.text());
      if (!objects.length) throw new Error("The CSV contains no data rows.");

      if (importKind === "customers") {
        const payload = objects.map((row) => ({
          company_id: companyId,
          business_name: String(row.business_name || row.company || "").trim(),
          contact_name: String(row.contact_name || row.contact || "").trim(),
          customer_type: String(row.customer_type || "Farm").trim(),
          phone: String(row.phone || "").trim(), email: String(row.email || "").trim(), address: String(row.address || "").trim(),
          postcode: String(row.postcode || "").trim(), vat_number: String(row.vat_number || "").trim(), notes: String(row.notes || "").trim(),
        })).filter((row) => row.business_name && row.contact_name);
        if (!payload.length) throw new Error("Customer CSV requires business_name and contact_name columns.");
        const { error: importError } = await supabase.from("customers").insert(payload);
        if (importError) throw new Error(importError.message);
        setCounts((current) => ({ ...current, customers: current.customers + payload.length }));
        setSuccess(`${payload.length} customers imported successfully.`);
      } else {
        const { data: existingCustomers, error: lookupError } = await supabase.from("customers").select("id,business_name").eq("company_id", companyId);
        if (lookupError) throw new Error(lookupError.message);
        const byName = new Map((existingCustomers ?? []).map((customer) => [String(customer.business_name ?? "").trim().toLowerCase(), customer.id]));
        const payload = objects.map((row) => {
          const customerName = String(row.customer_business_name || row.customer || "").trim().toLowerCase();
          return {
            company_id: companyId,
            customer_id: byName.get(customerName) ?? null,
            make: String(row.make || "").trim(), model: String(row.model || "").trim(), machine_type: String(row.machine_type || "Other").trim(),
            year: row.year ? Number(row.year) : null, registration: String(row.registration || "").trim(), serial_number: String(row.serial_number || "").trim(),
            hours: row.hours ? Number(row.hours) : null, usage_profile: ["light", "medium", "heavy"].includes(String(row.usage_profile)) ? String(row.usage_profile) : "medium",
            estimated_hours_per_week: row.estimated_hours_per_week ? Number(row.estimated_hours_per_week) : 25,
          };
        }).filter((row) => row.customer_id && row.make && row.model);
        if (!payload.length) throw new Error("Machine CSV requires customer_business_name, make and model. The customer must already exist in AgriCore.");
        const { error: importError } = await supabase.from("machines").insert(payload);
        if (importError) throw new Error(importError.message);
        setCounts((current) => ({ ...current, machines: current.machines + payload.length }));
        setSuccess(`${payload.length} machines imported successfully.`);
      }
      setStartMode("import");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to import CSV."); }
    finally { setSaving(false); }
  }

  async function finishSetup(force = false) {
    setSaving(true); setError("");
    try {
      const essentialsComplete = counts.customers > 0 && counts.machines > 0 && counts.jobs > 0;
      if (!essentialsComplete && !force) {
        setError("Add at least one customer, machine and job, or choose Finish later to continue without them.");
        return;
      }
      await updateProgress({ completed: essentialsComplete, currentStep: 6 });
      router.replace(essentialsComplete ? "/dashboard?tour=1" : "/dashboard");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to finish onboarding."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="rounded-3xl bg-white p-8 shadow-xl dark:bg-slate-900">Preparing your company setup…</div>;

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-fit rounded-3xl bg-emerald-950 p-6 text-white shadow-xl lg:sticky lg:top-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">AgriCore Setup Assistant</p>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-white">Step {step} of {STEPS.length}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-200">About 3–5 minutes in total</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-emerald-100">{percent}%</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${percent}%` }} /></div>
        <ol className="mt-7 space-y-2">
          {STEPS.map((label, index) => {
            const number = index + 1;
            const active = number === step;
            const complete = number < step || Boolean(progress?.completed_at);
            return <li key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${active ? "bg-white text-emerald-950" : "text-emerald-100"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${complete ? "bg-emerald-400 text-emerald-950" : active ? "bg-emerald-700 text-white" : "bg-white/10"}`}>{complete ? "✓" : number}</span>{label}</li>;
          })}
        </ol>
        <div className="mt-7 space-y-2 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-emerald-100"><p><span className="font-black text-white">✓ Autosaves automatically</span></p><p>✓ Resume at any time</p><p>✓ Guided every step of the way</p></div>
      </aside>

      <section className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900 sm:p-9">
        {error ? <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}
        {success ? <p className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{success}</p> : null}

        {step === 1 ? <div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">Setup Assistant · 3–5 minutes</div><h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Welcome to AgriCore</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">Let&apos;s get <span className="font-black text-slate-900 dark:text-white">{companyName}</span> ready for customers, machines and jobs. AgriCore will guide you through the essentials and save your progress as you go.</p><div className="mt-8 grid gap-4 sm:grid-cols-3">{[["🏢", "Business Setup", "Confirm your company and invoice essentials"], ["📂", "Import or Explore", "Start clean, import data or load safe samples"], ["🔧", "Start Working", "Create your first customer, machine and job"]].map(([icon, title, body]) => <div key={title} className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-emerald-950 dark:from-emerald-950/30 dark:to-slate-900"><span className="text-2xl" aria-hidden="true">{icon}</span><p className="mt-3 font-black text-slate-950 dark:text-white">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p></div>)}</div><div className="mt-8 flex flex-wrap items-center gap-4"><button onClick={() => void moveTo(2)} className="rounded-xl bg-emerald-700 px-7 py-3.5 font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-lg">Let&apos;s Get Started →</button><div className="text-sm leading-6 text-slate-500 dark:text-slate-400"><span className="font-bold text-slate-700 dark:text-slate-200">No rush.</span> You can leave and resume at any time.</div></div></div> : null}

        {step === 2 && company ? <form onSubmit={saveBusiness} className="space-y-5"><header><p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Your Business</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Tell AgriCore about your business</h1><p className="mt-2 text-slate-600 dark:text-slate-300">UK regional defaults are already applied. You can change country, currency and tax settings later.</p></header><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Company name</span><input required className={inputClass} value={company.company_name} onChange={(event) => setCompany({ ...company, company_name: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Phone</span><input className={inputClass} value={text(company.phone)} onChange={(event) => setCompany({ ...company, phone: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Email</span><input type="email" className={inputClass} value={text(company.email)} onChange={(event) => setCompany({ ...company, email: event.target.value })} /></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Address</span><input className={inputClass} value={text(company.address_line_1)} onChange={(event) => setCompany({ ...company, address_line_1: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Town / city</span><input className={inputClass} value={text(company.town_city)} onChange={(event) => setCompany({ ...company, town_city: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Postcode</span><input className={inputClass} value={text(company.postcode)} onChange={(event) => setCompany({ ...company, postcode: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">VAT / tax number</span><input className={inputClass} value={text(company.vat_number)} onChange={(event) => setCompany({ ...company, vat_number: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Company registration</span><input className={inputClass} value={text(company.company_registration)} onChange={(event) => setCompany({ ...company, company_registration: event.target.value })} /></label></div><div className="flex justify-between gap-3"><button type="button" onClick={() => void moveTo(1)} className="rounded-xl border px-5 py-3 font-bold">Back</button><button disabled={saving} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving…" : "Save & continue"}</button></div></form> : null}

        {step === 3 && company && payments ? <form onSubmit={saveBilling} className="space-y-5"><header><p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Billing setup</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Set the basics once</h1><p className="mt-2 text-slate-600 dark:text-slate-300">These settings apply to the invoices your business sends to its own customers. Your AgriCore subscription is managed separately.</p></header><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-bold">Payment terms (days)</span><input type="number" min="0" className={inputClass} value={company.payment_terms_days ?? 7} onChange={(event) => setCompany({ ...company, payment_terms_days: Number(event.target.value) })} /></label><label><span className="mb-2 block text-sm font-bold">Customer payment method</span><select className={inputClass} value={payments.provider} onChange={(event) => setPayments({ ...payments, provider: event.target.value as PaymentSettings["provider"] })}><option value="none">Set later</option><option value="bank_transfer">Bank transfer</option><option value="revolut">Revolut Business</option></select></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Invoice footer</span><textarea rows={3} className={inputClass} value={text(company.invoice_footer)} onChange={(event) => setCompany({ ...company, invoice_footer: event.target.value })} placeholder="Thank you for your business." /></label>{payments.provider === "bank_transfer" ? <><label><span className="mb-2 block text-sm font-bold">Account name</span><input className={inputClass} value={text(payments.account_name)} onChange={(event) => setPayments({ ...payments, account_name: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Bank name</span><input className={inputClass} value={text(payments.bank_name)} onChange={(event) => setPayments({ ...payments, bank_name: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Sort code</span><input className={inputClass} value={text(payments.sort_code)} onChange={(event) => setPayments({ ...payments, sort_code: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Account number</span><input className={inputClass} value={text(payments.account_number)} onChange={(event) => setPayments({ ...payments, account_number: event.target.value })} /></label></> : null}</div><div className="flex justify-between gap-3"><button type="button" onClick={() => void moveTo(2)} className="rounded-xl border px-5 py-3 font-bold">Back</button><button disabled={saving} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving…" : "Save & continue"}</button></div></form> : null}

        {step === 4 ? <div><p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Your Team</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Who&apos;s working with you?</h1><p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">Invite office users or technicians now, or skip this completely if you work alone.</p><div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30"><h2 className="text-lg font-black text-slate-950 dark:text-white">Team management is ready</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">User roles and permissions remain company-specific, so each person only sees what you give them access to.</p><Link target="_blank" href="/administration/users" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">Invite team</Link></div><div className="mt-7 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => void moveTo(3)} className="rounded-xl border px-5 py-3 font-bold">Back</button><div className="flex gap-3"><button type="button" onClick={() => void updateProgress({ teamSetupComplete: false, currentStep: 5 }).then(() => setStep(5))} className="rounded-xl border px-5 py-3 font-bold">Skip for now</button><button type="button" onClick={() => void updateProgress({ teamSetupComplete: true, currentStep: 5 }).then(() => setStep(5))} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white">Team added</button></div></div></div> : null}

        {step === 5 ? <div><p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Your Data</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">How would you like to start?</h1><p className="mt-3 text-slate-600 dark:text-slate-300">You can start clean, import existing records, or load a small synthetic sample that is safe to delete later.</p><div className="mt-7 grid gap-4 lg:grid-cols-3"><button type="button" onClick={() => { setStartMode("empty"); setSuccess("You'll start with a clean workspace."); }} className={`rounded-2xl border p-5 text-left ${startMode === "empty" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700"}`}><p className="font-black text-slate-950 dark:text-white">Start empty</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Best if you want to enter real data from day one.</p></button><button type="button" disabled={saving || sampleLoaded} onClick={() => void createSampleData()} className={`rounded-2xl border p-5 text-left disabled:opacity-60 ${startMode === "sample" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700"}`}><p className="font-black text-slate-950 dark:text-white">Explore sample data ⭐</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Adds 5 sample customers, 10 machines and 12 jobs. Clearly synthetic and removable.</p></button><button type="button" onClick={() => setStartMode("import")} className={`rounded-2xl border p-5 text-left ${startMode === "import" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700"}`}><p className="font-black text-slate-950 dark:text-white">Import existing data</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Bring customers or machines across from a CSV export.</p></button></div>{sampleLoaded ? <button type="button" disabled={saving} onClick={() => void removeSampleData()} className="mt-4 text-sm font-black text-red-700 hover:text-red-800 dark:text-red-400">Remove sample data</button> : null}{startMode === "import" ? <div className="mt-6 rounded-2xl border border-slate-200 p-5 dark:border-slate-700"><div className="flex flex-wrap items-end gap-4"><label className="min-w-[180px]"><span className="mb-2 block text-sm font-bold">Import type</span><select className={inputClass} value={importKind} onChange={(event) => setImportKind(event.target.value as ImportKind)}><option value="customers">Customers</option><option value="machines">Machines</option></select></label><label className="flex-1"><span className="mb-2 block text-sm font-bold">CSV file</span><input type="file" accept=".csv,text/csv" className={inputClass} disabled={saving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} /></label></div><p className="mt-3 text-xs leading-5 text-slate-500">Customer columns: business_name, contact_name, customer_type, phone, email, address, postcode, vat_number, notes. Machine columns: customer_business_name, make, model, machine_type, year, registration, serial_number, hours, usage_profile.</p></div> : null}<div className="mt-7 flex justify-between gap-3"><button type="button" onClick={() => void moveTo(4)} className="rounded-xl border px-5 py-3 font-bold">Back</button><button type="button" disabled={!startMode || saving} onClick={() => void moveTo(6)} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-50">Continue</button></div></div> : null}

        {step === 6 ? <div><p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Your First Job</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">You&apos;re nearly ready.</h1><p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">Create your first real customer, machine and job. If you loaded sample data, these are already complete and you can explore immediately.</p><div className="mt-7 grid gap-3 sm:grid-cols-3">{[["Customer", counts.customers, "/customers"], ["Machine", counts.machines, "/machines"], ["Job", counts.jobs, "/jobs/new"]].map(([label, count, href]) => <Link key={String(label)} href={String(href)} target="_blank" className="rounded-2xl border border-slate-200 p-5 hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:hover:bg-emerald-950/20"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${Number(count) > 0 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{Number(count) > 0 ? "✓" : "+"}</span><p className="mt-3 font-black text-slate-950 dark:text-white">First {label}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{Number(count) > 0 ? `${count} currently in AgriCore` : `Open ${String(label).toLowerCase()} setup`}</p></Link>)}</div><p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">If you add records in a new tab, refresh this onboarding page to update the ticks. The dashboard will also keep a setup checklist until the essentials are complete.</p><div className="mt-8 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => void moveTo(5)} className="rounded-xl border px-5 py-3 font-bold">Back</button><div className="flex flex-wrap gap-3"><button type="button" disabled={saving} onClick={() => void finishSetup(true)} className="rounded-xl border border-slate-300 px-5 py-3 font-bold dark:border-slate-700">Finish later</button><button type="button" disabled={saving} onClick={() => void finishSetup(false)} className="rounded-xl bg-emerald-700 px-7 py-3 font-black text-white disabled:opacity-60">{saving ? "Opening AgriCore…" : "You&apos;re Ready — Take the Tour →"}</button></div></div></div> : null}
      </section>
    </div>
  );
}
