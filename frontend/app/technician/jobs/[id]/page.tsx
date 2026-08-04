"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import CompletionWizard, {
  type CompletionForm,
  type JobCompletion,
} from "@/Components/technician/CompletionWizard";
import CustomerCard from "@/Components/technician/CustomerCard";
import JobHeader from "@/Components/technician/JobHeader";
import JobWorkflow from "@/Components/technician/JobWorkFlow";
import LabourCard from "@/Components/technician/LabourCard";
import PartsCard from "@/Components/technician/PartsCard";
import PhotosCard from "@/Components/technician/PhotosCard";
import PhotoViewer, {
  type TechnicianJobPhoto,
} from "@/Components/technician/PhotoViewer";
import QuickActions from "@/Components/technician/QuickActions";
import ServiceChecklistCard from "@/Components/technician/ServiceChecklistCard";
import TravelCard from "@/Components/technician/TravelCard";
import { supabase } from "@/lib/supabase";

import type {
  TechnicianJobAction,
  TechnicianJobActionResponse,
  TechnicianJobDetailResponse,
  TechnicianServiceChecklistItem,
} from "@/types/technician";

type TechnicianStockItem = {
  id: string;
  partNumber: string;
  description: string;
  category: string;
  manufacturer: string;
  supplier: string;
  unitCost: number;
  unitPrice: number;
  quantityInStock: number;
  minimumStock: number;
  location: string;
  barcode: string;
  lowStock: boolean;
};

type TechnicianJobPart = {
  id: string;
  jobId: string;
  stockItemId: string | null;
  quantity: number;
  partNumber: string;
  description: string;
  unitCost: number;
  unitPrice: number;
  supplier: string;
  notes: string;
  lineCost: number;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
};

type TechnicianPartsResponse = {
  parts: TechnicianJobPart[];
  stockItems: TechnicianStockItem[];
  partsTotal: number;
};

type TechnicianPhotosResponse = {
  photos: TechnicianJobPhoto[];
  photoCount: number;
  maximumPhotos: number;
  remainingPhotos: number;
};

type CompletionResponse = {
  completion: JobCompletion | null;
};

type SaveCompletionResponse = {
  success: boolean;
  message: string;
  completion: JobCompletion;
};

const EMPTY_COMPLETION_FORM: CompletionForm = {
  diagnosis: "",
  workCarriedOut: "",

  customerName: "",
  customerPosition: "",
  customerConfirmation: false,

  signatureDataUrl: null,
  signatureStoragePath: null,

  machineTested: false,
  guardsFitted: false,
  areaLeftTidy: false,
  customerInstructed: false,
  photosChecked: false,
  partsChecked: false,
  labourChecked: false,

  technicianNotes: "",
};

