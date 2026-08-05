"use client";

import FieldRolePageGate from "@/Components/auth/field-role-page-gate";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import Card from "../../../Components/ui/Card";

const isAdmin = true;

const CURRENT_ENGINEER = "James McAteer";
const DEFAULT_HOURLY_RATE = 65;

type RelatedCustomer = {
  id: string;
  contact_name: string | null;
  business_name: string | null;
  phone: string | null;
  email: string | null;
};

type RelatedMachine = {
  id: string;
  make: string | null;
  model: string | null;
  registration: string | null;
  serial_number: string | null;
};

type JobRecord = {
  id: string;
  job_number: string;
  status: string;
  priority: string;
  engineer_name: string | null;
  fault_reported: string | null;
  diagnosis: string | null;
  work_carried_out: string | null;
  machine_hours: number | null;
  opened_date: string | null;
  completed_date: string | null;
  invoice_status: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  customers: RelatedCustomer | RelatedCustomer[] | null;
  machines: RelatedMachine | RelatedMachine[] | null;
};


type LinkedInvoice = {
  id: string;
  invoice_number: string;
  status: string;
  total: number | string | null;
  amount_paid: number | string | null;
  stripe_payment_url: string | null;
};

type LabourEntry = {
  id: string;
  job_id: string;
  engineer_name: string;
  labour_date: string;
  hours: number | string | null;
  hourly_rate: number | string;
  description: string | null;
  start_time: string | null;
  finish_time: string | null;
  break_minutes: number | string;
  entry_status: "running" | "completed";
  manually_adjusted: boolean;
  adjustment_reason: string | null;
  adjusted_by: string | null;
  adjusted_at: string | null;
  created_at: string;
  updated_at: string;
};

type LabourFormState = {
  id: string | null;
  engineerName: string;
  labourDate: string;
  startTime: string;
  finishTime: string;
  breakMinutes: string;
  hourlyRate: string;
  description: string;
  adjustmentReason: string;
};
type JobPart = {
  id: string;
  job_id: string;
  stock_item_id: string | null;
  quantity: number | string;
  part_number: string | null;
  description: string;
  unit_cost: number | string;
  unit_price: number | string;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type StockItemOption = {
  id: string;
  part_number: string | null;
  description: string;
  supplier: string | null;
  unit_cost: number;
  unit_price: number;
  quantity_in_stock: number;
  active: boolean;
};

type PartFormState = {
  id: string | null;
  stock_item_id: string;
  quantity: string;
  partNumber: string;
  description: string;
  unitCost: string;
  unitPrice: string;
  supplier: string;
  notes: string;
};

const emptyPartForm: PartFormState = {
  id: null,
  stock_item_id: "",
  quantity: "1",
  partNumber: "",
  description: "",
  unitCost: "0",
  unitPrice: "0",
  supplier: "",
  notes: "",
};

const emptyLabourForm: LabourFormState = {
  id: null,
  engineerName: CURRENT_ENGINEER,
  labourDate: getTodayDate(),
  startTime: "",
  finishTime: "",
  breakMinutes: "0",
  hourlyRate: String(DEFAULT_HOURLY_RATE),
  description: "",
  adjustmentReason: "",
};

function getTodayDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
}

function getCurrentTime() {
  const now = new Date();

  return now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getRelatedRecord<T>(value: T | T[] | null): T | null {
  if (!value) return null;

  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatHours(value: number | string | null) {
  if (value === null) return "Running";

  return `${asNumber(value).toFixed(2)} hrs`;
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isoToTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isoToDate(value: string | null) {
  if (!value) return getTodayDate();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getTodayDate();
  }

  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
}

function combineDateAndTime(date: string, time: string) {
  if (!date || !time) return null;

  const combined = new Date(`${date}T${time}:00`);

  if (Number.isNaN(combined.getTime())) {
    return null;
  }

  return combined.toISOString();
}

function calculateHours(
  date: string,
  startTime: string,
  finishTime: string,
  breakMinutes: number
) {
  const start = combineDateAndTime(date, startTime);
  const finish = combineDateAndTime(date, finishTime);

  if (!start || !finish) return null;

  const startDate = new Date(start);
  let finishDate = new Date(finish);

  if (finishDate <= startDate) {
    finishDate = new Date(
      finishDate.getTime() + 24 * 60 * 60 * 1000
    );
  }

  const totalMinutes =
    (finishDate.getTime() - startDate.getTime()) / 60_000 -
    breakMinutes;

  if (totalMinutes <= 0) return null;

  return Math.round((totalMinutes / 60) * 100) / 100;
}

function getStatusClasses(status: string) {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-700";
    case "in_progress":
      return "bg-amber-100 text-amber-700";
    case "waiting_parts":
      return "bg-orange-100 text-orange-700";
    case "waiting_customer":
      return "bg-purple-100 text-purple-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-gray-100 text-slate-600 dark:text-slate-400";
    default:
      return "bg-gray-100 text-slate-700 dark:text-slate-300";
  }
}

function getPriorityClasses(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "low":
      return "bg-gray-100 text-slate-600 dark:text-slate-400";
    default:
      return "bg-green-50 text-green-700";
  }
}

function JobDetailPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params.id;

  const [job, setJob] = useState<JobRecord | null>(null);
  const [labourEntries, setLabourEntries] = useState<LabourEntry[]>(
    []
  );
  const [partsUsed, setPartsUsed] = useState<JobPart[]>([]);
  const [stockItems, setStockItems] = useState<StockItemOption[]>([]);
  const [linkedInvoice, setLinkedInvoice] = useState<LinkedInvoice | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [savingLabour, setSavingLabour] = useState(false);
  const [timerBusy, setTimerBusy] = useState(false);
  const [deletingLabourId, setDeletingLabourId] = useState<
    string | null
  >(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("normal");
  const [engineerName, setEngineerName] = useState("");
  const [machineHours, setMachineHours] = useState("");
  const [faultReported, setFaultReported] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [workCarriedOut, setWorkCarriedOut] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [labourModalOpen, setLabourModalOpen] = useState(false);
  const [labourForm, setLabourForm] =
    useState<LabourFormState>(emptyLabourForm);

  const [partModalOpen, setPartModalOpen] = useState(false);
  const [partForm, setPartForm] =
    useState<PartFormState>(emptyPartForm);
  const [savingPart, setSavingPart] = useState(false);
  const [deletingPartId, setDeletingPartId] = useState<
    string | null
  >(null);

  const runningEntry =
    labourEntries.find(
      (entry) =>
        entry.entry_status === "running" &&
        entry.engineer_name === CURRENT_ENGINEER
    ) ?? null;

  const totalLabourHours = useMemo(
    () =>
      labourEntries.reduce(
        (total, entry) =>
          total +
          (entry.entry_status === "completed"
            ? asNumber(entry.hours)
            : 0),
        0
      ),
    [labourEntries]
  );

  const totalLabourValue = useMemo(
    () =>
      labourEntries.reduce(
        (total, entry) =>
          total +
          (entry.entry_status === "completed"
            ? asNumber(entry.hours) *
              asNumber(entry.hourly_rate)
            : 0),
        0
      ),
    [labourEntries]
  );
const totalPartsCost = useMemo(
  () =>
    partsUsed.reduce(
      (total, part) =>
        total +
        asNumber(part.quantity) *
          asNumber(part.unit_cost),
      0
    ),
  [partsUsed]
);

const totalPartsValue = useMemo(
  () =>
    partsUsed.reduce(
      (total, part) =>
        total +
        asNumber(part.quantity) *
          asNumber(part.unit_price),
      0
    ),
  [partsUsed]
);

const totalPartsProfit =
  totalPartsValue - totalPartsCost;

  const loadPageData = useCallback(
    async (showFullLoader = true) => {
      if (showFullLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage("");

    const [
      jobResult,
      labourResult,
      partsResult,
      stockResult,
      invoiceResult,
    ] = await Promise.all([
      supabase
        .from("jobs")
        .select(`
          id,
          job_number,
          status,
          priority,
          engineer_name,
          fault_reported,
          diagnosis,
          work_carried_out,
          machine_hours,
          opened_date,
          completed_date,
          invoice_status,
          internal_notes,
          created_at,
          updated_at,
          customers (
            id,
            contact_name,
            business_name,
            phone,
            email
          ),
          machines (
            id,
            make,
            model,
            registration,
            serial_number
          )
        `)
        .eq("id", jobId)
        .single(),

      supabase
        .from("job_labour_entries")
        .select("*")
        .eq("job_id", jobId)
        .order("labour_date", { ascending: false })
        .order("start_time", { ascending: false }),

      supabase
        .from("job_parts_used")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false }),

      supabase
        .from("stock_items")
        .select(`
          id,
          part_number,
          description,
          supplier,
          unit_cost,
          unit_price,
          quantity_in_stock,
          active
        `)
        .eq("active", true)
        .order("description", { ascending: true }),

      supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          status,
          total,
          amount_paid,
          stripe_payment_url
        `)
        .eq("job_id", jobId)
        .neq("status", "void")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (jobResult.error) {
      console.error("Unable to load job:", jobResult.error);
      setErrorMessage(jobResult.error.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (labourResult.error) {
      console.error(
        "Unable to load labour:",
        labourResult.error
      );
      setErrorMessage(labourResult.error.message);
    }

    if (partsResult.error) {
      console.error(
        "Unable to load parts:",
        partsResult.error
      );
      setErrorMessage(partsResult.error.message);
    }

    if (stockResult.error) {
      console.error(
        "Unable to load stock:",
        stockResult.error
      );
      setErrorMessage(stockResult.error.message);
    }

    if (invoiceResult.error) {
      console.error(
        "Unable to load linked invoice:",
        invoiceResult.error
      );
      setErrorMessage(invoiceResult.error.message);
    }

      const loadedJob = jobResult.data as JobRecord;

      setJob(loadedJob);
      setLabourEntries(
        (labourResult.data ?? []) as LabourEntry[]
      );
      setPartsUsed(
        (partsResult.data ?? []) as JobPart[]
      );
      setStockItems(
        (stockResult.data ?? []) as StockItemOption[]
      );
      setLinkedInvoice(
        invoiceResult.data
          ? (invoiceResult.data as LinkedInvoice)
          : null
      );

      setStatus(loadedJob.status ?? "open");
      setPriority(loadedJob.priority ?? "normal");
      setEngineerName(loadedJob.engineer_name ?? "");

      setMachineHours(
        loadedJob.machine_hours !== null &&
          loadedJob.machine_hours !== undefined
          ? String(loadedJob.machine_hours)
          : ""
      );

      setFaultReported(loadedJob.fault_reported ?? "");
      setDiagnosis(loadedJob.diagnosis ?? "");
      setWorkCarriedOut(loadedJob.work_carried_out ?? "");
      setInternalNotes(loadedJob.internal_notes ?? "");

      setLoading(false);
      setRefreshing(false);
    },
    [jobId]
  );

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  function showSuccess(message: string) {
    setSuccessMessage(message);

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  }

  async function handleSaveJob(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const parsedHours =
      machineHours.trim() === ""
        ? null
        : Number(machineHours);

    if (
      parsedHours !== null &&
      (!Number.isFinite(parsedHours) || parsedHours < 0)
    ) {
      setErrorMessage(
        "Enter a valid machine-hours figure."
      );
      return;
    }

    if (!faultReported.trim()) {
      setErrorMessage(
        "Enter the reported fault or work requested."
      );
      return;
    }

    setSavingJob(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (
      status === "completed" &&
      runningEntry
    ) {
      setErrorMessage(
        "Stop the running labour timer before completing the job."
      );
      setSavingJob(false);
      return;
    }

    if (
      status === "completed" &&
      !workCarriedOut.trim()
    ) {
      setErrorMessage(
        "Record the work carried out before completing the job."
      );
      setSavingJob(false);
      return;
    }

    const completedDate =
      status === "completed"
        ? job?.completed_date ?? new Date().toISOString()
        : null;

    const nextInvoiceStatus =
      status === "completed"
        ? linkedInvoice
          ? job?.invoice_status ?? "ready"
          : "ready"
        : linkedInvoice
          ? job?.invoice_status ?? "not_ready"
          : "not_ready";

    const { error } = await supabase
      .from("jobs")
      .update({
        status,
        priority,
        engineer_name: engineerName.trim() || null,
        machine_hours: parsedHours,
        fault_reported: faultReported.trim() || null,
        diagnosis: diagnosis.trim() || null,
        work_carried_out: workCarriedOut.trim() || null,
        internal_notes: internalNotes.trim() || null,
        completed_date: completedDate,
        invoice_status: nextInvoiceStatus,
      })
      .eq("id", jobId);

    if (error) {
      console.error("Unable to update job:", error);
      setErrorMessage(error.message);
      setSavingJob(false);
      return;
    }

    setSavingJob(false);
    showSuccess("Job card saved successfully.");
    await loadPageData(false);
  }

  async function handleStartTimer() {
    if (runningEntry) {
      setErrorMessage(
        "You already have a running labour timer on this job."
      );
      return;
    }

    setTimerBusy(true);
    setErrorMessage("");
    setSuccessMessage("");

    const now = new Date();

    const { error } = await supabase
      .from("job_labour_entries")
      .insert({
        job_id: jobId,
        engineer_name: CURRENT_ENGINEER,
        labour_date: getTodayDate(),
        start_time: now.toISOString(),
        finish_time: null,
        break_minutes: 0,
        hours: null,
        hourly_rate: DEFAULT_HOURLY_RATE,
        description: null,
        entry_status: "running",
      });

    if (error) {
      console.error("Unable to start timer:", error);
      setErrorMessage(error.message);
      setTimerBusy(false);
      return;
    }

    setTimerBusy(false);
    showSuccess("Labour timer started.");
    await loadPageData(false);
  }

  async function handleStopTimer() {
    if (!runningEntry?.start_time) return;

    setTimerBusy(true);
    setErrorMessage("");
    setSuccessMessage("");

    const finishTime = new Date();
    const startTime = new Date(runningEntry.start_time);
    const breakMinutes = asNumber(runningEntry.break_minutes);

    const workedMinutes =
      (finishTime.getTime() - startTime.getTime()) / 60_000 -
      breakMinutes;

    if (workedMinutes <= 0) {
      setErrorMessage(
        "The calculated labour time must be greater than zero."
      );
      setTimerBusy(false);
      return;
    }

    const hours =
      Math.round((workedMinutes / 60) * 100) / 100;

    const { error } = await supabase
      .from("job_labour_entries")
      .update({
        finish_time: finishTime.toISOString(),
        hours,
        entry_status: "completed",
      })
      .eq("id", runningEntry.id);

    if (error) {
      console.error("Unable to stop timer:", error);
      setErrorMessage(error.message);
      setTimerBusy(false);
      return;
    }

    setTimerBusy(false);
    showSuccess(
      `Labour timer stopped at ${hours.toFixed(2)} hours.`
    );
    await loadPageData(false);
  }

  function openAddLabourModal() {
    setLabourForm({
      ...emptyLabourForm,
      labourDate: getTodayDate(),
      startTime: getCurrentTime(),
      finishTime: "",
    });

    setErrorMessage("");
    setLabourModalOpen(true);
  }

  function openEditLabourModal(entry: LabourEntry) {
    if (!isAdmin) return;

    setLabourForm({
      id: entry.id,
      engineerName: entry.engineer_name,
      labourDate:
        entry.labour_date || isoToDate(entry.start_time),
      startTime: isoToTime(entry.start_time),
      finishTime: isoToTime(entry.finish_time),
      breakMinutes: String(
        asNumber(entry.break_minutes)
      ),
      hourlyRate: String(asNumber(entry.hourly_rate)),
      description: entry.description ?? "",
      adjustmentReason: "",
    });

    setErrorMessage("");
    setLabourModalOpen(true);
  }

  function closeLabourModal() {
    if (savingLabour) return;

    setLabourModalOpen(false);
    setLabourForm(emptyLabourForm);
  }

  async function handleSaveLabour(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const breakMinutes = Number(
      labourForm.breakMinutes || 0
    );

    const hourlyRate = Number(
      labourForm.hourlyRate || DEFAULT_HOURLY_RATE
    );

    if (!labourForm.engineerName.trim()) {
      setErrorMessage("Select an engineer.");
      return;
    }

    if (
      !labourForm.labourDate ||
      !labourForm.startTime ||
      !labourForm.finishTime
    ) {
      setErrorMessage(
        "Enter the labour date, start time and finish time."
      );
      return;
    }

    if (
      !Number.isFinite(breakMinutes) ||
      breakMinutes < 0
    ) {
      setErrorMessage(
        "Enter a valid break duration."
      );
      return;
    }

    if (
      !Number.isFinite(hourlyRate) ||
      hourlyRate < 0
    ) {
      setErrorMessage("Enter a valid hourly rate.");
      return;
    }

    const hours = calculateHours(
      labourForm.labourDate,
      labourForm.startTime,
      labourForm.finishTime,
      breakMinutes
    );

    if (hours === null || hours <= 0) {
      setErrorMessage(
        "The finish time must produce a positive number of worked hours."
      );
      return;
    }

    if (
      labourForm.id &&
      isAdmin &&
      !labourForm.adjustmentReason.trim()
    ) {
      setErrorMessage(
        "Enter a reason for changing this labour entry."
      );
      return;
    }

    const startTime = combineDateAndTime(
      labourForm.labourDate,
      labourForm.startTime
    );

    let finishTime = combineDateAndTime(
      labourForm.labourDate,
      labourForm.finishTime
    );

    if (!startTime || !finishTime) {
      setErrorMessage("Enter valid start and finish times.");
      return;
    }

    if (new Date(finishTime) <= new Date(startTime)) {
      finishTime = new Date(
        new Date(finishTime).getTime() +
          24 * 60 * 60 * 1000
      ).toISOString();
    }

    setSavingLabour(true);
    setErrorMessage("");
    setSuccessMessage("");

    const labourData = {
      job_id: jobId,
      engineer_name: labourForm.engineerName.trim(),
      labour_date: labourForm.labourDate,
      start_time: startTime,
      finish_time: finishTime,
      break_minutes: breakMinutes,
      hours,
      hourly_rate: isAdmin
        ? hourlyRate
        : DEFAULT_HOURLY_RATE,
      description:
        labourForm.description.trim() || null,
      entry_status: "completed",
    };

    if (labourForm.id) {
      const { error } = await supabase
        .from("job_labour_entries")
        .update({
          ...labourData,
          manually_adjusted: true,
          adjustment_reason:
            labourForm.adjustmentReason.trim(),
          adjusted_by: CURRENT_ENGINEER,
          adjusted_at: new Date().toISOString(),
        })
        .eq("id", labourForm.id);

      if (error) {
        console.error("Unable to update labour:", error);
        setErrorMessage(error.message);
        setSavingLabour(false);
        return;
      }

      showSuccess("Labour entry updated.");
    } else {
      const { error } = await supabase
        .from("job_labour_entries")
        .insert({
          ...labourData,
          manually_adjusted: false,
        });

      if (error) {
        console.error("Unable to add labour:", error);
        setErrorMessage(error.message);
        setSavingLabour(false);
        return;
      }

      showSuccess("Labour entry added.");
    }

    setSavingLabour(false);
    setLabourModalOpen(false);
    setLabourForm(emptyLabourForm);

    await loadPageData(false);
  }

  async function handleDeleteLabour(entry: LabourEntry) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Delete the labour entry for ${entry.engineer_name}?`
    );

    if (!confirmed) return;

    setDeletingLabourId(entry.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("job_labour_entries")
      .delete()
      .eq("id", entry.id);

    if (error) {
      console.error("Unable to delete labour:", error);
      setErrorMessage(error.message);
      setDeletingLabourId(null);
      return;
    }

    setDeletingLabourId(null);
    showSuccess("Labour entry deleted.");
    await loadPageData(false);
  }
function openAddPartModal() {
  setPartForm(emptyPartForm);
  setErrorMessage("");
  setPartModalOpen(true);
}

function openEditPartModal(part: JobPart) {
  if (!isAdmin) return;

  setPartForm({
    id: part.id,
    stock_item_id: part.stock_item_id ?? "",
    quantity: String(asNumber(part.quantity)),
    partNumber: part.part_number ?? "",
    description: part.description,
    unitCost: String(asNumber(part.unit_cost)),
    unitPrice: String(asNumber(part.unit_price)),
    supplier: part.supplier ?? "",
    notes: part.notes ?? "",
  });

  setErrorMessage("");
  setPartModalOpen(true);
}

function closePartModal() {
  if (savingPart) return;

  setPartModalOpen(false);
  setPartForm(emptyPartForm);
}

async function handleSavePart(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  const quantity = Number(partForm.quantity);
  const unitCost = Number(partForm.unitCost || 0);
  const unitPrice = Number(partForm.unitPrice || 0);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    setErrorMessage("Enter a valid quantity.");
    return;
  }

  if (!partForm.description.trim()) {
    setErrorMessage("Enter a part description.");
    return;
  }

  if (!Number.isFinite(unitCost) || unitCost < 0) {
    setErrorMessage("Enter a valid cost price.");
    return;
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    setErrorMessage("Enter a valid selling price.");
    return;
  }

  setSavingPart(true);
  setErrorMessage("");
  setSuccessMessage("");

  const partData = {
    job_id: jobId,
    stock_item_id: partForm.stock_item_id || null,
    quantity,
    part_number: partForm.partNumber.trim() || null,
    description: partForm.description.trim(),
    unit_cost: isAdmin ? unitCost : 0,
    unit_price: unitPrice,
    supplier: isAdmin
      ? partForm.supplier.trim() || null
      : null,
    notes: partForm.notes.trim() || null,
  };

  if (partForm.id) {
    const { error } = await supabase
      .from("job_parts_used")
      .update(partData)
      .eq("id", partForm.id);

    if (error) {
      console.error("Unable to update part:", error);
      setErrorMessage(error.message);
      setSavingPart(false);
      return;
    }

    showSuccess("Part updated successfully.");
  } else {
    const { error } = await supabase
      .from("job_parts_used")
      .insert(partData);

    if (error) {
      console.error("Unable to add part:", error);
      setErrorMessage(error.message);
      setSavingPart(false);
      return;
    }

    showSuccess("Part added to job.");
  }

  setSavingPart(false);
  setPartModalOpen(false);
  setPartForm(emptyPartForm);

  await loadPageData(false);
}

async function handleDeletePart(part: JobPart) {
  if (!isAdmin) return;

  const confirmed = window.confirm(
    `Delete ${part.description} from this job?`
  );

  if (!confirmed) return;

  setDeletingPartId(part.id);
  setErrorMessage("");
  setSuccessMessage("");

  const { error } = await supabase
    .from("job_parts_used")
    .delete()
    .eq("id", part.id);

  if (error) {
    console.error("Unable to delete part:", error);
    setErrorMessage(error.message);
    setDeletingPartId(null);
    return;
  }

  setDeletingPartId(null);
  showSuccess("Part removed from job.");
  await loadPageData(false);
}

async function handleCreateInvoice() {
  if (!job) return;

  if (linkedInvoice) {
    router.push(`/invoices/${linkedInvoice.id}`);
    return;
  }

  if (status !== "completed") {
    setErrorMessage(
      "Save the job as completed before creating an invoice."
    );
    return;
  }

  if (runningEntry) {
    setErrorMessage(
      "Stop the running labour timer before creating an invoice."
    );
    return;
  }

  if (totalLabourValue <= 0 && totalPartsValue <= 0) {
    setErrorMessage(
      "Add billable labour or parts before creating the invoice."
    );
    return;
  }

  setCreatingInvoice(true);
  setErrorMessage("");
  setSuccessMessage("");

  try {
    if (job.invoice_status !== "ready") {
      const { error: readyError } = await supabase
        .from("jobs")
        .update({
          status: "completed",
          invoice_status: "ready",
          completed_date:
            job.completed_date ?? new Date().toISOString(),
        })
        .eq("id", jobId);

      if (readyError) {
        throw new Error(readyError.message);
      }
    }

    const response = await fetch(
      `/api/office/invoices/from-job/${jobId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vatRate: 20,
          dueInDays: 7,
          paymentTerms: "Payment due within 7 days",
        }),
      }
    );

    const body = (await response.json()) as {
      invoice?: {
        id?: string;
      };
      error?: string;
    };

    if (
      response.status === 409 &&
      body.invoice?.id
    ) {
      router.push(`/invoices/${body.invoice.id}`);
      return;
    }

    if (!response.ok || !body.invoice?.id) {
      throw new Error(
        body.error ?? "Unable to create the invoice."
      );
    }

    router.push(`/invoices/${body.invoice.id}`);
  } catch (error) {
    setErrorMessage(
      error instanceof Error
        ? error.message
        : "Unable to create the invoice."
    );
  } finally {
    setCreatingInvoice(false);
  }
}
  if (loading) {
    return (
      <div className="py-20 text-center text-slate-600 dark:text-slate-400">
        Loading job card...
      </div>
    );
  }

  if (errorMessage && !job) {
    return (
      <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/jobs"
          className="text-sm font-semibold text-[#103d2e]"
        >
          ← Back to Jobs
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-800">
            Unable to load job
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const customer = getRelatedRecord(job.customers);
  const machine = getRelatedRecord(job.machines);

  const customerName = toTitleCase(
    customer?.business_name ||
      customer?.contact_name ||
      "Unknown customer"
  );

  const contactName = customer?.contact_name
    ? toTitleCase(customer.contact_name)
    : "";

  const machineName = toTitleCase(
    [machine?.make, machine?.model]
      .filter(Boolean)
      .join(" ") || "Unknown machine"
  );

  return (
    <>
      <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="min-w-0">
            <Link
              href="/jobs"
              className="mb-3 inline-flex text-sm font-semibold text-[#103d2e] transition hover:underline"
            >
              ← Back to Jobs
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {job.job_number}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                  status
                )}`}
              >
                {formatLabel(status)}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClasses(
                  priority
                )}`}
              >
                {formatLabel(priority)} priority
              </span>
            </div>

            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {customerName} · {machineName}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 self-start">
            <button
              type="button"
              onClick={() => void loadPageData(false)}
              disabled={
                refreshing || savingJob || timerBusy
              }
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="submit"
              form="job-form"
              disabled={
                savingJob || refreshing || timerBusy
              }
              className="rounded-xl bg-[#103d2e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c3024] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingJob ? "Saving..." : "Save Job"}
            </button>

            {linkedInvoice ? (
              <Link
                href={`/invoices/${linkedInvoice.id}`}
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Open Invoice
              </Link>
            ) : status === "completed" ? (
              <button
                type="button"
                onClick={() => void handleCreateInvoice()}
                disabled={
                  creatingInvoice ||
                  savingJob ||
                  refreshing ||
                  timerBusy
                }
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingInvoice
                  ? "Creating..."
                  : "Create Invoice"}
              </button>
            ) : null}
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
            {successMessage}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            <form
              id="job-form"
              onSubmit={handleSaveJob}
              className="space-y-5"
            >
              <Card>
                <div className="border-b pb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Job Control
                  </h2>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Update the status, priority and assigned
                    engineer.
                  </p>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="status"
                      className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Status
                    </label>

                    <select
                      id="status"
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">
                        In Progress
                      </option>
                      <option value="waiting_parts">
                        Waiting Parts
                      </option>
                      <option value="waiting_customer">
                        Waiting Customer
                      </option>
                      <option value="completed">
                        Completed
                      </option>
                      <option value="cancelled">
                        Cancelled
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="priority"
                      className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Priority
                    </label>

                    <select
                      id="priority"
                      value={priority}
                      onChange={(event) =>
                        setPriority(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                    >
                      <option value="low">Low</option>
                      <option value="normal">
                        Normal
                      </option>
                      <option value="high">High</option>
                      <option value="urgent">
                        Urgent
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="engineer"
                      className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Engineer
                    </label>

                    <select
                      id="engineer"
                      value={engineerName}
                      onChange={(event) =>
                        setEngineerName(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                    >
                      <option value="">Unassigned</option>
                      <option value="James McAteer">
                        James McAteer
                      </option>
                      <option value="Aiden Coady">
                        Aiden Coady
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="machineHours"
                      className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Machine Hours
                    </label>

                    <input
                      id="machineHours"
                      type="number"
                      min="0"
                      step="0.1"
                      value={machineHours}
                      onChange={(event) =>
                        setMachineHours(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Fault Reported
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  The customer’s reported fault or requested
                  work.
                </p>

                <textarea
                  value={faultReported}
                  onChange={(event) =>
                    setFaultReported(event.target.value)
                  }
                  rows={4}
                  required
                  className="mt-4 w-full resize-y rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-gray-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                  placeholder="Enter the reported fault..."
                />
              </Card>

              <Card>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Diagnosis
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Record tests carried out, findings and
                  confirmed faults.
                </p>

                <textarea
                  value={diagnosis}
                  onChange={(event) =>
                    setDiagnosis(event.target.value)
                  }
                  rows={5}
                  className="mt-4 w-full resize-y rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-gray-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                  placeholder="Enter diagnostic findings..."
                />
              </Card>

              <Card>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Work Carried Out
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Record repairs, adjustments and testing
                  completed.
                </p>

                <textarea
                  value={workCarriedOut}
                  onChange={(event) =>
                    setWorkCarriedOut(event.target.value)
                  }
                  rows={6}
                  className="mt-4 w-full resize-y rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-gray-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                  placeholder="Describe the work carried out..."
                />
              </Card>

              <Card>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Internal Notes
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Private notes for engineers and office
                  staff.
                </p>

                <textarea
                  value={internalNotes}
                  onChange={(event) =>
                    setInternalNotes(event.target.value)
                  }
                  rows={4}
                  className="mt-4 w-full resize-y rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-gray-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                  placeholder="Enter internal notes..."
                />
              </Card>
            </form>

            <Card>
              <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Labour
                  </h2>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Record engineer time spent on this job.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {runningEntry ? (
                    <button
                      type="button"
                      onClick={() => void handleStopTimer()}
                      disabled={timerBusy}
                      className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {timerBusy
                        ? "Stopping..."
                        : "■ Stop Job"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleStartTimer()}
                      disabled={timerBusy}
                      className="rounded-xl bg-[#103d2e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c3024] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {timerBusy
                        ? "Starting..."
                        : "▶ Start Job"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={openAddLabourModal}
                    className="rounded-xl border border-[#103d2e] bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-semibold text-[#103d2e] transition hover:bg-green-50"
                  >
                    + Add Labour
                  </button>
                </div>
              </div>

              {runningEntry && (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-green-800">
                        Labour timer running
                      </p>

                      <p className="mt-1 text-sm text-green-700">
                        {runningEntry.engineer_name} started at{" "}
                        {formatTime(runningEntry.start_time)}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-green-200 px-3 py-1 text-xs font-semibold text-green-800">
                      On Site
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      <th className="px-3 py-3 font-semibold">
                        Date
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        Engineer
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        Start
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        Finish
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        Break
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        Hours
                      </th>

                      {isAdmin && (
                        <>
                          <th className="px-3 py-3 font-semibold">
                            Rate
                          </th>
                          <th className="px-3 py-3 font-semibold">
                            Value
                          </th>
                        </>
                      )}

                      <th className="px-3 py-3 font-semibold">
                        Description
                      </th>

                      {isAdmin && (
                        <th className="px-3 py-3 text-right font-semibold">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {labourEntries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdmin ? 10 : 7}
                          className="px-3 py-10 text-center text-slate-600 dark:text-slate-400"
                        >
                          No labour has been recorded yet.
                        </td>
                      </tr>
                    ) : (
                      labourEntries.map((entry) => {
                        const hours = asNumber(entry.hours);
                        const rate = asNumber(entry.hourly_rate);
                        const value = hours * rate;

                        return (
                          <tr
                            key={entry.id}
                            className="align-top text-slate-700 dark:text-slate-300"
                          >
                            <td className="whitespace-nowrap px-3 py-4">
                              {formatDate(entry.labour_date)}
                            </td>

                            <td className="whitespace-nowrap px-3 py-4 font-medium text-slate-900 dark:text-slate-100">
                              {entry.engineer_name}
                            </td>

                            <td className="whitespace-nowrap px-3 py-4">
                              {formatTime(entry.start_time)}
                            </td>

                            <td className="whitespace-nowrap px-3 py-4">
                              {entry.entry_status === "running"
                                ? "Running"
                                : formatTime(entry.finish_time)}
                            </td>

                            <td className="whitespace-nowrap px-3 py-4">
                              {asNumber(entry.break_minutes)} min
                            </td>

                            <td className="whitespace-nowrap px-3 py-4 font-semibold text-slate-900 dark:text-slate-100">
                              {formatHours(entry.hours)}
                            </td>

                            {isAdmin && (
                              <>
                                <td className="whitespace-nowrap px-3 py-4">
                                  {formatCurrency(rate)}
                                </td>

                                <td className="whitespace-nowrap px-3 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                  {entry.entry_status === "running"
                                    ? "—"
                                    : formatCurrency(value)}
                                </td>
                              </>
                            )}

                            <td className="min-w-56 px-3 py-4">
                              <p>
                                {entry.description ||
                                  "No description"}
                              </p>

                              {entry.manually_adjusted && (
                                <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                  <p className="font-semibold">
                                    Manually adjusted
                                  </p>

                                  {entry.adjustment_reason && (
                                    <p className="mt-1">
                                      {
                                        entry.adjustment_reason
                                      }
                                    </p>
                                  )}

                                  {entry.adjusted_by && (
                                    <p className="mt-1 text-amber-700">
                                      By {entry.adjusted_by} ·{" "}
                                      {formatDateTime(
                                        entry.adjusted_at
                                      )}
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>

                            {isAdmin && (
                              <td className="whitespace-nowrap px-3 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditLabourModal(entry)
                                    }
                                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleDeleteLabour(
                                        entry
                                      )
                                    }
                                    disabled={
                                      deletingLabourId ===
                                      entry.id
                                    }
                                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                  >
                                    {deletingLabourId ===
                                    entry.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-end sm:justify-end">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Total Hours
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                    {totalLabourHours.toFixed(2)} hrs
                  </p>
                </div>

                {isAdmin && (
                  <div className="rounded-xl bg-green-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      Labour Value
                    </p>

                    <p className="mt-1 text-xl font-bold text-[#103d2e]">
                      {formatCurrency(totalLabourValue)}
                    </p>
                  </div>
                )}
              </div>
            </Card>
            <Card>
  <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Parts Used
      </h2>

      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Record parts, materials and consumables used on this
        job.
      </p>
    </div>

    <button
      type="button"
      onClick={openAddPartModal}
      className="rounded-xl border border-[#103d2e] bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-semibold text-[#103d2e] transition hover:bg-green-50"
    >
      + Add Part
    </button>
  </div>

  <div className="mt-5 overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
          <th className="px-3 py-3 font-semibold">
            Qty
          </th>

          <th className="px-3 py-3 font-semibold">
            Part Number
          </th>

          <th className="px-3 py-3 font-semibold">
            Description
          </th>

          {isAdmin && (
            <th className="px-3 py-3 font-semibold">
              Cost
            </th>
          )}

          <th className="px-3 py-3 font-semibold">
            Sell
          </th>

          <th className="px-3 py-3 font-semibold">
            Total
          </th>

          {isAdmin && (
            <>
              <th className="px-3 py-3 font-semibold">
                Profit
              </th>

              <th className="px-3 py-3 font-semibold">
                Supplier
              </th>

              <th className="px-3 py-3 text-right font-semibold">
                Actions
              </th>
            </>
          )}
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-100">
        {partsUsed.length === 0 ? (
          <tr>
            <td
              colSpan={isAdmin ? 9 : 5}
              className="px-3 py-10 text-center text-slate-600 dark:text-slate-400"
            >
              No parts have been added to this job.
            </td>
          </tr>
        ) : (
          partsUsed.map((part) => {
            const quantity = asNumber(part.quantity);
            const cost = asNumber(part.unit_cost);
            const price = asNumber(part.unit_price);

            const costTotal = quantity * cost;
            const salesTotal = quantity * price;
            const profit = salesTotal - costTotal;

            return (
              <tr
                key={part.id}
                className="align-top text-slate-700 dark:text-slate-300"
              >
                <td className="whitespace-nowrap px-3 py-4 font-semibold text-slate-900 dark:text-slate-100">
                  {quantity}
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {part.part_number || "—"}
                </td>

                <td className="min-w-64 px-3 py-4">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {part.description}
                  </p>

                  {part.notes && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {part.notes}
                    </p>
                  )}
                </td>

                {isAdmin && (
                  <td className="whitespace-nowrap px-3 py-4">
                    {formatCurrency(cost)}
                  </td>
                )}

                <td className="whitespace-nowrap px-3 py-4">
                  {formatCurrency(price)}
                </td>

                <td className="whitespace-nowrap px-3 py-4 font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(salesTotal)}
                </td>

                {isAdmin && (
                  <>
                    <td className="whitespace-nowrap px-3 py-4 font-semibold text-green-700">
                      {formatCurrency(profit)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-4">
                      {part.supplier || "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditPartModal(part)
                          }
                          className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeletePart(part)
                          }
                          disabled={
                            deletingPartId === part.id
                          }
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingPartId === part.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>

  <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-end sm:justify-end">
    {isAdmin && (
      <div className="rounded-xl bg-slate-50 dark:bg-slate-900 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
          Parts Cost
        </p>

        <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
          {formatCurrency(totalPartsCost)}
        </p>
      </div>
    )}

    <div className="rounded-xl bg-green-50 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
        Parts Value
      </p>

      <p className="mt-1 text-xl font-bold text-[#103d2e]">
        {formatCurrency(totalPartsValue)}
      </p>
    </div>

    {isAdmin && (
      <div className="rounded-xl bg-emerald-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Gross Profit
        </p>

        <p className="mt-1 text-xl font-bold text-emerald-800">
          {formatCurrency(totalPartsProfit)}
        </p>
      </div>
    )}
  </div>
</Card>

            <div className="flex justify-end">
              <button
                type="submit"
                form="job-form"
                disabled={savingJob || refreshing}
                className="rounded-xl bg-[#103d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3024] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingJob
                  ? "Saving..."
                  : "Save Job Card"}
              </button>
            </div>
          </div>

          <aside className="space-y-5">
            <Card>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Customer
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Name</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {customerName}
                  </p>
                </div>

                {contactName &&
                  customer?.business_name && (
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">
                        Contact
                      </p>

                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {contactName}
                      </p>
                    </div>
                  )}

                {customer?.phone && (
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Phone
                    </p>

                    <a
                      href={`tel:${customer.phone}`}
                      className="font-medium text-[#103d2e] hover:underline"
                    >
                      {customer.phone}
                    </a>
                  </div>
                )}

                {customer?.email && (
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Email
                    </p>

                    <a
                      href={`mailto:${customer.email}`}
                      className="break-all font-medium text-[#103d2e] hover:underline"
                    >
                      {customer.email}
                    </a>
                  </div>
                )}

                {customer?.id && (
                  <Link
                    href={`/customers/${customer.id}`}
                    className="mt-4 inline-flex font-semibold text-[#103d2e] hover:underline"
                  >
                    View Customer →
                  </Link>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Machine
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Machine
                  </p>

                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {machineName}
                  </p>
                </div>

                {machine?.registration && (
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Registration
                    </p>

                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {machine.registration.toUpperCase()}
                    </p>
                  </div>
                )}

                {machine?.serial_number && (
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Serial Number
                    </p>

                    <p className="break-all font-medium text-slate-900 dark:text-slate-100">
                      {machine.serial_number}
                    </p>
                  </div>
                )}

                {machine?.id && (
                  <Link
                    href={`/machines/${machine.id}`}
                    className="mt-4 inline-flex font-semibold text-[#103d2e] hover:underline"
                  >
                    View Machine →
                  </Link>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Job Dates
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Opened
                  </p>

                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(job.opened_date)}
                  </p>
                </div>

                <div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Completed
                  </p>

                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(job.completed_date)}
                  </p>
                </div>

                <div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Invoice Status
                  </p>

                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {linkedInvoice
                      ? formatLabel(linkedInvoice.status)
                      : job.invoice_status
                        ? formatLabel(job.invoice_status)
                        : "Not recorded"}
                  </p>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <p className="text-slate-600 dark:text-slate-400">
                    Invoice
                  </p>

                  {linkedInvoice ? (
                    <div className="mt-2 space-y-3">
                      <div>
                        <p className="font-semibold text-[#103d2e]">
                          {linkedInvoice.invoice_number}
                        </p>

                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Total: {formatCurrency(
                            asNumber(linkedInvoice.total)
                          )}
                          {" · "}
                          Outstanding: {formatCurrency(
                            Math.max(
                              0,
                              asNumber(linkedInvoice.total) -
                                asNumber(
                                  linkedInvoice.amount_paid
                                )
                            )
                          )}
                        </p>
                      </div>

                      <Link
                        href={`/invoices/${linkedInvoice.id}`}
                        className="inline-flex w-full justify-center rounded-xl bg-[#103d2e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c3024]"
                      >
                        Open Invoice
                      </Link>

                      {linkedInvoice.stripe_payment_url && (
                        <a
                          href={
                            linkedInvoice.stripe_payment_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                        >
                          Open Payment Link
                        </a>
                      )}
                    </div>
                  ) : status === "completed" ? (
                    <div className="mt-2">
                      {totalLabourValue <= 0 &&
                        totalPartsValue <= 0 && (
                          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                            Add billable labour or parts before
                            creating the invoice.
                          </p>
                        )}

                      <button
                        type="button"
                        onClick={() =>
                          void handleCreateInvoice()
                        }
                        disabled={
                          creatingInvoice ||
                          totalLabourValue <= 0 &&
                            totalPartsValue <= 0
                        }
                        className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {creatingInvoice
                          ? "Creating Invoice..."
                          : "Create Invoice"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Complete and save the job before
                      invoicing.
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Last Updated
                  </p>

                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(job.updated_at)}
                  </p>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      {labourModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white dark:bg-slate-950 shadow-2xl">
            <form onSubmit={handleSaveLabour}>
              <div className="flex items-start justify-between border-b px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {labourForm.id
                      ? "Edit Labour Entry"
                      : "Add Labour Entry"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Worked hours are calculated automatically.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeLabourModal}
                  className="rounded-lg px-3 py-1.5 text-xl text-slate-600 dark:text-slate-400 hover:bg-gray-100"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Engineer
                    </label>

                    <select
                      value={labourForm.engineerName}
                      onChange={(event) =>
                        setLabourForm((current) => ({
                          ...current,
                          engineerName: event.target.value,
                        }))
                      }
                      disabled={!isAdmin}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15 disabled:bg-gray-100"
                    >
                      <option value="James McAteer">
                        James McAteer
                      </option>
                      <option value="Aiden Coady">
                        Aiden Coady
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Date
                    </label>

                    <input
                      type="date"
                      value={labourForm.labourDate}
                      onChange={(event) =>
                        setLabourForm((current) => ({
                          ...current,
                          labourDate: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Start Time
                    </label>

                    <input
                      type="time"
                      value={labourForm.startTime}
                      onChange={(event) =>
                        setLabourForm((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Finish Time
                    </label>

                    <input
                      type="time"
                      value={labourForm.finishTime}
                      onChange={(event) =>
                        setLabourForm((current) => ({
                          ...current,
                          finishTime: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Break Minutes
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={labourForm.breakMinutes}
                      onChange={(event) =>
                        setLabourForm((current) => ({
                          ...current,
                          breakMinutes: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                    />
                  </div>

                  {isAdmin && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Hourly Rate
                      </label>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400">
                          £
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={labourForm.hourlyRate}
                          onChange={(event) =>
                            setLabourForm((current) => ({
                              ...current,
                              hourlyRate:
                                event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 py-3 pl-8 pr-4 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Work Description
                  </label>

                  <textarea
                    rows={4}
                    value={labourForm.description}
                    onChange={(event) =>
                      setLabourForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Describe the work completed during this time..."
                    className="w-full resize-y rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                  />
                </div>

                {labourForm.id && isAdmin && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Reason for Adjustment
                    </label>

                    <textarea
                      rows={3}
                      required
                      value={labourForm.adjustmentReason}
                      onChange={(event) =>
                        setLabourForm((current) => ({
                          ...current,
                          adjustmentReason:
                            event.target.value,
                        }))
                      }
                      placeholder="For example: Engineer forgot to clock off..."
                      className="w-full resize-y rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                )}

                {labourForm.startTime &&
                  labourForm.finishTime && (
                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-sm font-semibold text-green-800">
                        Calculated Worked Time
                      </p>

                      <p className="mt-1 text-2xl font-bold text-[#103d2e]">
                        {calculateHours(
                          labourForm.labourDate,
                          labourForm.startTime,
                          labourForm.finishTime,
                          Number(
                            labourForm.breakMinutes || 0
                          )
                        )?.toFixed(2) ?? "0.00"}{" "}
                        hours
                      </p>
                    </div>
                  )}
              </div>

              <div className="flex justify-end gap-3 border-t bg-slate-50 dark:bg-slate-900 px-6 py-5">
                <button
                  type="button"
                  onClick={closeLabourModal}
                  disabled={savingLabour}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingLabour}
                  className="rounded-xl bg-[#103d2e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c3024] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingLabour
                    ? "Saving..."
                    : labourForm.id
                      ? "Save Changes"
                      : "Add Labour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {partModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white dark:bg-slate-950 shadow-2xl">
      <form onSubmit={handleSavePart}>
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {partForm.id ? "Edit Part" : "Add Part"}
            </h2>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Add parts, oil, materials or consumables used on
              this job.
            </p>
          </div>

          <button
            type="button"
            onClick={closePartModal}
            className="rounded-lg px-3 py-1.5 text-xl text-slate-600 dark:text-slate-400 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Select From Stock
              </label>

              <select
                value={partForm.stock_item_id}
                onChange={(event) => {
                  const stockItemId = event.target.value;
                  const selectedItem = stockItems.find(
                    (item) => item.id === stockItemId
                  );

                  if (!selectedItem) {
                    setPartForm((current) => ({
                      ...current,
                      stock_item_id: "",
                    }));
                    return;
                  }

                  setPartForm((current) => ({
                    ...current,
                    stock_item_id: selectedItem.id,
                    partNumber: selectedItem.part_number ?? "",
                    description: selectedItem.description,
                    unitCost: String(
                      asNumber(selectedItem.unit_cost)
                    ),
                    unitPrice: String(
                      asNumber(selectedItem.unit_price)
                    ),
                    supplier: selectedItem.supplier ?? "",
                  }));
                }}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              >
                <option value="">Manual / one-off part</option>

                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.part_number
                      ? `${item.part_number} — ${item.description}`
                      : item.description}
                    {" "}({asNumber(item.quantity_in_stock)} available)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Quantity
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={partForm.quantity}
                onChange={(event) =>
                  setPartForm((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Part Number
              </label>

              <input
                type="text"
                value={partForm.partNumber}
                onChange={(event) =>
                  setPartForm((current) => ({
                    ...current,
                    partNumber: event.target.value,
                  }))
                }
                placeholder="For example: 84283746"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
              />
            </div>

            {isAdmin && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Unit Cost
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400">
                    £
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={partForm.unitCost}
                    onChange={(event) =>
                      setPartForm((current) => ({
                        ...current,
                        unitCost: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 py-3 pl-8 pr-4 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Unit Selling Price
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400">
                  £
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={partForm.unitPrice}
                  onChange={(event) =>
                    setPartForm((current) => ({
                      ...current,
                      unitPrice: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 py-3 pl-8 pr-4 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Supplier
                </label>

                <input
                  type="text"
                  value={partForm.supplier}
                  onChange={(event) =>
                    setPartForm((current) => ({
                      ...current,
                      supplier: event.target.value,
                    }))
                  }
                  placeholder="Supplier name"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Description
            </label>

            <input
              type="text"
              required
              value={partForm.description}
              onChange={(event) =>
                setPartForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="For example: Engine oil filter"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Notes
            </label>

            <textarea
              rows={3}
              value={partForm.notes}
              onChange={(event) =>
                setPartForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Optional fitting or warranty notes..."
              className="w-full resize-y rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 outline-none focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
            />
          </div>

          {partForm.quantity && partForm.unitPrice && (
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">
                Line Total
              </p>

              <p className="mt-1 text-2xl font-bold text-[#103d2e]">
                {formatCurrency(
                  asNumber(partForm.quantity) *
                    asNumber(partForm.unitPrice)
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t bg-slate-50 dark:bg-slate-900 px-6 py-5">
          <button
            type="button"
            onClick={closePartModal}
            disabled={savingPart}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={savingPart}
            className="rounded-xl bg-[#103d2e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c3024] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingPart
              ? "Saving..."
              : partForm.id
                ? "Save Changes"
                : "Add Part"}
          </button>
              </div>
      </form>
    </div>
  </div>
)}
    </>
  );
}

export default function JobDetailPage() {
  return (
    <FieldRolePageGate>
      <JobDetailPageContent />
    </FieldRolePageGate>
  );
}
