"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type TravelSession = {
  id: string;
  status: string;
  direction: string;
  started_at: string;
  arrived_at: string | null;
  start_odometer_miles: number | null;
  end_odometer_miles: number | null;
  confirmed_distance_miles: number | null;
  travel_minutes: number | null;
};

type TravelResponse = {
  sessions: TravelSession[];
  activeSession: TravelSession | null;
  error?: string;
  message?: string;
};

type TravelCardProps = {
  jobId: string;
  disabled?: boolean;
  onChanged?: () => void;
};

export default function TravelCard({
  jobId,
  disabled = false,
  onChanged,
}: TravelCardProps) {
  const [sessions, setSessions] =
    useState<TravelSession[]>([]);
  const [activeSession, setActiveSession] =
    useState<TravelSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch(
      `/api/technician/jobs/${jobId}/travel`,
      {
        cache: "no-store",
      },
    );

    const result =
      (await response.json()) as TravelResponse;

    if (!response.ok) {
      setError(
        result.error ||
          "Unable to load travel records.",
      );
      return;
    }

    setSessions(result.sessions ?? []);
    setActiveSession(
      result.activeSession ?? null,
    );
  }

  useEffect(() => {
    void load();
  }, [jobId]);

  const elapsed = useElapsed(
    activeSession?.started_at ?? null,
  );

  const latestCompleted = useMemo(
    () =>
      sessions.find(
        (session) =>
          session.status === "completed",
      ) ?? null,
    [sessions],
  );

  async function startTravel() {
    const startMileageText = window.prompt(
      "Starting odometer mileage (optional):",
      "",
    );

    if (startMileageText === null) {
      return;
    }

    const startOdometerMiles =
      startMileageText.trim()
        ? Number(startMileageText)
        : null;

    if (
      startOdometerMiles !== null &&
      !Number.isFinite(startOdometerMiles)
    ) {
      setError("Enter a valid starting mileage.");
      return;
    }

    await submit({
      action: "start",
      startOdometerMiles,
    });
  }

  async function arrive() {
    const endMileageText = window.prompt(
      "Ending odometer mileage (optional):",
      activeSession?.start_odometer_miles !==
        null &&
        activeSession?.start_odometer_miles !==
          undefined
        ? String(
            activeSession.start_odometer_miles,
          )
        : "",
    );

    if (endMileageText === null) {
      return;
    }

    const endOdometerMiles =
      endMileageText.trim()
        ? Number(endMileageText)
        : null;

    if (
      endOdometerMiles !== null &&
      !Number.isFinite(endOdometerMiles)
    ) {
      setError("Enter a valid ending mileage.");
      return;
    }

    await submit({
      action: "arrive",
      endOdometerMiles,
    });
  }

  async function submit(
    payload: Record<string, unknown>,
  ) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/technician/jobs/${jobId}/travel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result =
        (await response.json()) as TravelResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update travel.",
        );
      }

      setMessage(
        result.message || "Travel updated.",
      );

      await load();
      onChanged?.();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update travel.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
        Travel
      </p>

      <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
        {activeSession
          ? "Travelling"
          : "Journey recording"}
      </h2>

      {activeSession ? (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Info
              label="Elapsed"
              value={elapsed}
            />

            <Info
              label="Start mileage"
              value={
                activeSession.start_odometer_miles ===
                null
                  ? "Not entered"
                  : `${Number(
                      activeSession.start_odometer_miles,
                    ).toLocaleString()} mi`
              }
            />
          </div>

          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void arrive()}
            className="mt-4 min-h-16 w-full rounded-2xl bg-amber-500 px-5 text-lg font-bold text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-45"
          >
            {busy ? "Saving…" : "Arrived"}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          {latestCompleted ? (
            <div className="mb-4 rounded-xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Latest journey
              </p>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {latestCompleted.confirmed_distance_miles !==
                null
                  ? `${Number(
                      latestCompleted.confirmed_distance_miles,
                    ).toLocaleString()} miles`
                  : "Mileage not confirmed"}
                {latestCompleted.travel_minutes !==
                null
                  ? ` · ${latestCompleted.travel_minutes} minutes`
                  : ""}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void startTravel()}
            className="min-h-16 w-full rounded-2xl bg-[#0c4a3a] px-5 text-lg font-bold text-white shadow-sm transition hover:bg-[#0a3f31] disabled:opacity-45"
          >
            {busy ? "Starting…" : "Start travel"}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200">
          {message}
        </p>
      ) : null}

      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        Travel charges are calculated for office use and are not shown here.
      </p>
    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState(() =>
    Date.now(),
  );

  useEffect(() => {
    if (!startedAt) return;

    const timer = window.setInterval(
      () => setNow(Date.now()),
      1000,
    );

    return () =>
      window.clearInterval(timer);
  }, [startedAt]);

  if (!startedAt) return "00:00:00";

  const started = new Date(startedAt).getTime();

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