export default function TechnicianJobPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [jobData, setJobData] =
    useState<TechnicianJobDetailResponse | null>(null);

  const [partsData, setPartsData] =
    useState<TechnicianPartsResponse | null>(null);

  const [photosData, setPhotosData] =
    useState<TechnicianPhotosResponse | null>(null);

  const [completion, setCompletion] =
    useState<JobCompletion | null>(null);

  const [completionForm, setCompletionForm] =
    useState<CompletionForm>(
      EMPTY_COMPLETION_FORM,
    );

  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] =
    useState<TechnicianJobAction | null>(null);

  const [uploadingPhotos, setUploadingPhotos] =
    useState(false);

  const cameraInputRef =
    useRef<HTMLInputElement | null>(null);

  const libraryInputRef =
    useRef<HTMLInputElement | null>(null);

  const [completionSaving, setCompletionSaving] =
    useState(false);

  const [serviceChecklist, setServiceChecklist] =
    useState<TechnicianServiceChecklistItem[]>([]);

  const [checklistSaving, setChecklistSaving] =
    useState(false);

  const [completionSubmitting, setCompletionSubmitting] =
    useState(false);

  const [travelRefreshToken, setTravelRefreshToken] =
    useState(0);

  const [completionOpen, setCompletionOpen] =
    useState(false);

  const [completionStep, setCompletionStep] =
    useState(1);

  const [selectedPhoto, setSelectedPhoto] =
    useState<TechnicianJobPhoto | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [completionError, setCompletionError] =
    useState("");

  const loadJob = useCallback(async () => {
    const response = await authenticatedFetch(
      `/api/technician/jobs/${jobId}`,
      {
        cache: "no-store",
      },
    );

    const result: unknown = await readJson(response);

    if (!response.ok) {
      throw new Error(
        getApiError(
          result,
          "Unable to load technician job.",
        ),
      );
    }

    const loadedJob =
      result as TechnicianJobDetailResponse;

    setJobData(loadedJob);
    setServiceChecklist(
      loadedJob.job.serviceChecklist ?? [],
    );
  }, [jobId]);

  const loadParts = useCallback(async () => {
    const response = await authenticatedFetch(
      `/api/technician/jobs/${jobId}/parts`,
      {
        cache: "no-store",
      },
    );

    const result: unknown = await readJson(response);

    if (!response.ok) {
      throw new Error(
        getApiError(
          result,
          "Unable to load job parts.",
        ),
      );
    }

    setPartsData(
      result as TechnicianPartsResponse,
    );
  }, [jobId]);

  const loadPhotos = useCallback(async () => {
    const response = await authenticatedFetch(
      `/api/technician/jobs/${jobId}/photos`,
      {
        cache: "no-store",
      },
    );

    const result: unknown = await readJson(response);

    if (!response.ok) {
      throw new Error(
        getApiError(
          result,
          "Unable to load job photos.",
        ),
      );
    }

    setPhotosData(
      result as TechnicianPhotosResponse,
    );
  }, [jobId]);

  const loadCompletion = useCallback(async () => {
    const response = await authenticatedFetch(
      `/api/technician/jobs/${jobId}/complete`,
      {
        cache: "no-store",
      },
    );

    const result: unknown = await readJson(response);

    if (!response.ok) {
      throw new Error(
        getApiError(
          result,
          "Unable to load job completion.",
        ),
      );
    }

    const completionResult =
      result as CompletionResponse;

    setCompletion(completionResult.completion);

    if (completionResult.completion) {
      setCompletionForm(
        formFromCompletion(
          completionResult.completion,
        ),
      );
    }
  }, [jobId]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        loadJob(),
        loadParts(),
        loadPhotos(),
        loadCompletion(),
      ]);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, [
    loadCompletion,
    loadJob,
    loadParts,
    loadPhotos,
  ]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const elapsedTime = useElapsedTime(
    jobData?.runningLabour?.startTime ?? null,
  );

  const assignmentStatus = normalise(
    jobData?.assignment.status ?? "",
  );

  const completionStatus = normalise(
    completion?.status ?? "",
  );

  const completed =
    ["submitted", "approved"].includes(
      completionStatus,
    ) ||
    ["completed", "closed", "invoiced"].includes(
      normalise(jobData?.job.status ?? ""),
    );

  const readOnly =
    ["submitted", "approved"].includes(
      completionStatus,
    );

  const travelling =
    assignmentStatus === "travelling";

  const arrived =
    assignmentStatus === "confirmed";

  const working =
    assignmentStatus === "in_progress" ||
    Boolean(jobData?.runningLabour);

  const combinedLabourEntries = useMemo(() => {
    if (!jobData) {
      return [];
    }

    const entries = [...jobData.labourEntries];

    if (
      jobData.runningLabour &&
      !entries.some(
        (entry) =>
          entry.id === jobData.runningLabour?.id,
      )
    ) {
      entries.unshift(jobData.runningLabour);
    }

    return entries;
  }, [jobData]);

  async function performAction(
    action: Exclude<
      TechnicianJobAction,
      "complete_job"
    >,
  ) {
    setActionBusy(action);
    clearMessages();

    try {
      const location =
        action === "start_travel" || action === "arrive_on_site"
          ? await getCurrentLocation()
          : null;

      const response = await authenticatedFetch(
        `/api/technician/jobs/${jobId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action, location }),
        },
      );

      const result: unknown = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getApiError(
            result,
            "Unable to update technician job.",
          ),
        );
      }

      const actionResult =
        result as TechnicianJobActionResponse;

      setSuccess(
        actionResult.message || "Job updated.",
      );

      await loadJob();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setActionBusy(null);
    }
  }


  async function saveServiceChecklist() {
    if (!jobData?.job.isServiceJob || readOnly) {
      return;
    }

    setChecklistSaving(true);
    clearMessages();

    try {
      const response = await authenticatedFetch(
        `/api/technician/jobs/${jobId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update_service_checklist",
            serviceChecklist,
          }),
        },
      );

      const result: unknown = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getApiError(
            result,
            "Unable to save the service checklist.",
          ),
        );
      }

      setSuccess(
        getApiMessage(result, "Service checklist saved."),
      );
      await loadJob();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setChecklistSaving(false);
    }
  }

  function openCompletionWizard() {
    if (!jobData || readOnly) {
      return;
    }

    const existingForm = completion
      ? formFromCompletion(completion)
      : {
          ...EMPTY_COMPLETION_FORM,
          diagnosis: jobData.job.diagnosis,
          workCarriedOut:
            jobData.job.workCarriedOut,
          customerName:
            jobData.customer?.contactName ?? "",
        };

    setCompletionForm(existingForm);
    setCompletionStep(1);
    setCompletionError("");
    setCompletionOpen(true);
  }

  async function saveCompletion(
    action: "save_draft" | "submit",
  ) {
    if (action === "submit") {
      const confirmed = window.confirm(
        "Submit this completed job for office review?",
      );

      if (!confirmed) {
        return;
      }

      setCompletionSubmitting(true);
    } else {
      setCompletionSaving(true);
    }

    setCompletionError("");
    setError("");
    setSuccess("");

    try {
      const completionLocation =
        action === "submit" ? await getCurrentLocation() : null;

      const response = await authenticatedFetch(
        `/api/technician/jobs/${jobId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            ...completionForm,
            location: completionLocation,
          }),
        },
      );

      const result: unknown = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getApiError(
            result,
            "Unable to save job completion.",
          ),
        );
      }

      const completionResult =
        result as SaveCompletionResponse;

      setCompletion(
        completionResult.completion,
      );

      setCompletionForm(
        formFromCompletion(
          completionResult.completion,
        ),
      );

      setSuccess(completionResult.message);

      if (action === "submit") {
        setCompletionOpen(false);
        setCompletionStep(1);

        const recordReturnJourney = window.confirm(
          "Job submitted. Do you want to start a return journey now?",
        );

        if (recordReturnJourney) {
          const returnLocation =
            await getCurrentLocation();

          const travelResponse =
            await authenticatedFetch(
              `/api/technician/jobs/${jobId}/travel`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  action: "start",
                  direction: "return",
                  startLatitude:
                    returnLocation?.latitude ?? null,
                  startLongitude:
                    returnLocation?.longitude ?? null,
                }),
              },
            );

          const travelResult: unknown =
            await readJson(travelResponse);

          if (!travelResponse.ok) {
            setError(
              getApiError(
                travelResult,
                "The job was submitted, but the return journey could not be started.",
              ),
            );
          } else {
            setSuccess(
              "Job submitted and return journey started.",
            );
          }
        }

        setTravelRefreshToken(
          (current) => current + 1,
        );

        await Promise.all([
          loadJob(),
          loadCompletion(),
        ]);
      }
    } catch (caughtError) {
      setCompletionError(
        getErrorMessage(caughtError),
      );
    } finally {
      setCompletionSaving(false);
      setCompletionSubmitting(false);
    }
  }

  async function addPart() {
    if (readOnly) {
      return;
    }

    clearMessages();

    try {
      const search = window.prompt(
        "Enter a part number or part description:",
      );

      if (!search?.trim()) {
        return;
      }

      const searchParams = new URLSearchParams({
        q: search.trim(),
      });

      const searchResponse =
        await authenticatedFetch(
          `/api/technician/jobs/${jobId}/parts?${searchParams.toString()}`,
          {
            cache: "no-store",
          },
        );

      const searchResult: unknown =
        await readJson(searchResponse);

      if (!searchResponse.ok) {
        throw new Error(
          getApiError(
            searchResult,
            "Unable to search stock.",
          ),
        );
      }

      const available =
        (
          searchResult as TechnicianPartsResponse
        ).stockItems.filter(
          (item) => item.quantityInStock > 0,
        );

      if (available.length === 0) {
        throw new Error(
          "No available stock items matched that search.",
        );
      }

      const menu = available
        .slice(0, 10)
        .map(
          (item, index) =>
            `${index + 1}. ${
              item.partNumber
                ? `${item.partNumber} — `
                : ""
            }${item.description} (stock ${item.quantityInStock})`,
        )
        .join("\n");

      const selectedNumber = window.prompt(
        `Select a part by entering its number:\n\n${menu}`,
        "1",
      );

      if (!selectedNumber) {
        return;
      }

      const selectedIndex =
        Number(selectedNumber) - 1;

      const selectedItem =
        available[selectedIndex];

      if (!selectedItem) {
        throw new Error(
          "The selected part number was invalid.",
        );
      }

      const quantityValue = window.prompt(
        `Quantity of ${selectedItem.description}:`,
        "1",
      );

      if (!quantityValue) {
        return;
      }

      const quantity = Number(quantityValue);

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          "Enter a valid quantity greater than zero.",
        );
      }

      const response = await authenticatedFetch(
        `/api/technician/jobs/${jobId}/parts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stockItemId: selectedItem.id,
            quantity,
          }),
        },
      );

      const result: unknown = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getApiError(
            result,
            "Unable to add the part.",
          ),
        );
      }

      setSuccess(
        getApiMessage(
          result,
          "Part added to job.",
        ),
      );

      await loadParts();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function editPart(
    part: TechnicianJobPart,
  ) {
    if (readOnly) {
      return;
    }

    const quantityValue = window.prompt(
      `Update quantity for ${part.description}:`,
      String(part.quantity),
    );

    if (quantityValue === null) {
      return;
    }

    const quantity = Number(quantityValue);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError(
        "Enter a valid quantity greater than zero.",
      );
      return;
    }

    clearMessages();

    try {
      const response = await authenticatedFetch(
        `/api/technician/jobs/${jobId}/parts/${part.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantity,
            notes: part.notes,
          }),
        },
      );

      const result: unknown = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getApiError(
            result,
            "Unable to update the part.",
          ),
        );
      }

      setSuccess(
        getApiMessage(result, "Part updated."),
      );

      await loadParts();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function deletePart(
    part: TechnicianJobPart,
  ) {
    if (readOnly) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${part.description} from this job?`,
    );

    if (!confirmed) {
      return;
    }

    clearMessages();

    try {
      const response = await authenticatedFetch(
        `/api/technician/jobs/${jobId}/parts/${part.id}`,
        {
          method: "DELETE",
        },
      );

      const result: unknown = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getApiError(
            result,
            "Unable to remove the part.",
          ),
        );
      }

      setSuccess(
        getApiMessage(result, "Part removed."),
      );

      await loadParts();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function uploadPhotos(files: FileList) {
    if (readOnly || files.length === 0) {
      return;
    }

    const maximum =
      photosData?.maximumPhotos ?? 10;

    const remaining =
      photosData?.remainingPhotos ??
      Math.max(
        0,
        maximum -
          (photosData?.photos.length ?? 0),
      );

    const selectedFiles = Array.from(files)
      .filter((file) =>
        file.type.startsWith("image/"),
      )
      .slice(0, remaining);

    if (selectedFiles.length === 0) {
      setError(
        remaining === 0
          ? `This job already has the maximum of ${maximum} photos.`
          : "Select a valid image file.",
      );
      return;
    }

    setUploadingPhotos(true);
    clearMessages();

    let uploaded = 0;

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("caption", "");

        const response = await authenticatedFetch(
          `/api/technician/jobs/${jobId}/photos`,
          {
            method: "POST",
            body: formData,
          },
        );

        const result: unknown =
          await readJson(response);

        if (!response.ok) {
          throw new Error(
            getApiError(
              result,
              `Unable to upload ${file.name}.`,
            ),
          );
        }

        uploaded += 1;
      }

      setSuccess(
        `${uploaded} photo${
          uploaded === 1 ? "" : "s"
        } uploaded successfully.`,
      );

      await loadPhotos();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));

      if (uploaded > 0) {
        await loadPhotos();
      }
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function deletePhoto(
    photo: TechnicianJobPhoto,
  ) {
    if (readOnly) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this job photo?",
    );

    if (!confirmed) {
      return;
    }

    clearMessages();

    try {
      const response = await authenticatedFetch(
        `/api/technician/jobs/${jobId}/photos/${photo.id}`,
        {
          method: "DELETE",
        },
      );

      const result: unknown = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getApiError(
            result,
            "Unable to delete the photo.",
          ),
        );
      }

      setSelectedPhoto(null);

      setSuccess(
        getApiMessage(result, "Photo deleted."),
      );

      await loadPhotos();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  function clearMessages() {
    setError("");
    setSuccess("");
    setCompletionError("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-20 text-center">
        <p className="font-semibold text-slate-600">
          Loading technician job…
        </p>
      </main>
    );
  }

  if (!jobData) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/technician"
            className="font-bold text-[#103d2e]"
          >
            ← Back to my jobs
          </Link>

          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-6 font-semibold text-red-800">
            {error || "Unable to load job."}
          </div>
        </div>
      </main>
    );
  }

  const partRows =
    partsData?.parts.map((part) => ({
      id: part.id,
      partNumber: part.partNumber,
      description: part.description,
      quantity: part.quantity,
      unitPrice: part.unitPrice,
    })) ?? [];

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
        <Link
          href="/technician"
          className="text-sm font-bold text-[#103d2e]"
        >
          ← Back to my jobs
        </Link>

        <div className="mt-4">
          <JobHeader
            jobNumber={jobData.job.jobNumber}
            customerName={
              jobData.customer?.name ??
              "Customer not recorded"
            }
            machineName={
              jobData.machine?.displayName ??
              "Machine not recorded"
            }
            scheduledStart={
              jobData.assignment.scheduledStart
            }
            scheduledEnd={
              jobData.assignment.scheduledEnd
            }
          />
        </div>

        <JobWorkflow
          assignmentStatus={
            jobData.assignment.status
          }
          jobStatus={jobData.job.status}
          completionStatus={
            completion?.status ?? null
          }
        />

        {error ? (
          <Alert kind="error">{error}</Alert>
        ) : null}

        {success ? (
          <Alert kind="success">{success}</Alert>
        ) : null}

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            Reported fault
          </p>

          <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-slate-800">
            {jobData.job.faultReported ||
              "No fault description has been recorded."}
          </p>
        </section>


        {jobData.job.isServiceJob ? (
          <ServiceChecklistCard
            programmeName={jobData.job.serviceProgrammeName}
            items={serviceChecklist}
            readOnly={readOnly}
            saving={checklistSaving}
            onChange={setServiceChecklist}
            onSave={() => void saveServiceChecklist()}
          />
        ) : null}

        <TravelCard
          jobId={jobId}
          disabled={readOnly}
          completed={completed}
          refreshToken={travelRefreshToken}
          onChanged={() => void loadJob()}
        />

        <QuickActions
          travelling={travelling}
          arrived={arrived}
          working={working}
          completed={completed}
          busy={actionBusy !== null}
          hasRunningLabour={Boolean(
            jobData.runningLabour,
          )}
          elapsedTime={elapsedTime}
          partsCount={
            partsData?.parts.length ?? 0
          }
          onStartTravel={() =>
            void performAction("start_travel")
          }
          onArrive={() =>
            void performAction("arrive_on_site")
          }
          onToggleLabour={() =>
            void performAction(
              jobData.runningLabour
                ? "stop_labour"
                : "start_labour",
            )
          }
          onOpenParts={() =>
            document
              .getElementById(
                "technician-parts-used",
              )
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
          }
        />

        <LabourCard
          runningLabour={
            jobData.runningLabour
          }
          labourEntries={combinedLabourEntries}
          elapsedTime={elapsedTime}
          busy={actionBusy !== null}
          completed={completed}
          onToggleLabour={() =>
            void performAction(
              jobData.runningLabour
                ? "stop_labour"
                : "start_labour",
            )
          }
        />

        <div
          id="technician-parts-used"
          className="scroll-mt-4"
        >
          <PartsCard
            parts={partRows}
            readOnly={readOnly}
            onAddPart={() => void addPart()}
            onEditPart={(displayPart) => {
              const fullPart =
                partsData?.parts.find(
                  (part) =>
                    part.id === displayPart.id,
                );

              if (fullPart) {
                void editPart(fullPart);
              }
            }}
            onDeletePart={(displayPart) => {
              const fullPart =
                partsData?.parts.find(
                  (part) =>
                    part.id === displayPart.id,
                );

              if (fullPart) {
                void deletePart(fullPart);
              }
            }}
          />
        </div>


        <section className="mt-4 rounded-2xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                Job photos
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                Add photos from camera or library
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Photos are attached to this job and remain available in the machine history.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {photosData?.photos.length ?? 0}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={
                readOnly ||
                uploadingPhotos ||
                (photosData?.remainingPhotos ?? 1) <= 0
              }
              onClick={() =>
                cameraInputRef.current?.click()
              }
              className="min-h-16 rounded-2xl bg-[#0c4a3a] px-5 text-base font-bold text-white shadow-sm transition hover:bg-[#0a3f31] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {uploadingPhotos
                ? "Uploading…"
                : "Take photo"}
            </button>

            <button
              type="button"
              disabled={
                readOnly ||
                uploadingPhotos ||
                (photosData?.remainingPhotos ?? 1) <= 0
              }
              onClick={() =>
                libraryInputRef.current?.click()
              }
              className="min-h-16 rounded-2xl border border-slate-300 bg-white/90 px-5 text-base font-bold text-slate-900 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-950/80 dark:text-white dark:hover:bg-slate-900"
            >
              Upload photos
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              if (event.target.files) {
                void uploadPhotos(event.target.files);
              }

              event.target.value = "";
            }}
          />

          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) {
                void uploadPhotos(event.target.files);
              }

              event.target.value = "";
            }}
          />

          <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {photosData
              ? `${photosData.remainingPhotos} of ${photosData.maximumPhotos} photo spaces remaining`
              : "Photos will appear below after upload."}
          </p>
        </section>

        <PhotosCard
          photos={photosData?.photos ?? []}
          uploading={uploadingPhotos}
          readOnly={readOnly}
          onUpload={(files) =>
            void uploadPhotos(files)
          }
          onOpenPhoto={setSelectedPhoto}
          onDeletePhoto={(photo) =>
            void deletePhoto(photo)
          }
        />

        <CustomerCard
          customer={jobData.customer}
          machine={jobData.machine}
        />

        {jobData.assignment.notes ? (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              Scheduling notes
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {jobData.assignment.notes}
            </p>
          </section>
        ) : null}

        {completion?.status === "rejected" &&
        completion.rejectionReason ? (
          <section className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-bold text-red-800">
              Completion returned by office
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-700">
              {completion.rejectionReason}
            </p>
          </section>
        ) : null}

        <button
          type="button"
          disabled={
            readOnly ||
            actionBusy !== null ||
            completionSaving ||
            completionSubmitting
          }
          onClick={openCompletionWizard}
          className="mt-4 min-h-14 w-full rounded-xl bg-emerald-600 px-5 py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {completionStatus === "submitted"
            ? "Awaiting office review"
            : completionStatus === "approved"
              ? "Completion approved"
              : completionStatus === "rejected"
                ? "Amend and resubmit completion"
                : completionStatus === "draft"
                  ? "Continue completion draft"
                  : "Complete job"}
        </button>

        <Link
          href={`/jobs/${jobData.job.id}`}
          className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"
        >
          Open full office job card
        </Link>
      </div>

      <PhotoViewer
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />

      <CompletionWizard
        open={completionOpen}
        step={completionStep}
        form={completionForm}
        completion={completion}
        saving={completionSaving}
        submitting={completionSubmitting}
        error={completionError}
        photoCount={
          photosData?.photos.length ?? 0
        }
        partsCount={
          partsData?.parts.length ?? 0
        }
        labourCount={
          combinedLabourEntries.filter(
            (entry) =>
              entry.entryStatus !== "running",
          ).length
        }
        onChange={setCompletionForm}
        onStepChange={setCompletionStep}
        onClose={() => {
          if (
            !completionSaving &&
            !completionSubmitting
          ) {
            setCompletionOpen(false);
            setCompletionError("");
          }
        }}
        onSaveDraft={() =>
          void saveCompletion("save_draft")
        }
        onSubmit={() =>
          void saveCompletion("submit")
        }
      />
    </main>
  );
}

