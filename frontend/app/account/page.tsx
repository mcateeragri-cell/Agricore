"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { roleLabels, platformRoleLabels, type PlatformRole, type UserRole } from "@/Components/navigation/navigation-types";

type Account = {
  fullName: string;
  email: string;
  companyName: string;
  companyRole: UserRole | null;
  platformRole: PlatformRole | null;
};

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/account", { cache: "no-store" });
        const body = await response.json() as { account?: Account; error?: string };
        if (!response.ok || !body.account) throw new Error(body.error ?? "Unable to load account.");
        setAccount(body.account);
        setFullName(body.account.fullName);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load account.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, newPassword: newPassword || undefined }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to update account.");
      setMessage(newPassword ? "Account details and password updated." : "Account details updated.");
      setNewPassword("");
      setAccount((current) => current ? { ...current, fullName } : current);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Personal settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">My account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Manage your personal profile and password. Company access is managed separately by your company administrator.</p>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30"><p className="font-black">Account security</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Manage authenticator 6-digit verification and company MFA policy.</p><Link href="/account/security" className="mt-3 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">Security & two-factor authentication</Link></div>

        <form onSubmit={save} className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <p className="text-sm text-slate-500">Loading account…</p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Full name</span>
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" autoComplete="name" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Email</span>
                  <input value={account?.email ?? ""} readOnly className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400" />
                </label>
              </div>

              <div className="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-950/70 sm:grid-cols-2">
                <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Active company</p><p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{account?.companyName ?? "—"}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Role</p><p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{account?.companyRole ? roleLabels[account.companyRole] : "No company role"}</p></div>
                {account?.platformRole && <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Platform access</p><p className="mt-1 font-semibold text-amber-700 dark:text-amber-300">{platformRoleLabels[account.platformRole]}</p></div>}
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">New password</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Leave blank to keep your current password" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" autoComplete="new-password" />
                <span className="mt-2 block text-xs text-slate-500">At least 10 characters.</span>
              </label>

              {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">{message}</p>}
              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>}

              <button type="submit" disabled={saving || !fullName.trim()} className="min-h-11 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : "Save account"}</button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
