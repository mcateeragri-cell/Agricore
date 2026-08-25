"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MfaAccessGate({ children, loading = false }: { children: ReactNode; loading?: boolean }) {
  const pathname=usePathname(); const router=useRouter(); const [checking,setChecking]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{ if(loading)return; let cancelled=false; void(async()=>{setChecking(true);setError("");try{
    const [policyResponse,aal,factors]=await Promise.all([fetch("/api/security/mfa-policy",{cache:"no-store"}),supabase.auth.mfa.getAuthenticatorAssuranceLevel(),supabase.auth.mfa.listFactors()]);
    const policy=await policyResponse.json() as {requiredForCurrentUser?:boolean;error?:string}; if(!policyResponse.ok)throw new Error(policy.error||"Unable to check two-factor policy."); if(aal.error)throw aal.error;if(factors.error)throw factors.error;
    const hasFactor=(factors.data.totp??[]).some(f=>f.status==="verified"); const required=Boolean(policy.requiredForCurrentUser||hasFactor);
    if(required&&aal.data.currentLevel!=="aal2"){const target=pathname||"/dashboard";router.replace(`${hasFactor?"/mfa":"/mfa/setup"}?redirectTo=${encodeURIComponent(target)}`);return;}
    if(!cancelled)setChecking(false);
  }catch(e){if(!cancelled){setError(e instanceof Error?e.message:"Unable to verify account security.");setChecking(false)}}})();return()=>{cancelled=true}},[loading,pathname,router]);
  if(checking||loading)return <div className="flex min-h-[55vh] items-center justify-center p-6 text-sm font-semibold text-slate-500">Checking account security…</div>;
  if(error)return <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div>;
  return <>{children}</>;
}
