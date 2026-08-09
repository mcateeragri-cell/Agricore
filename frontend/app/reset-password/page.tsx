"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (password.length < 10) return setError("Password must be at least 10 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Password updated successfully. You can now continue to AgriCore.");
      setPassword("");
      setConfirm("");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">AgriCore</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Use at least 10 characters and avoid reusing a password from another service.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block"><span className="text-sm font-semibold text-slate-800">New password</span><input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-emerald-600" autoComplete="new-password" /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-800">Confirm password</span><input type="password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-emerald-600" autoComplete="new-password" /></label>
          {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{loading ? "Updating…" : "Update password"}</button>
        </form>
        {message && <Link href="/dashboard" className="mt-5 block text-center text-sm font-semibold text-emerald-700">Continue to dashboard →</Link>}
      </section>
    </main>
  );
}
