"use client";

import { usePathname } from "next/navigation";

import DesktopSidebar from "./navigation/desktop-sidebar";
import { useNavigationUser } from "./navigation/use-navigation-user";

export default function Sidebar() {
  const pathname = usePathname();
  const { userState, loading } = useNavigationUser();

  return (
    <DesktopSidebar
      pathname={pathname}
      userState={userState}
      loading={loading}
    />
  );
}