import Link from "next/link";
import { requirePlatformRole } from "@/lib/auth/require-permission";
import DemoCompaniesClient from "./DemoCompaniesClient";

export const dynamic = "force-dynamic";

export default async function DemoCompaniesPage() {
  await requirePlatformRole(["super_admin", "platform_admin"]);
  return <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950"><div className="mx-auto max-w-6xl"><Link href="/platform" className="text-sm font-bold text-emerald-700 dark:text-emerald-400">← Platform control centre</Link><DemoCompaniesClient /></div></main>;
}
