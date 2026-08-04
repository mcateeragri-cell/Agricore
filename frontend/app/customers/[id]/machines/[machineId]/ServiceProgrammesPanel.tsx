"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import Button from "../../../../../Components/ui/Button";
import Card from "../../../../../Components/ui/Card";

type Programme = {
  id: string;
  name: string;
  interval_hours: number | null;
  interval_months: number | null;
  estimated_labour_hours: number | null;
};

type ProgrammeItem = {
  id: string;
  description: string;
  sort_order: number;
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
  customerId: string;
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
  customerId,
  machineId,
  machineMake,
  machineModel,
  currentHours,
  estimatedHoursPerWeek,
}: Props) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [items, setItems] = useState<ProgrammeItem[]>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!companyId || !machineId) return;

    setLoading(true);
    setError("");

    const [programmeResult, assignmentResult] = await Promise.all([
      supabase
        .from("service_programmes")
        .select("id, name, interval_hours, interval_months, estimated_labour_hours")
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
            interval_hours,
            interval_months,
            estimated_labour_hours
          )
        `)
        .eq("company_id", companyId)
        .eq("machine_id", machineId)
        .eq("active", true)
        .maybeSingle(),
    ]);

    if (programmeResult.error || assignmentResult.error) {
      setError(
        programmeResult.error?.message ??
          assignmentResult.error?.message ??
          "Unable to load service programme.",
      );
      setLoading(false);
      return;
    }

    const nextAssignment =
      (assignmentResult.data as Assignment | null) ?? null;

    setProgrammes((programmeResult.data ?? []) as Programme[]);
    setAssignment(nextAssignment);

    if (nextAssignment) {
      const itemResult = await supabase
        .from("service_programme_items")
        .select("id, description, sort_order")
        .eq("company_id", companyId)
        .eq("programme_id", nextAssignment.programme_id)
        .eq("item_type", "checklist")
        .order("sort_order");

      if (!itemResult.error) {
        setItems((itemResult.data ?? []) as ProgrammeItem[]);
      }
    } else {
      setItems([]);
    }

    setLoading(false);
  }, [companyId, machineId]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = useMemo(() => {
    if (!assignment) return null;

    const programme = one(assignment.service_programmes);
    if (!programme) return null;

    const intervalHours =
      programme.interval_hours === null
        ? null
        : Number(programme.interval_hours);

    const remaining =
      intervalHours === null
        ? null
        : Number(assignment.last_service_hours ?? currentHours) +
            intervalHours -
            currentHours;

    let predicted: Date | null = null;

    if (remaining !== null && estimatedHoursPerWeek > 0) {
      predicted = new Date();
      predicted.setDate(
        predicted.getDate() +
          Math.ceil(
            (Math.max(0, remaining) / estimatedHoursPerWeek) * 7,
          ),
      );
    }

    if (programme.interval_months && assignment.last_service_date) {
      const calendarDue = addMonths(
        assignment.last_service_date,
        Number(programme.interval_months),
      );
      if (!predicted || calendarDue < predicted) predicted = calendarDue;
    }

    const overdue =
      (remaining !== null && remaining < 0) ||
      Boolean(predicted && predicted.getTime() < Date.now());

    const dueSoon =
      !overdue &&
      ((remaining !== null && remaining <= 50) ||
        Boolean(
          predicted &&
            predicted.getTime() - Date.now() <= 7 * 86_400_000,
        ));

    return { programme, remaining, predicted, overdue, dueSoon };
  }, [assignment, currentHours, estimatedHoursPerWeek]);

  async function assignProgramme() {
    if (!selectedProgrammeId || assignment) return;

    setSaving(true);
    setError("");
    setMessage("");

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
    } else {
      setSelectedProgrammeId("");
      setMessage("Service programme assigned.");
      await load();
    }

    setSaving(false);
  }

  async function removeAssignment() {
    if (!assignment) return;

    const { error: updateError } = await supabase
      .from("machine_service_programmes")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", assignment.id)
      .eq("company_id", companyId);

    if (updateError) setError(updateError.message);
    else await load();
  }

  async function createServiceJob() {
    if (!assignment || !status) return;

    setSaving(true);
    setError("");
    setMessage("");

    const checklist = items.map((item) => ({
      id: item.id,
      description: item.description,
      completed: false,
    }));

    const { data, error: insertError } = await supabase
      .from("jobs")
      .insert({
        company_id: companyId,
        customer_id: customerId,
        machine_id: machineId,
        status: "open",
        priority: status.overdue ? "high" : "normal",
        fault_reported: `Scheduled service — ${status.programme.name}`,
        machine_hours: currentHours,
        service_programme_assignment_id: assignment.id,
        service_programme_name: status.programme.name,
        service_checklist: checklist,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data?.id) {
      window.location.href = `/jobs/${data.id}`;
    }

    setSaving(false);
  }

  async function markCompleted() {
    if (!assignment || !status) return;

    setSaving(true);
    setError("");
    setMessage("");

    const today = new Date().toISOString().slice(0, 10);

    const [assignmentResult, eventResult] = await Promise.all([
      supabase
        .from("machine_service_programmes")
        .update({
          last_service_hours: currentHours,
          last_service_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignment.id)
        .eq("company_id", companyId),

      supabase.from("machine_service_events").insert({
        company_id: companyId,
        machine_id: machineId,
        programme_id: assignment.programme_id,
        assignment_id: assignment.id,
        service_name: status.programme.name,
        service_date: today,
        service_hours: currentHours,
        checklist: items.map((item) => ({
          description: item.description,
          completed: true,
        })),
      }),
    ]);

    const resultError = assignmentResult.error || eventResult.error;

    if (resultError) {
      setError(resultError.message);
    } else {
      setMessage("Service completion recorded and next interval calculated.");
      await load();
    }

    setSaving(false);
  }

  return (
    <Card className="p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          Service planning
        </p>
        <h2 className="mt-1 text-xl font-bold">Service programme</h2>
        <p className="mt-1 text-sm text-slate-500">
          One active programme for {machineMake} {machineModel}.
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Loading service programme…</p>
      ) : !assignment ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedProgrammeId}
            onChange={(event) => setSelectedProgrammeId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5"
          >
            <option value="">Select service programme</option>
            {programmes.map((programme) => (
              <option key={programme.id} value={programme.id}>
                {programme.name}
              </option>
            ))}
          </select>

          <Button
            type="button"
            disabled={saving || !selectedProgrammeId}
            onClick={() => void assignProgramme()}
          >
            Assign
          </Button>
        </div>
      ) : status ? (
        <div className="mt-5">
          <div
            className={`rounded-2xl border p-5 ${
              status.overdue
                ? "border-red-200 bg-red-50"
                : status.dueSoon
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-bold text-slate-950">
                  {status.programme.name}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {status.overdue
                    ? "Overdue"
                    : status.dueSoon
                      ? "Due soon"
                      : "On schedule"}
                </p>
              </div>

              <Link
                href={`/customers/${customerId}/machines/${machineId}/timeline`}
                className="text-sm font-bold text-emerald-700 hover:underline"
              >
                View history
              </Link>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/75 p-3">
                <dt className="text-xs text-slate-500">Current hours</dt>
                <dd className="mt-1 font-bold">
                  {currentHours.toLocaleString()} hrs
                </dd>
              </div>

              <div className="rounded-xl bg-white/75 p-3">
                <dt className="text-xs text-slate-500">Hours remaining</dt>
                <dd className="mt-1 font-bold">
                  {status.remaining === null
                    ? "Date based"
                    : `${Math.round(status.remaining)} hrs`}
                </dd>
              </div>

              <div className="rounded-xl bg-white/75 p-3">
                <dt className="text-xs text-slate-500">Predicted due</dt>
                <dd className="mt-1 font-bold">
                  {status.predicted
                    ? formatDate(status.predicted)
                    : "Not enough data"}
                </dd>
              </div>
            </dl>

            {items.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Checklist
                </p>
                <ul className="mt-2 space-y-2 text-sm">
                  {items.map((item) => (
                    <li key={item.id}>• {item.description}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={saving}
                onClick={() => void createServiceJob()}
              >
                Create service job
              </Button>

              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => void markCompleted()}
              >
                Record completed service
              </Button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void removeAssignment()}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
              >
                Remove programme
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
