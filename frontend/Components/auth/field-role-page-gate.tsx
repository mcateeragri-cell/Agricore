"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useNavigationUser } from "@/Components/navigation/use-navigation-user";
import { isFieldRole } from "@/Components/navigation/navigation-types";

type FieldRolePageGateProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function FieldRolePageGate({
  children,
  redirectTo = "/technician",
}: FieldRolePageGateProps) {
  const router = useRouter();
  const { userState, loading } = useNavigationUser();
  const restricted = isFieldRole(userState.role);

  useEffect(() => {
    if (!loading && restricted) {
      router.replace(redirectTo);
    }
  }, [loading, redirectTo, restricted, router]);

  if (loading || restricted) {
    return (
      <main className="min-h-dvh p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {restricted ? "Opening your assigned jobs…" : "Checking access…"}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
