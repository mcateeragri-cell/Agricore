"use client";

import { useCallback, useEffect, useState } from "react";

import Button from "@/Components/ui/Button";
import Card from "@/Components/ui/Card";
import WorkspaceHeader from "@/Components/ui/WorkspaceHeader";

type Branch = { id: string; name: string; code: string; is_head_office: boolean };
type Integration = {
  id: string;
  name: string;
  key_prefix: string;
  default_branch_id: string | null;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
  company_branches?: { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null;
};

function related<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function WebsiteIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("McAteer website");
  const [branchId, setBranchId] = useState("");
  const [newToken, setNewToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/settings/website-integrations", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load website integrations.");
      setIntegrations(body.integrations ?? []);
      setBranches(body.branches ?? []);
      if (!branchId && body.branches?.length) setBranchId(body.branches[0].id);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load website integrations."); }
    finally { setLoading(false); }
  }, [branchId]);

  useEffect(() => { void load(); }, [load]);

  async function createIntegration() {
    if (!name.trim()) return;
    setSaving(true); setError(""); setNewToken("");
    try {
      const response = await fetch("/api/settings/website-integrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), defaultBranchId: branchId || null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to create integration.");
      setNewToken(body.token ?? "");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create integration."); }
    finally { setSaving(false); }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this website integration? The website will stop being able to submit enquiries with this key.")) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/settings/website-integrations/${id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to revoke integration.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to revoke integration."); }
    finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="p-4 sm:p-6 lg:p-8">
        <WorkspaceHeader
          eyebrow="Company settings"
          title="Website Integrations"
          description="Create tenant-bound credentials for public websites. A website key can submit enquiries only into this active AgriCore company."
        />

        {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {newToken ? (
          <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <p className="font-bold text-amber-900">Copy this token now — it will not be shown again.</p>
            <code className="mt-3 block break-all rounded-xl bg-white p-4 text-sm text-slate-900 ring-1 ring-amber-200">{newToken}</code>
            <button onClick={() => void navigator.clipboard.writeText(newToken)} className="mt-3 rounded-xl bg-[#103d2e] px-4 py-2 text-sm font-bold text-white">Copy token</button>
          </div>
        ) : null}

        <Card className="mt-6 p-5">
          <h2 className="text-lg font-bold">Create integration</h2>
          <p className="mt-1 text-sm text-slate-500">For the McAteer website, choose the depot that new enquiries should land against.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">Name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold">Default depot<select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"><option value="">Company default</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>)}</select></label>
          </div>
          <div className="mt-4"><Button disabled={saving || !name.trim()} onClick={() => void createIntegration()}>{saving ? "Creating…" : "Generate integration key"}</Button></div>
        </Card>

        <div className="mt-6 grid gap-4">
          {loading ? <p className="text-sm text-slate-500">Loading integrations…</p> : null}
          {integrations.map((integration) => {
            const branch = related(integration.company_branches);
            return <Card key={integration.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-bold">{integration.name}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold ${integration.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{integration.active ? "Active" : "Revoked"}</span></div><p className="mt-2 text-sm text-slate-500">Key: {integration.key_prefix}…</p><p className="mt-1 text-sm text-slate-500">Depot: {branch?.name || "Company default"}</p><p className="mt-1 text-sm text-slate-500">Last used: {integration.last_used_at ? new Date(integration.last_used_at).toLocaleString("en-GB") : "Never"}</p></div>{integration.active ? <button disabled={saving} onClick={() => void revoke(integration.id)} className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700">Revoke</button> : null}</div></Card>;
          })}
        </div>
      </div>
    </main>
  );
}
