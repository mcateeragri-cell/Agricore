"use client";

import FieldRolePageGate from "@/Components/auth/field-role-page-gate";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadActiveCompany } from "@/lib/company-context-client";
import { supabase } from "@/lib/supabase";
import Card from "../../../Components/ui/Card";

type Customer = {
  id: string;
  contactName: string;
  businessName: string;
};

type Machine = {
  id: string;
  customerId: string;
  make: string;
  model: string;
  registration: string;
  serialNumber: string;
  hours: number | null;
};

type Engineer = {
  userId: string;
  fullName: string;
};

const emptyQuickCustomer = {
  businessName: "",
  contactName: "",
  phone: "",
  email: "",
};

const emptyQuickMachine = {
  make: "",
  model: "",
  machineType: "Tractor",
  registration: "",
  serialNumber: "",
  hours: "",
};

function NewJobPageContent() {
  const router = useRouter();

  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [engineerName, setEngineerName] = useState("");
  const [priority, setPriority] = useState("normal");
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [faultReported, setFaultReported] = useState("");
  const [machineHours, setMachineHours] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [showMachineDrawer, setShowMachineDrawer] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState(emptyQuickCustomer);
  const [quickMachine, setQuickMachine] = useState(emptyQuickMachine);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savingMachine, setSavingMachine] = useState(false);
  const [drawerError, setDrawerError] = useState("");

  useEffect(() => {
    async function loadFormData() {
      setLoadingData(true);
      setErrorMessage("");

      try {
        const activeCompany = await loadActiveCompany();
        setActiveCompanyId(activeCompany.id);

        const [customersResult, machinesResult, engineersResult] = await Promise.all([
          supabase
            .from("customers")
            .select("id, contact_name, business_name")
            .eq("company_id", activeCompany.id)
            .order("business_name", { ascending: true }),
          supabase
            .from("machines")
            .select("id, customer_id, make, model, registration, serial_number, hours")
            .eq("company_id", activeCompany.id)
            .order("make", { ascending: true }),
          supabase
            .from("company_member_profiles")
            .select("user_id, full_name")
            .eq("company_id", activeCompany.id)
            .eq("is_active", true)
            .order("full_name", { ascending: true }),
        ]);

        if (customersResult.error) throw new Error(`Unable to load customers: ${customersResult.error.message}`);
        if (machinesResult.error) throw new Error(`Unable to load machines: ${machinesResult.error.message}`);
        if (engineersResult.error) throw new Error(`Unable to load engineers: ${engineersResult.error.message}`);

        setCustomers((customersResult.data ?? []).map((customer) => ({
          id: customer.id,
          contactName: customer.contact_name ?? "",
          businessName: customer.business_name ?? "",
        })));

        setMachines((machinesResult.data ?? []).map((machine) => ({
          id: machine.id,
          customerId: machine.customer_id,
          make: machine.make ?? "",
          model: machine.model ?? "",
          registration: machine.registration ?? "",
          serialNumber: machine.serial_number ?? "",
          hours: machine.hours === null || machine.hours === undefined ? null : Number(machine.hours),
        })));

        setEngineers((engineersResult.data ?? [])
          .filter((engineer) => typeof engineer.full_name === "string" && engineer.full_name.trim().length > 0)
          .map((engineer) => ({ userId: engineer.user_id, fullName: engineer.full_name.trim() })));
      } catch (error) {
        console.error("Unable to load new-job data:", error);
        setActiveCompanyId("");
        setCustomers([]);
        setMachines([]);
        setEngineers([]);
        setErrorMessage(error instanceof Error ? error.message : "Unable to load job form data.");
      } finally {
        setLoadingData(false);
      }
    }

    void loadFormData();
  }, []);

  const availableMachines = useMemo(() => {
    if (!customerId) return [];
    return machines.filter((machine) => machine.customerId === customerId);
  }, [customerId, machines]);

  function handleCustomerChange(newCustomerId: string) {
    setCustomerId(newCustomerId);
    setMachineId("");
    setMachineHours("");
  }

  function handleMachineChange(newMachineId: string) {
    setMachineId(newMachineId);
    const selectedMachine = machines.find((machine) => machine.id === newMachineId);
    setMachineHours(
      selectedMachine?.hours !== null && selectedMachine?.hours !== undefined
        ? String(selectedMachine.hours)
        : "",
    );
  }

  async function saveQuickCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = quickCustomer.businessName.trim() || quickCustomer.contactName.trim();
    if (!displayName) {
      setDrawerError("Enter a customer or business name. Everything else can be completed later.");
      return;
    }
    if (!activeCompanyId) {
      setDrawerError("No active company is available.");
      return;
    }
    if (quickCustomer.email.trim() && !quickCustomer.email.includes("@")) {
      setDrawerError("Enter a valid email address or leave it blank for now.");
      return;
    }

    setSavingCustomer(true);
    setDrawerError("");

    const { data, error } = await supabase
      .from("customers")
      .insert({
        company_id: activeCompanyId,
        business_name: quickCustomer.businessName.trim() || displayName,
        contact_name: quickCustomer.contactName.trim(),
        customer_type: "Farm",
        phone: quickCustomer.phone.trim(),
        email: quickCustomer.email.trim().toLowerCase(),
        address: "",
        postcode: "",
        vat_number: "",
        notes: "",
      })
      .select("id, contact_name, business_name")
      .single();

    if (error) {
      setDrawerError(`Unable to create customer: ${error.message}`);
      setSavingCustomer(false);
      return;
    }

    const created: Customer = {
      id: data.id,
      contactName: data.contact_name ?? "",
      businessName: data.business_name ?? "",
    };

    setCustomers((current) => [...current, created].sort((a, b) =>
      (a.businessName || a.contactName).localeCompare(b.businessName || b.contactName),
    ));
    setCustomerId(created.id);
    setMachineId("");
    setMachineHours("");
    setQuickCustomer(emptyQuickCustomer);
    setShowCustomerDrawer(false);
    setSavingCustomer(false);
    setDrawerError("");

    // New customers usually need a machine straight away, so continue the rapid workflow.
    setShowMachineDrawer(true);
  }

  async function saveQuickMachine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerId) {
      setDrawerError("Create or select a customer first.");
      return;
    }
    if (!quickMachine.make.trim() || !quickMachine.model.trim()) {
      setDrawerError("Enter the machine make and model. The remaining details can be completed later.");
      return;
    }

    const hoursValue = quickMachine.hours.trim() ? Number(quickMachine.hours) : null;
    if (hoursValue !== null && (!Number.isFinite(hoursValue) || hoursValue < 0)) {
      setDrawerError("Enter valid machine hours or leave them blank.");
      return;
    }

    setSavingMachine(true);
    setDrawerError("");

    const { data, error } = await supabase
      .from("machines")
      .insert({
        company_id: activeCompanyId,
        customer_id: customerId,
        make: quickMachine.make.trim(),
        model: quickMachine.model.trim(),
        machine_type: quickMachine.machineType,
        year: null,
        registration: quickMachine.registration.trim().toUpperCase(),
        serial_number: quickMachine.serialNumber.trim(),
        hours: hoursValue,
        usage_profile: "medium",
        estimated_hours_per_week: 25,
        notes: "",
      })
      .select("id, customer_id, make, model, registration, serial_number, hours")
      .single();

    if (error) {
      setDrawerError(`Unable to create machine: ${error.message}`);
      setSavingMachine(false);
      return;
    }

    const created: Machine = {
      id: data.id,
      customerId: data.customer_id,
      make: data.make ?? "",
      model: data.model ?? "",
      registration: data.registration ?? "",
      serialNumber: data.serial_number ?? "",
      hours: data.hours === null || data.hours === undefined ? null : Number(data.hours),
    };

    setMachines((current) => [...current, created]);
    setMachineId(created.id);
    setMachineHours(created.hours === null ? "" : String(created.hours));
    setQuickMachine(emptyQuickMachine);
    setShowMachineDrawer(false);
    setSavingMachine(false);
    setDrawerError("");
  }


  function startEmergencyCallout() {
    setEmergencyMode(true);
    setPriority("urgent");
    setErrorMessage("");
  }

  function applyFaultCategory(label: string) {
    setEmergencyMode(true);
    setPriority("urgent");
    setFaultReported((current) => {
      const trimmed = current.trim();
      if (!trimmed) return `${label}: `;
      if (trimmed.toLowerCase().startsWith(`${label.toLowerCase()}:`)) return current;
      return `${label}: ${trimmed}`;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeCompanyId) return setErrorMessage("No active company is available.");
    if (!customerId) return setErrorMessage("Select or create a customer.");
    if (!machineId) return setErrorMessage("Select or create a machine.");
    if (!faultReported.trim()) return setErrorMessage("Enter the fault reported or reason for the job.");

    const parsedMachineHours = machineHours.trim() === "" ? null : Number(machineHours);
    if (parsedMachineHours !== null && (!Number.isFinite(parsedMachineHours) || parsedMachineHours < 0)) {
      return setErrorMessage("Enter a valid machine-hours figure.");
    }

    setSubmitting(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        company_id: activeCompanyId,
        customer_id: customerId,
        machine_id: machineId,
        engineer_name: engineerName.trim() || null,
        priority,
        status: "open",
        fault_reported: faultReported.trim(),
        machine_hours: parsedMachineHours,
      })
      .select("id, job_number")
      .single();

    if (error) {
      console.error("Unable to create job:", error);
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    router.push(`/jobs/${data.id}`);
    router.refresh();
  }

  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Rapid job creation</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">New Job</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Log the call, create a customer and machine if needed, then assign the work without leaving this page.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startEmergencyCallout}
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
          >
            Emergency Callout
          </button>
          <Link href="/jobs" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/60">
            Back to Jobs
          </Link>
        </div>
      </div>

      <Card className="rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800">
        {loadingData ? (
          <div className="py-12 text-center text-slate-600 dark:text-slate-400">Loading customers and machines...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{errorMessage}</div>
            )}

            {emergencyMode && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-red-800 dark:text-red-300">Emergency callout mode</p>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-400">Priority is set to urgent. Pick a fault type to start the description, then get the job assigned immediately.</p>
                  </div>
                  <button type="button" onClick={() => setEmergencyMode(false)} className="text-sm font-bold text-red-700 hover:underline dark:text-red-300">Return to standard job</button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Engine", "Hydraulics", "Electrical", "Transmission", "PTO", "Air Conditioning", "Other"].map((label) => (
                    <button key={label} type="button" onClick={() => applyFaultCategory(label)} className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-800 transition hover:border-red-300 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="customer" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Customer</label>
                  <button
                    type="button"
                    onClick={() => { setDrawerError(""); setShowCustomerDrawer(true); }}
                    className="text-sm font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    + New customer
                  </button>
                </div>
                <select id="customer" value={customerId} onChange={(event) => handleCustomerChange(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" required>
                  <option value="">Select customer</option>
                  {customers.map((customer) => {
                    const displayName = customer.businessName || customer.contactName || "Unnamed customer";
                    return <option key={customer.id} value={customer.id}>{displayName}{customer.businessName && customer.contactName ? ` — ${customer.contactName}` : ""}</option>;
                  })}
                </select>
                {selectedCustomer && (
                  <p className="mt-2 text-xs font-medium text-slate-500">Need to finish their profile later? You can do that from Customers before invoicing.</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="machine" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Machine</label>
                  <button
                    type="button"
                    disabled={!customerId}
                    onClick={() => { setDrawerError(""); setShowMachineDrawer(true); }}
                    className="text-sm font-bold text-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    + New machine
                  </button>
                </div>
                <select id="machine" value={machineId} onChange={(event) => handleMachineChange(event.target.value)} disabled={!customerId} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" required>
                  <option value="">{!customerId ? "Select a customer first" : availableMachines.length === 0 ? "No machines recorded for this customer" : "Select machine"}</option>
                  {availableMachines.map((machine) => {
                    const machineName = [machine.make, machine.model].filter(Boolean).join(" ") || "Unnamed machine";
                    return <option key={machine.id} value={machine.id}>{machineName}{machine.registration ? ` — ${machine.registration}` : ""}</option>;
                  })}
                </select>
                {customerId && availableMachines.length === 0 && (
                  <button type="button" onClick={() => setShowMachineDrawer(true)} className="mt-2 text-left text-sm font-semibold text-amber-700 hover:text-amber-800">No machine yet — add one here without leaving the job.</button>
                )}
              </div>

              <div>
                <label htmlFor="engineer" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Engineer</label>
                <select id="engineer" value={engineerName} onChange={(event) => setEngineerName(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="">Unassigned</option>
                  {engineers.map((engineer) => <option key={engineer.userId} value={engineer.fullName}>{engineer.fullName}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="machineHours" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Machine Hours</label>
                <input id="machineHours" type="number" min="0" step="0.1" value={machineHours} onChange={(event) => setMachineHours(event.target.value)} placeholder="Optional — e.g. 8498" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
            </div>

            <div>
              <p className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-300">Priority</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { value: "normal", label: "Normal", description: "Standard scheduling" },
                  { value: "high", label: "High", description: "Needs prompt attention" },
                  { value: "urgent", label: "Urgent", description: "Machine stopped or critical" },
                ].map((option) => (
                  <label key={option.value} className={`cursor-pointer rounded-xl border p-4 transition ${priority === option.value ? "border-[#103d2e] bg-[#103d2e]/5 ring-1 ring-[#103d2e]" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}>
                    <div className="flex items-start gap-3">
                      <input type="radio" name="priority" value={option.value} checked={priority === option.value} onChange={(event) => setPriority(event.target.value)} className="mt-1" />
                      <div><p className="font-semibold text-slate-900 dark:text-slate-100">{option.label}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{option.description}</p></div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="faultReported" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Fault Reported / Work Requested</label>
              <textarea id="faultReported" value={faultReported} onChange={(event) => setFaultReported(event.target.value)} rows={7} placeholder="Describe the customer's reported fault or the work requested..." className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" required />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Link href="/jobs" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">Cancel</Link>
              <button type="submit" disabled={submitting || !customerId || !machineId || !faultReported.trim()} className="inline-flex items-center justify-center rounded-xl bg-[#103d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3024] disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? "Creating Job..." : "Create & Assign Job"}
              </button>
            </div>
          </form>
        )}
      </Card>

      {showCustomerDrawer && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/45" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingCustomer) setShowCustomerDrawer(false); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-950 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Rapid entry</p><h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">New customer</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Only a name is required. Complete billing details later before invoicing.</p></div>
              <button type="button" onClick={() => setShowCustomerDrawer(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-xl text-slate-500 dark:border-slate-700">×</button>
            </div>

            <form onSubmit={saveQuickCustomer} className="mt-7 space-y-5">
              {drawerError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{drawerError}</div>}
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Customer / business name *
                <input autoFocus value={quickCustomer.businessName} onChange={(e) => setQuickCustomer((c) => ({ ...c, businessName: e.target.value }))} placeholder="e.g. Hillview Farm" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Contact name <span className="font-normal text-slate-500">(optional)</span>
                <input value={quickCustomer.contactName} onChange={(e) => setQuickCustomer((c) => ({ ...c, contactName: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Phone <span className="font-normal text-slate-500">(optional)</span><input value={quickCustomer.phone} onChange={(e) => setQuickCustomer((c) => ({ ...c, phone: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 dark:border-slate-700 dark:bg-slate-900" /></label>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Email <span className="font-normal text-slate-500">(optional)</span><input type="email" value={quickCustomer.email} onChange={(e) => setQuickCustomer((c) => ({ ...c, email: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 dark:border-slate-700 dark:bg-slate-900" /></label>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Address, postcode, VAT number, payment details and notes can all be completed later from the customer profile.</div>
              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowCustomerDrawer(false)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={savingCustomer} className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{savingCustomer ? "Saving..." : "Save & add machine →"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMachineDrawer && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/45" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingMachine) setShowMachineDrawer(false); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-950 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Rapid entry</p><h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">New machine</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Add the minimum needed to identify the machine. Fill in the technical record later.</p></div>
              <button type="button" onClick={() => setShowMachineDrawer(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-xl text-slate-500 dark:border-slate-700">×</button>
            </div>

            <form onSubmit={saveQuickMachine} className="mt-7 space-y-5">
              {drawerError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{drawerError}</div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Make *<input autoFocus value={quickMachine.make} onChange={(e) => setQuickMachine((c) => ({ ...c, make: e.target.value }))} placeholder="e.g. New Holland" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 dark:border-slate-700 dark:bg-slate-900" required /></label>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Model *<input value={quickMachine.model} onChange={(e) => setQuickMachine((c) => ({ ...c, model: e.target.value }))} placeholder="e.g. T7.245" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 dark:border-slate-700 dark:bg-slate-900" required /></label>
              </div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Machine type<select value={quickMachine.machineType} onChange={(e) => setQuickMachine((c) => ({ ...c, machineType: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"><option>Tractor</option><option>Telehandler</option><option>Loader</option><option>Excavator</option><option>Combine</option><option>Forage harvester</option><option>Implement</option><option>Trailer</option><option>Dairy equipment</option><option>Other</option></select></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Registration <span className="font-normal text-slate-500">(optional)</span><input value={quickMachine.registration} onChange={(e) => setQuickMachine((c) => ({ ...c, registration: e.target.value.toUpperCase() }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 uppercase dark:border-slate-700 dark:bg-slate-900" /></label>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Serial number <span className="font-normal text-slate-500">(optional)</span><input value={quickMachine.serialNumber} onChange={(e) => setQuickMachine((c) => ({ ...c, serialNumber: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-900" /></label>
              </div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Current hours <span className="font-normal text-slate-500">(optional)</span><input type="number" min="0" step="0.1" value={quickMachine.hours} onChange={(e) => setQuickMachine((c) => ({ ...c, hours: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-900" /></label>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Year, full specifications, service intervals and notes can be completed later from the machine record.</div>
              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowMachineDrawer(false)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={savingMachine} className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{savingMachine ? "Saving..." : "Save & select machine"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewJobPage() {
  return <FieldRolePageGate><NewJobPageContent /></FieldRolePageGate>;
}
