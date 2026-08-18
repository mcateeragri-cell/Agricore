"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import FieldRolePageGate from "@/Components/auth/field-role-page-gate";
import Button from "@/Components/ui/Button";
import Card from "@/Components/ui/Card";
import WorkspaceHeader from "@/Components/ui/WorkspaceHeader";

type Enquiry = {
  id: string;
  source_reference: string | null;
  submitted_at: string;
  contact_name: string;
  business_name: string | null;
  phone: string;
  email: string | null;
  enquiry_type: string | null;
  location: string;
  machine_description: string | null;
  urgency: string | null;
  requested_dates: string | null;
  work_environment: string | null;
  brands: string | null;
  preferred_contact: string | null;
  message: string;
  source_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: "new" | "reviewing" | "accepted" | "rejected";
  accepted_job_id: string | null;
  rejection_reason: string | null;
  company_branches?: { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null;
  jobs?: { id: string; job_number: string; status: string } | { id: string; job_number: string; status: string }[] | null;
};

type CustomerMatch = {
  id: string;
  label: string;
  businessName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postcode: string | null;
  score: number;
  reasons: string[];
};

type MachineMatch = {
  id: string;
  customerId: string;
  label: string;
  make: string | null;
  model: string | null;
  registration: string | null;
  serialNumber: string | null;
  score: number;
  reasons: string[];
};

type MatchPayload = {
  enquiry: {
    id: string;
    contactName: string;
    businessName: string | null;
    phone: string;
    email: string | null;
    location: string;
    machineDescription: string;
  };
  customers: CustomerMatch[];
  machines: MachineMatch[];
};

function related<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function MatchReasons({ reasons }: { reasons: string[] }) {
  if (!reasons.length) return null;
  return <p className="mt-1 text-xs text-emerald-700">{reasons.join(" · ")}</p>;
}

function EnquiriesPageContent() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [status, setStatus] = useState("new");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const [matchFor, setMatchFor] = useState<Enquiry | null>(null);
  const [matchData, setMatchData] = useState<MatchPayload | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [customerChoice, setCustomerChoice] = useState<"existing" | "new">("new");
  const [customerId, setCustomerId] = useState("");
  const [machineChoice, setMachineChoice] = useState<"existing" | "new" | "none">("none");
  const [machineId, setMachineId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/website-enquiries?status=${encodeURIComponent(status)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load enquiries.");
      setEnquiries(body.enquiries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load enquiries.");
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({ visible: enquiries.length }), [enquiries]);

  function chooseCustomer(nextId: string, data = matchData) {
    setCustomerChoice("existing");
    setCustomerId(nextId);

    const machines = (data?.machines ?? []).filter((machine) => machine.customerId === nextId);
    const strongMachine = machines.find((machine) => machine.score >= 70);
    if (strongMachine) {
      setMachineChoice("existing");
      setMachineId(strongMachine.id);
    } else if (data?.enquiry.machineDescription) {
      setMachineChoice("new");
      setMachineId("");
    } else {
      setMachineChoice("none");
      setMachineId("");
    }
  }

  function chooseNewCustomer(data = matchData) {
    setCustomerChoice("new");
    setCustomerId("");
    setMachineId("");
    setMachineChoice(data?.enquiry.machineDescription ? "new" : "none");
  }

  async function prepareAccept(enquiry: Enquiry) {
    setMatchFor(enquiry);
    setMatchData(null);
    setMatchLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/website-enquiries/${enquiry.id}/matches`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to check customer matches.");

      const data = body as MatchPayload;
      setMatchData(data);

      const strongCustomer = data.customers.find((customer) => customer.score >= 80);
      if (strongCustomer) chooseCustomer(strongCustomer.id, data);
      else chooseNewCustomer(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to check customer matches.");
      setMatchFor(null);
    } finally {
      setMatchLoading(false);
    }
  }

  async function confirmAccept() {
    if (!matchFor || !matchData) return;

    if (customerChoice === "existing" && !customerId) {
      setError("Choose the existing customer to use.");
      return;
    }
    if (machineChoice === "existing" && !machineId) {
      setError("Choose the existing machine to use.");
      return;
    }

    setBusyId(matchFor.id);
    setError("");
    try {
      const response = await fetch(`/api/website-enquiries/${matchFor.id}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerChoice,
          customerId: customerChoice === "existing" ? customerId : null,
          machineChoice,
          machineId: machineChoice === "existing" ? machineId : null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to accept enquiry.");

      setMatchFor(null);
      setMatchData(null);
      await load();
      if (body.job?.id) window.location.href = `/jobs/${body.job.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to accept enquiry.");
    } finally {
      setBusyId("");
    }
  }

  async function changeStatus(id: string, nextStatus: "reviewing" | "rejected" | "new") {
    let rejectionReason = "";
    if (nextStatus === "rejected") {
      rejectionReason = window.prompt("Reason for rejecting this enquiry (optional):") ?? "";
    }
    setBusyId(id); setError("");
    try {
      const response = await fetch(`/api/website-enquiries/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus, rejectionReason }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update enquiry.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update enquiry."); }
    finally { setBusyId(""); }
  }

  const availableMachines = useMemo(
    () => matchData?.machines.filter((machine) => machine.customerId === customerId) ?? [],
    [matchData, customerId],
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="p-4 sm:p-6 lg:p-8">
        <WorkspaceHeader
          eyebrow="Website lead capture"
          title="Enquiries"
          description="Review inbound website enquiries before they become live work. Accepted enquiries are converted into open, unscheduled jobs ready for dispatch."
          actions={<Link href="/settings/website-integrations" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Website integrations</Link>}
        />

        <div className="mt-5 flex flex-wrap gap-2">
          {["new","reviewing","accepted","rejected","all"].map((item) => (
            <button key={item} onClick={() => setStatus(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${status === item ? "bg-[#103d2e] text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
              {item.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {loading ? <div className="mt-6 text-sm text-slate-500">Loading website enquiries…</div> : null}
        {!loading && counts.visible === 0 ? <Card className="mt-6 p-6"><p className="font-semibold">No {status === "all" ? "" : status} website enquiries.</p><p className="mt-1 text-sm text-slate-500">New submissions will appear here as soon as an integration is connected.</p></Card> : null}

        <div className="mt-6 grid gap-5">
          {enquiries.map((enquiry) => {
            const branch = related(enquiry.company_branches);
            const job = related(enquiry.jobs);
            return (
              <Card key={enquiry.id} className="overflow-hidden p-0">
                <div className="border-b border-slate-200 bg-white px-5 py-4 sm:flex sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">{enquiry.status}</span>
                      {enquiry.urgency ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{enquiry.urgency}</span> : null}
                      {enquiry.source_reference ? <span className="text-xs font-semibold text-slate-400">{enquiry.source_reference}</span> : null}
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-slate-900">{enquiry.business_name || enquiry.contact_name}</h2>
                    {enquiry.business_name ? <p className="text-sm text-slate-500">Contact: {enquiry.contact_name}</p> : null}
                  </div>
                  <div className="mt-3 text-sm text-slate-500 sm:mt-0 sm:text-right">
                    <p>{formatDate(enquiry.submitted_at)}</p>
                    {branch ? <p className="mt-1">Depot: {branch.name}</p> : null}
                  </div>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{enquiry.enquiry_type || "General enquiry"}</p>
                    <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-800">{enquiry.message}</p>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div><span className="font-semibold">Location:</span> {enquiry.location}</div>
                      <div><span className="font-semibold">Machine:</span> {enquiry.machine_description || "Not supplied"}</div>
                      {enquiry.requested_dates ? <div><span className="font-semibold">Dates:</span> {enquiry.requested_dates}</div> : null}
                      {enquiry.brands ? <div><span className="font-semibold">Brands:</span> {enquiry.brands}</div> : null}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                    <p><span className="font-semibold">Phone:</span> <a className="text-[#103d2e] underline" href={`tel:${enquiry.phone}`}>{enquiry.phone}</a></p>
                    <p className="mt-2"><span className="font-semibold">Email:</span> {enquiry.email ? <a className="text-[#103d2e] underline" href={`mailto:${enquiry.email}`}>{enquiry.email}</a> : "Not supplied"}</p>
                    <p className="mt-2"><span className="font-semibold">Preferred:</span> {enquiry.preferred_contact || "Not specified"}</p>
                    {enquiry.utm_campaign || enquiry.utm_source ? <div className="mt-4 border-t border-slate-200 pt-4"><p className="font-semibold">Attribution</p><p className="mt-1 text-slate-600">{[enquiry.utm_source, enquiry.utm_medium, enquiry.utm_campaign].filter(Boolean).join(" · ")}</p></div> : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                  {(enquiry.status === "new" || enquiry.status === "reviewing") ? <Button disabled={busyId === enquiry.id} onClick={() => void prepareAccept(enquiry)}>{busyId === enquiry.id ? "Working…" : "Accept & create job"}</Button> : null}
                  {enquiry.status === "new" ? <button disabled={busyId === enquiry.id} onClick={() => void changeStatus(enquiry.id, "reviewing")} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Mark reviewing</button> : null}
                  {(enquiry.status === "new" || enquiry.status === "reviewing") ? <button disabled={busyId === enquiry.id} onClick={() => void changeStatus(enquiry.id, "rejected")} className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700">Reject</button> : null}
                  {enquiry.status === "rejected" ? <button disabled={busyId === enquiry.id} onClick={() => void changeStatus(enquiry.id, "new")} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Reopen</button> : null}
                  {job ? <Link className="text-sm font-bold text-[#103d2e] underline" href={`/jobs/${job.id}`}>Open {job.job_number || "job"}</Link> : null}
                  {enquiry.rejection_reason ? <span className="text-sm text-slate-500">Reason: {enquiry.rejection_reason}</span> : null}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {matchFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => {
          if (event.currentTarget === event.target && !busyId) setMatchFor(null);
        }}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#103d2e]">Accept website enquiry</p>
                <h2 className="mt-1 text-2xl font-bold">Match customer & machine</h2>
                <p className="mt-1 text-sm text-slate-500">Use an existing record where possible to keep service history together.</p>
              </div>
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" disabled={Boolean(busyId)} onClick={() => setMatchFor(null)}>Close</button>
            </div>

            {matchLoading || !matchData ? (
              <div className="p-8 text-sm text-slate-500">Checking this company for likely matches…</div>
            ) : (
              <div className="grid gap-6 p-5 sm:p-6">
                <section className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Website details</p>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <p><span className="font-semibold">Customer:</span> {matchData.enquiry.businessName || matchData.enquiry.contactName}</p>
                    <p><span className="font-semibold">Contact:</span> {matchData.enquiry.contactName}</p>
                    <p><span className="font-semibold">Phone:</span> {matchData.enquiry.phone}</p>
                    <p><span className="font-semibold">Email:</span> {matchData.enquiry.email || "Not supplied"}</p>
                    <p><span className="font-semibold">Location:</span> {matchData.enquiry.location}</p>
                    <p><span className="font-semibold">Machine:</span> {matchData.enquiry.machineDescription || "Not supplied"}</p>
                  </div>
                </section>

                <section>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">1. Customer</h3>
                      <p className="text-sm text-slate-500">Choose an existing customer or create a new record from this enquiry.</p>
                    </div>
                    {matchData.customers.length ? <span className="text-xs font-semibold text-slate-400">{matchData.customers.length} possible match{matchData.customers.length === 1 ? "" : "es"}</span> : null}
                  </div>

                  <div className="mt-3 grid gap-3">
                    {matchData.customers.map((customer) => (
                      <label key={customer.id} className={`cursor-pointer rounded-2xl border p-4 ${customerChoice === "existing" && customerId === customer.id ? "border-[#103d2e] bg-emerald-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex gap-3">
                          <input type="radio" name="customer-match" checked={customerChoice === "existing" && customerId === customer.id} onChange={() => chooseCustomer(customer.id)} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold">{customer.label}</p>
                              {customer.score >= 80 ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">Strong match</span> : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{[customer.contactName, customer.phone, customer.email].filter(Boolean).join(" · ")}</p>
                            <MatchReasons reasons={customer.reasons} />
                          </div>
                        </div>
                      </label>
                    ))}

                    <label className={`cursor-pointer rounded-2xl border p-4 ${customerChoice === "new" ? "border-[#103d2e] bg-emerald-50" : "border-slate-200 bg-white"}`}>
                      <div className="flex gap-3">
                        <input type="radio" name="customer-match" checked={customerChoice === "new"} onChange={() => chooseNewCustomer()} />
                        <div>
                          <p className="font-bold">Create new customer</p>
                          <p className="mt-1 text-sm text-slate-600">Create a customer record using the website contact details.</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold">2. Machine</h3>
                  <p className="text-sm text-slate-500">
                    {customerChoice === "existing"
                      ? "Choose one of this customer’s machines, create a new one, or leave the job without a machine."
                      : "A new machine can be created under the new customer, or you can add it later."}
                  </p>

                  <div className="mt-3 grid gap-3">
                    {customerChoice === "existing" && availableMachines.map((machine) => (
                      <label key={machine.id} className={`cursor-pointer rounded-2xl border p-4 ${machineChoice === "existing" && machineId === machine.id ? "border-[#103d2e] bg-emerald-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex gap-3">
                          <input type="radio" name="machine-match" checked={machineChoice === "existing" && machineId === machine.id} onChange={() => { setMachineChoice("existing"); setMachineId(machine.id); }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold">{machine.label}</p>
                              {machine.score >= 70 ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">Likely match</span> : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{[machine.registration, machine.serialNumber].filter(Boolean).join(" · ") || "No registration/serial recorded"}</p>
                            <MatchReasons reasons={machine.reasons} />
                          </div>
                        </div>
                      </label>
                    ))}

                    {matchData.enquiry.machineDescription ? (
                      <label className={`cursor-pointer rounded-2xl border p-4 ${machineChoice === "new" ? "border-[#103d2e] bg-emerald-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex gap-3">
                          <input type="radio" name="machine-match" checked={machineChoice === "new"} onChange={() => { setMachineChoice("new"); setMachineId(""); }} />
                          <div>
                            <p className="font-bold">Create new machine</p>
                            <p className="mt-1 text-sm text-slate-600">{matchData.enquiry.machineDescription}</p>
                          </div>
                        </div>
                      </label>
                    ) : null}

                    <label className={`cursor-pointer rounded-2xl border p-4 ${machineChoice === "none" ? "border-[#103d2e] bg-emerald-50" : "border-slate-200 bg-white"}`}>
                      <div className="flex gap-3">
                        <input type="radio" name="machine-match" checked={machineChoice === "none"} onChange={() => { setMachineChoice("none"); setMachineId(""); }} />
                        <div>
                          <p className="font-bold">No machine yet</p>
                          <p className="mt-1 text-sm text-slate-600">Create the job now and add/select the machine later.</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </section>

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5">
                  <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold" disabled={Boolean(busyId)} onClick={() => setMatchFor(null)}>Cancel</button>
                  <Button disabled={Boolean(busyId)} onClick={() => void confirmAccept()}>
                    {busyId ? "Creating job…" : "Confirm & create job"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function EnquiriesPage() {
  return <FieldRolePageGate><EnquiriesPageContent /></FieldRolePageGate>;
}
