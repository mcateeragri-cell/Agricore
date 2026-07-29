"use client";

import { supabase } from "@/lib/supabase";

import SidebarIcon from "./sidebar-icon";
import {
  roleLabels,
  type UserNavigationState,
} from "./navigation-types";

type UserCardProps = {
  userState: UserNavigationState;
  loading: boolean;
};

export default function UserCard({
  userState,
  loading,
}: UserCardProps) {
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Unable to sign out:", error);
      return;
    }

    window.location.assign("/login");
  }

  if (loading) {
    return <UserCardSkeleton />;
  }

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-bold text-[#103d2e]">
          {getInitials(userState.fullName)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {userState.fullName || "AgriCore User"}
          </p>

          <p className="mt-0.5 truncate text-xs text-emerald-100">
            {userState.role
              ? roleLabels[userState.role]
              : "No role assigned"}
          </p>

          {userState.email && (
            <p className="mt-1 truncate text-[11px] text-emerald-100/70">
              {userState.email}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-white/10 hover:text-white"
      >
        <SidebarIcon name="logout" className="h-4 w-4" />
        Sign out
      </button>
    </>
  );
}

function UserCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-white/15" />
        <div className="flex-1">
          <div className="h-3 w-28 rounded bg-white/15" />
          <div className="mt-2 h-2 w-20 rounded bg-white/10" />
        </div>
      </div>
      <div className="mt-4 h-11 rounded-xl bg-white/10" />
    </div>
  );
}

function getInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return words.length
    ? words.map((word) => word[0].toUpperCase()).join("")
    : "AC";
}
