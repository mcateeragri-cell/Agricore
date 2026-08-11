"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigationUser } from "@/Components/navigation/use-navigation-user";
import { getDemoTeam, isDemoCompany } from "@/lib/demo-presentation";

type ProfileRow = { user_id: string; full_name: string | null; is_active: boolean | null };
type RoleRow = { user_id: string; role: string | null };
type AssignmentRow = { user_id: string | null; scheduled_start: string; scheduled_end: string | null; assignment_status: string | null };

type TeamMember = { userId: string; name: string; role: string; status: "On site" | "Scheduled" | "Available" };

function roleLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function TeamStatus() {
  const { userState, loading: companyLoading } = useNavigationUser();
  const companyId = userState.activeCompany?.id ?? "";
  const demoMode = isDemoCompany(userState.activeCompany);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (companyLoading) return;
    if (!companyId) { setProfiles([]); setRoles([]); setAssignments([]); setLoading(false); return; }
    if (demoMode) { setProfiles([]); setRoles([]); setAssignments([]); setLoading(false); return; }
    setLoading(true);

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);

    const [profileResult, roleResult, assignmentResult] = await Promise.all([
      supabase.from("company_member_profiles").select("user_id,full_name,is_active").eq("company_id", companyId).eq("is_active", true),
      supabase.from("company_member_roles").select("user_id,role").eq("company_id", companyId),
      supabase.from("job_assignments").select("user_id,scheduled_start,scheduled_end,assignment_status").eq("company_id", companyId).gte("scheduled_start", start.toISOString()).lt("scheduled_start", end.toISOString()),
    ]);

    if (profileResult.error || roleResult.error || assignmentResult.error) {
      console.error("Unable to load team status:", profileResult.error || roleResult.error || assignmentResult.error);
    }

    setProfiles((profileResult.data ?? []) as ProfileRow[]);
    setRoles((roleResult.data ?? []) as RoleRow[]);
    setAssignments((assignmentResult.data ?? []) as AssignmentRow[]);
    setLoading(false);
  }, [companyId, companyLoading, demoMode]);

  useEffect(() => { void load(); }, [load]);

  const team = useMemo<TeamMember[]>(() => {
    if (demoMode) return getDemoTeam(userState.activeCompany);

    const roleMap = new Map(roles.map((row) => [row.user_id, row.role ?? ""]));
    const now = Date.now();

    return profiles
      .map((profile) => {
        const role = roleMap.get(profile.user_id) ?? "";
        const userAssignments = assignments.filter((assignment) => assignment.user_id === profile.user_id);
        const active = userAssignments.some((assignment) => {
          const start = new Date(assignment.scheduled_start).getTime();
          const end = assignment.scheduled_end ? new Date(assignment.scheduled_end).getTime() : start + 2 * 60 * 60 * 1000;
          const status = String(assignment.assignment_status ?? "").toLowerCase();
          return start <= now && end >= now && !["completed", "cancelled"].includes(status);
        });

        const scheduled = userAssignments.length > 0;
        return {
          userId: profile.user_id,
          name: profile.full_name || "AgriCore user",
          role: roleLabel(role || "team member"),
          status: active ? "On site" : scheduled ? "Scheduled" : "Available",
        } as TeamMember;
      })
      .sort((a, b) => ({ "On site": 0, Scheduled: 1, Available: 2 }[a.status] - { "On site": 0, Scheduled: 1, Available: 2 }[b.status]))
      .slice(0, 6);
  }, [assignments, demoMode, profiles, roles, userState.activeCompany]);

  const statusClasses = {
    "On site": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    Scheduled: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
    Available: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  } as const;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <UsersRound size={17} />
            <p className="text-xs font-black uppercase tracking-[0.14em]">Team today</p>
          </div>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Technician status</h2>
        </div>
        {demoMode ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Demo team</span>
        ) : (
          <Link href="/administration/users" className="text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-400">Manage</Link>
        )}
      </header>

      {loading || companyLoading ? (
        <div className="space-y-3 p-5">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />)}</div>
      ) : team.length === 0 ? (
        <div className="p-6 text-sm font-medium text-slate-500 dark:text-slate-400">No active team members have been added yet.</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-900">
          {team.map((member) => (
            <div key={member.userId} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{member.name}</p>
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{member.role}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[member.status]}`}>{member.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
