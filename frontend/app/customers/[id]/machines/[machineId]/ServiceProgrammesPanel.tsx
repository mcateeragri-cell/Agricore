"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "../../../../../Components/ui/Button";
import Card from "../../../../../Components/ui/Card";

type Programme = {
  id: string;
  name: string;
  manufacturer: string | null;
  model_pattern: string | null;
  interval_hours: number | null;
  interval_months: number | null;
  estimated_labour_hours: number | null;
};

type Assignment = {
  id: string;
  programme_id: string;
  last_service_hours: number | null;
  last_service_date: string | null;
  service_programmes: Programme | Programme[] | null;
};

type Props = {
  companyId: string;
  machineId: string;
  machineMake: string;
  machineModel: string;
  currentHours: number;
  estimatedHoursPerWeek: number;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default function ServiceProgrammesPanel({
  companyId,
  machineId,
  machineMake,
  machineModel,
  currentHours,
  estimatedHoursPerWeek,
}: Props) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!companyId || !machineId) return;
    setLoading(true);
    setError("");

    const [programmeResult, assignmentResult] = await Promise.all([
      supabase
        .from("service_programmes")
        .select("id, name, manufacturer, model_pattern, interval_hours, interval_months, estimated_labour_hours")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("name"),
      supabase
        .from("machine_service_programmes")
        .select(`
          id,
          programme_id,
          last_service_hours,
          last_service_date,
          service_programmes (
            id,
            name,
            manufacturer,
            model_pattern,
            interval_hours,
            interval_months,
            estimated_labour_hours
          )
        `)
        .eq("company_id", companyId)
        .eq("machine_id", machineId)
        .eq("active", true),
    ]);

    if (programmeResult.error || assignmentResult.error) {
      setError(programmeResult.error?.message ?? assignmentResult.error?.message ?? "Unable to load service programmes.");
      setLoading(false);
      return;
    }

    setProgrammes((programmeResult.data ?? []) as Programme[]);
    setAssignments((assignmentResult.data ?? []) as Assignment[]);
    setLoading(false);
  }, [companyId, machineId]);

  useEffect(() => {
    void load();
  }, [load]);

  const available = useMemo(() => {
    const assigned = new Set(assignments.map((item) => item.programme_id));
    return programmes.filter((programme) => !assigned.has(programme.id));
  }, [assignments, programmes]);

  async function assignProgramme() {
    if (!selectedProgrammeId) return;
    setSaving(true);
    setError("");

    const { error: insertError } = await supabase
      .from("machine_service_programmes")
      .insert({
        company_id: companyId,
        machine_id: machineId,
        programme_id: selectedProgrammeId,
        last_service_hours: currentHours,
        last_service_date: new Date().toISOString().slice(0, 10),
        active: true,
      });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSelectedProgrammeId("");
    await load();
    setSaving(false);
  }

  async function removeAssignment(id: string) {
    const { error: updateError } = await supabase
      .from("machine_service_programmes")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await load();
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Service planning</p>
          <h2 className="mt-1 text-xl font-bold">Service programmes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Predict upcoming maintenance for {machineMake} {machineModel} using its recorded weekly usage.
          </p>
        </div>

        <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
          <select
            value={selectedProgrammeId}
            onChange={(event) => setSelectedProgrammeId(event.target.value)}
            className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm"
          >
            <option value="">Select programme…</option>
            {available.map((programme) => (
              <option key={programme.id} value={programme.id}>{programme.name}</option>
            ))}
          </select>
          <Button onClick={assignProgramme} disabled={!selectedProgrammeId || saving}>
            {saving ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Loading service programmes…</p>
      ) : assignments.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No service programmes assigned yet. Create programmes from the Service Programmes page, then assign them here.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {assignments.map((assignment) => {
            const programme = one(assignment.service_programmes);
            if (!programme) return null;
            const nextHours = programme.interval_hours === null
              ? null
              : Number(assignment.last_service_hours ?? currentHours) + Number(programme.interval_hours);
            const remaining = nextHours === null ? null : nextHours - currentHours;
            const weekly = Math.max(estimatedHoursPerWeek, 0);
            const dueByHours = remaining !== null && weekly > 0
              ? new Date(Date.now() + Math.max(remaining, 0) / weekly * 7 * 86400000)
              : null;
            const dueByDate = programme.interval_months && assignment.last_service_date
              ? addMonths(assignment.last_service_date, programme.interval_months)
              : null;
            const predicted = [dueByHours, dueByDate]
              .filter((date): date is Date => Boolean(date))
              .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
            const overdue = (remaining !== null && remaining <= 0) || (dueByDate !== null && dueByDate.getTime() < Date.now());
            const dueSoon = !overdue && ((remaining !== null && remaining <= Math.max(weekly * 4, 50)) || (predicted !== null && predicted.getTime() - Date.now() <= 30 * 86400000));

            return (
              <article key={assignment.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">{programme.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {[programme.manufacturer, programme.model_pattern].filter(Boolean).join(" • ") || "General programme"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${overdue ? "bg-red-100 text-red-700" : dueSoon ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {overdue ? "Overdue" : dueSoon ? "Due soon" : "On schedule"}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-slate-500">Hours remaining</dt>
                    <dd className="mt-1 font-bold">{remaining === null ? "Date based" : `${Math.round(remaining)} hrs`}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-slate-500">Predicted due</dt>
                    <dd className="mt-1 font-bold">{predicted ? formatDate(predicted) : "Not enough data"}</dd>
                  </div>
                </dl>

                <button type="button" onClick={() => void removeAssignment(assignment.id)} className="mt-4 text-sm font-bold text-red-700 hover:underline">
                  Remove programme
                </button>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
