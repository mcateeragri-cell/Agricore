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

function related<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function EnquiriesPageContent() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [status, setStatus] = useState("new");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

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

  async function accept(id: string) {
    if (!window.confirm("Accept this enquiry and create an unscheduled AgriCore job?")) return;
    setBusyId(id); setError("");
    try {
      const response = await fetch(`/api/website-enquiries/${id}/accept`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to accept enquiry.");
      await load();
      if (body.job?.id) window.location.href = `/jobs/${body.job.id}`;
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to accept enquiry."); }
    finally { setBusyId(""); }
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
                  {(enquiry.status === "new" || enquiry.status === "reviewing") ? <Button disabled={busyId === enquiry.id} onClick={() => void accept(enquiry.id)}>{busyId === enquiry.id ? "Working…" : "Accept & create job"}</Button> : null}
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
    </main>
  );
}

export default function EnquiriesPage() {
  return <FieldRolePageGate><EnquiriesPageContent /></FieldRolePageGate>;
}
