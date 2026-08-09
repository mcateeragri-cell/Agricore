"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) throw resetError;
      setMessage("If an AgriCore account exists for that address, a password reset email has been sent.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">AgriCore</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter the email address used for your AgriCore account.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block"><span className="text-sm font-semibold text-slate-800">Email address</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-emerald-600" autoComplete="email" /></label>
          {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{loading ? "Sending…" : "Send reset email"}</button>
        </form>
        <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-emerald-700">Back to sign in</Link>
      </section>
    </main>
  );
}