function Alert({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mt-4 rounded-xl border p-4 text-sm font-semibold ${
        kind === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </div>
  );
}

function formFromCompletion(
  completion: JobCompletion,
): CompletionForm {
  return {
    diagnosis: completion.diagnosis,
    workCarriedOut:
      completion.workCarriedOut,

    customerName: completion.customerName,
    customerPosition:
      completion.customerPosition,
    customerConfirmation:
      completion.customerConfirmation,

    signatureDataUrl:
      completion.signatureDataUrl,
    signatureStoragePath:
      completion.signatureStoragePath,

    machineTested:
      completion.machineTested,
    guardsFitted:
      completion.guardsFitted,
    areaLeftTidy:
      completion.areaLeftTidy,
    customerInstructed:
      completion.customerInstructed,
    photosChecked:
      completion.photosChecked,
    partsChecked:
      completion.partsChecked,
    labourChecked:
      completion.labourChecked,

    technicianNotes:
      completion.technicianNotes,
  };
}

function useElapsedTime(
  startTime: string | null,
) {
  const [now, setNow] = useState(() =>
    Date.now(),
  );

  useEffect(() => {
    if (!startTime) {
      return;
    }

    setNow(Date.now());

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [startTime]);

  if (!startTime) {
    return "00:00:00";
  }

  const started = new Date(
    startTime,
  ).getTime();

  if (!Number.isFinite(started)) {
    return "00:00:00";
  }

  const totalSeconds = Math.max(
    0,
    Math.floor((now - started) / 1000),
  );

  const hours = Math.floor(
    totalSeconds / 3600,
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );

  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) =>
      String(value).padStart(2, "0"),
    )
    .join(":");
}

async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!session?.access_token) {
    throw new Error(
      "You must be signed in to continue.",
    );
  }

  const headers = new Headers(init.headers);

  headers.set(
    "Authorization",
    `Bearer ${session.access_token}`,
  );

  return fetch(input, {
    ...init,
    headers,
  });
}

async function readJson(
  response: Response,
): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function getApiError(
  result: unknown,
  fallback: string,
) {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string" &&
    result.error
  ) {
    return result.error;
  }

  return fallback;
}

function getApiMessage(
  result: unknown,
  fallback: string,
) {
  if (
    typeof result === "object" &&
    result !== null &&
    "message" in result &&
    typeof result.message === "string" &&
    result.message
  ) {
    return result.message;
  }

  return fallback;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

async function getCurrentLocation() {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return null;
  }

  return new Promise<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    capturedAt: string;
  } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
          capturedAt: new Date(position.timestamp).toISOString(),
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  });
}

function normalise(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}