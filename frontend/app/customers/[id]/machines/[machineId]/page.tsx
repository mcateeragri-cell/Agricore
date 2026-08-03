"use client";

import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";

import { useNavigationUser } from "@/Components/navigation/use-navigation-user";
import { supabase } from "@/lib/supabase";
import Card from "../../../../../Components/ui/Card";
import EditMachineModal from "./EditMachineModal";
import HourHistory from "./HourHistory";
import MachineDetails from "./MachineDetails";
import MachineHeader from "./MachineHeader";
import MachineInsightsLinks from "./MachineInsightsLinks";
import MachineIntelligencePanel from "./MachineIntelligencePanel";
import MachineNotes from "./MachineNotes";
import RecordHoursModal from "./RecordHoursModal";
import {
  emptyHourReadingForm,
  emptyMachineForm,
  getTodayDate,
  type Customer,
  type HourReading,
  type HourReadingForm,
  type Machine,
  type MachineForm,
} from "./types";
import ServiceProgrammesPanel from "./ServiceProgrammesPanel";

export default function MachineProfilePage() {
  const params = useParams<{
    id: string;
    machineId: string;
  }>();

  const customerId = params.id;
  const machineId = params.machineId;

  const {
    userState,
    loading: companyLoading,
  } = useNavigationUser();

  const companyId =
    userState.activeCompany?.id ?? "";

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [machine, setMachine] =
    useState<Machine | null>(null);

  const [hourReadings, setHourReadings] =
    useState<HourReading[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [showEditForm, setShowEditForm] =
    useState(false);

  const [machineForm, setMachineForm] =
    useState<MachineForm>(
      emptyMachineForm,
    );

  const [isSaving, setIsSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState("");

  const [showHourForm, setShowHourForm] =
    useState(false);

  const [hourForm, setHourForm] =
    useState<HourReadingForm>(
      emptyHourReadingForm,
    );

  const [isSavingHours, setIsSavingHours] =
    useState(false);

  const [hourError, setHourError] =
    useState("");

  const loadMachineProfile =
    useCallback(async () => {
      if (companyLoading) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      if (!companyId) {
        setCustomer(null);
        setMachine(null);
        setHourReadings([]);
        setErrorMessage(
          "No active company is selected.",
        );
        setIsLoading(false);
        return;
      }

      const [
        customerResult,
        machineResult,
        hourReadingsResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id, contact_name, business_name",
          )
          .eq("id", customerId)
          .eq("company_id", companyId)
          .maybeSingle(),

        supabase
          .from("machines")
          .select("*")
          .eq("id", machineId)
          .eq(
            "customer_id",
            customerId,
          )
          .eq(
            "company_id",
            companyId,
          )
          .maybeSingle(),

        supabase
          .from(
            "machine_hour_readings",
          )
          .select(
            "id, hours, reading_date, source, notes, created_at",
          )
          .eq(
            "machine_id",
            machineId,
          )
          .eq(
            "company_id",
            companyId,
          )
          .order("reading_date", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          }),
      ]);

      const errors = [
        customerResult.error
          ? `Unable to load customer: ${customerResult.error.message}`
          : "",
        machineResult.error
          ? `Unable to load machine: ${machineResult.error.message}`
          : "",
        hourReadingsResult.error
          ? `Unable to load hour history: ${hourReadingsResult.error.message}`
          : "",
      ].filter(Boolean);

      setErrorMessage(
        errors.join(" "),
      );

      if (customerResult.data) {
        setCustomer({
          id: customerResult.data.id,
          contactName:
            customerResult.data
              .contact_name ?? "",
          businessName:
            customerResult.data
              .business_name ?? "",
        });
      } else {
        setCustomer(null);
      }

      if (machineResult.data) {
        setMachine({
          id: machineResult.data.id,
          customerId:
            machineResult.data
              .customer_id,
          make:
            machineResult.data.make ??
            "",
          model:
            machineResult.data.model ??
            "",
          machineType:
            machineResult.data
              .machine_type ??
            "Other",
          year:
            machineResult.data.year ===
              null ||
            machineResult.data.year ===
              undefined
              ? ""
              : String(
                  machineResult.data
                    .year,
                ),
          registration:
            machineResult.data
              .registration ?? "",
          serialNumber:
            machineResult.data
              .serial_number ?? "",
          hours:
            machineResult.data.hours ===
              null ||
            machineResult.data.hours ===
              undefined
              ? ""
              : String(
                  machineResult.data
                    .hours,
                ),
          usageProfile:
            machineResult.data.usage_profile ?? "medium",
          estimatedHoursPerWeek: String(
            machineResult.data.estimated_hours_per_week ?? 25,
          ),
          notes:
            machineResult.data.notes ??
            "",
        });
      } else {
        setMachine(null);
      }

      const loadedHourReadings: HourReading[] =
        (
          hourReadingsResult.data ??
          []
        ).map((reading) => ({
          id: reading.id,
          hours: Number(
            reading.hours,
          ),
          readingDate:
            reading.reading_date,
          source:
            reading.source ??
            "manual",
          notes:
            reading.notes ?? "",
          createdAt:
            reading.created_at ?? "",
        }));

      setHourReadings(
        loadedHourReadings,
      );

      setIsLoading(false);
    }, [
      companyId,
      companyLoading,
      customerId,
      machineId,
    ]);

  useEffect(() => {
    if (!companyLoading) {
      void loadMachineProfile();
    }
  }, [
    companyLoading,
    loadMachineProfile,
  ]);

  function openEditForm() {
    if (!machine) {
      return;
    }

    setMachineForm({
      make: machine.make,
      model: machine.model,
      machineType:
        machine.machineType,
      year: machine.year,
      registration:
        machine.registration,
      serialNumber:
        machine.serialNumber,
      hours: machine.hours,
      usageProfile: machine.usageProfile,
      estimatedHoursPerWeek: machine.estimatedHoursPerWeek,
      notes: machine.notes,
    });

    setSaveError("");
    setShowEditForm(true);
  }

  function closeEditForm() {
    if (isSaving) {
      return;
    }

    setShowEditForm(false);
    setSaveError("");
  }

  function updateMachineForm(
    field: keyof MachineForm,
    value: string,
  ) {
    setMachineForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !machineForm.make.trim() ||
      !machineForm.model.trim()
    ) {
      setSaveError(
        "Machine make and model are required.",
      );
      return;
    }

    if (!companyId) {
      setSaveError(
        "No active company is selected.",
      );
      return;
    }

    const yearValue =
      machineForm.year.trim()
        ? Number(machineForm.year)
        : null;

    const hoursValue =
      machineForm.hours.trim()
        ? Number(machineForm.hours)
        : null;

    const estimatedHoursPerWeek = Number(
      machineForm.estimatedHoursPerWeek,
    );

    if (
      yearValue !== null &&
      Number.isNaN(yearValue)
    ) {
      setSaveError(
        "Enter a valid machine year.",
      );
      return;
    }

    if (
      !Number.isFinite(estimatedHoursPerWeek) ||
      estimatedHoursPerWeek < 0
    ) {
      setSaveError(
        "Enter valid estimated hours per week.",
      );
      return;
    }

    if (
      hoursValue !== null &&
      (Number.isNaN(hoursValue) ||
        hoursValue < 0)
    ) {
      setSaveError(
        "Enter a valid non-negative hour reading.",
      );
      return;
    }

    setIsSaving(true);
    setSaveError("");

    const { error } = await supabase
      .from("machines")
      .update({
        make:
          machineForm.make.trim(),
        model:
          machineForm.model.trim(),
        machine_type:
          machineForm.machineType,
        year: yearValue,
        registration:
          machineForm.registration
            .trim()
            .toUpperCase(),
        serial_number:
          machineForm.serialNumber
            .trim(),
        hours: hoursValue,
        usage_profile: machineForm.usageProfile,
        estimated_hours_per_week: estimatedHoursPerWeek,
        notes:
          machineForm.notes.trim(),
      })
      .eq("id", machineId)
      .eq(
        "customer_id",
        customerId,
      )
      .eq(
        "company_id",
        companyId,
      );

    if (error) {
      setSaveError(
        `Unable to update machine: ${error.message}`,
      );
      setIsSaving(false);
      return;
    }

    await loadMachineProfile();

    setShowEditForm(false);
    setIsSaving(false);
  }

  function openHourForm() {
    setHourForm({
      hours: machine?.hours ?? "",
      readingDate:
        getTodayDate(),
      source: "manual",
      notes: "",
    });

    setHourError("");
    setShowHourForm(true);
  }

  function closeHourForm() {
    if (isSavingHours) {
      return;
    }

    setShowHourForm(false);
    setHourError("");
  }

  function updateHourForm(
    field: keyof HourReadingForm,
    value: string,
  ) {
    setHourForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleHourSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!companyId) {
      setHourError(
        "No active company is selected.",
      );
      return;
    }

    const newHours = Number(
      hourForm.hours,
    );

    if (
      hourForm.hours.trim() ===
        "" ||
      Number.isNaN(newHours) ||
      newHours < 0
    ) {
      setHourError(
        "Enter a valid non-negative hour reading.",
      );
      return;
    }

    if (!hourForm.readingDate) {
      setHourError(
        "Choose the date the reading was taken.",
      );
      return;
    }

    const latestReading =
      hourReadings[0];

    if (
      latestReading &&
      newHours <
        latestReading.hours
    ) {
      setHourError(
        `The new reading cannot be lower than the latest reading of ${latestReading.hours.toLocaleString()} hours.`,
      );
      return;
    }

    setIsSavingHours(true);
    setHourError("");

    const {
      error: insertError,
    } = await supabase
      .from(
        "machine_hour_readings",
      )
      .insert({
        company_id: companyId,
        machine_id: machineId,
        hours: newHours,
        reading_date:
          hourForm.readingDate,
        source: hourForm.source,
        notes:
          hourForm.notes.trim() ||
          null,
      });

    if (insertError) {
      setHourError(
        `Unable to save hour reading: ${insertError.message}`,
      );
      setIsSavingHours(false);
      return;
    }

    const {
      error: machineUpdateError,
    } = await supabase
      .from("machines")
      .update({
        hours: newHours,
      })
      .eq("id", machineId)
      .eq(
        "customer_id",
        customerId,
      )
      .eq(
        "company_id",
        companyId,
      );

    if (machineUpdateError) {
      setHourError(
        `The history was saved, but the machine's current hours could not be updated: ${machineUpdateError.message}`,
      );
      setIsSavingHours(false);
      return;
    }

    await loadMachineProfile();

    setShowHourForm(false);
    setHourForm(
      emptyHourReadingForm,
    );
    setIsSavingHours(false);
  }

  if (
    isLoading ||
    companyLoading
  ) {
    return (
      <main className="p-6 lg:p-8">
        <Card className="p-10 text-center">
          <p className="font-semibold text-slate-700">
            Loading machine...
          </p>
        </Card>
      </main>
    );
  }

  if (!machine || !customer) {
    return (
      <main className="p-6 lg:p-8">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold">
            Machine not found
          </h1>

          <p className="mt-2 text-slate-500">
            This machine could not be found for the selected customer.
          </p>

          {errorMessage && (
            <p className="mt-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <Link
            href={`/customers/${customerId}`}
            className="mt-5 inline-block font-semibold text-[#176b4d] hover:underline"
          >
            ← Back to customer
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6 lg:p-8">
      <MachineHeader
        customer={customer}
        machine={machine}
        onEdit={openEditForm}
        onRecordHours={openHourForm}
      />

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <nav className="overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-6 text-sm font-semibold">
          <button
            type="button"
            className="border-b-2 border-[#176b4d] px-1 pb-3 text-[#176b4d]"
          >
            Overview
          </button>

          <button
            type="button"
            className="px-1 pb-3 text-slate-500"
          >
            Jobs
          </button>

          <button
            type="button"
            className="px-1 pb-3 text-slate-500"
          >
            Service
          </button>

          <button
            type="button"
            className="px-1 pb-3 text-slate-500"
          >
            Parts
          </button>

          <button
            type="button"
            className="px-1 pb-3 text-slate-500"
          >
            Photos
          </button>

          <button
            type="button"
            className="px-1 pb-3 text-slate-500"
          >
            Documents
          </button>
        </div>
      </nav>

      <section className="grid gap-6 xl:grid-cols-3">
        <MachineDetails machine={machine} />

        <MachineIntelligencePanel
          companyId={companyId}
          customerId={customer.id}
          machineId={machine.id}
        />
      </section>

      <HourHistory
        readings={hourReadings}
        onRecordHours={
          openHourForm
        }
      />

      <MachineInsightsLinks
        customerId={customer.id}
        machineId={machine.id}
      />

      <ServiceProgrammesPanel
        companyId={companyId}
        machineId={machine.id}
        machineMake={machine.make}
        machineModel={machine.model}
        currentHours={Number(machine.hours || 0)}
        estimatedHoursPerWeek={Number(
          machine.estimatedHoursPerWeek || 0,
        )}
      />

      <section>
        <MachineNotes notes={machine.notes} />
      </section>

      {showEditForm && (
        <EditMachineModal
          form={machineForm}
          isSaving={isSaving}
          errorMessage={saveError}
          onChange={
            updateMachineForm
          }
          onClose={closeEditForm}
          onSubmit={
            handleEditSubmit
          }
        />
      )}

      {showHourForm && (
        <RecordHoursModal
          machine={machine}
          form={hourForm}
          isSaving={isSavingHours}
          errorMessage={hourError}
          onChange={
            updateHourForm
          }
          onClose={closeHourForm}
          onSubmit={
            handleHourSubmit
          }
        />
      )}
    </main>
  );
}