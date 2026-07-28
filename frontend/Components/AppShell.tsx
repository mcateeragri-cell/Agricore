"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

const publicRoutes = ["/login", "/forgot-password", "/reset-password"];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}