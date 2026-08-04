"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type TravelDirection =
  | "outbound"
  | "return"
  | "additional";

type TravelSession = {
  id: string;
  status: string;
  direction: TravelDirection;
  started_at: string;
  arrived_at: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  end_latitude: number | null;
  end_longitude: number | null;
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
  completed?: boolean;
  refreshToken?: number;
  onChanged?: () => void;
};

type CapturedLocation = {
  latitude: number;
  longitude: number;
};

export default function TravelCard({
  jobId,
  disabled = false,
  completed = false,
  refreshToken = 0,
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
      { cache: "no-store" },
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
  }, [jobId, refreshToken]);

  const elapsed = useElapsed(
    activeSession?.started_at ?? null,
  );

  const outboundCompleted = useMemo(
    () =>
      sessions.find(
        (session) =>
          session.direction === "outbound" &&
          session.status === "completed",
      ) ?? null,
    [sessions],
  );

  const returnCompleted = useMemo(
    () =>
      sessions.find(
        (session) =>
          session.direction === "return" &&
          session.status === "completed",
      ) ?? null,
    [sessions],
  );

  const canStartOutbound =
    !completed &&
    !disabled &&
    !activeSession &&
    !outboundCompleted;

  const canStartReturn =
    completed &&
    !activeSession &&
    Boolean(outboundCompleted) &&
    !returnCompleted;

  async function startJourney(
    direction: "outbound" | "return",
  ) {
    const startMileageText = window.prompt(
      direction === "return"
        ? "Return journey starting odometer mileage (optional):"
        : "Starting odometer mileage (optional):",
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

    const location = await captureLocation();

    await submit({
      action: "start",
      direction,
      startOdometerMiles,
      startLatitude: location?.latitude ?? null,
      startLongitude: location?.longitude ?? null,
    });
  }

  async function arrive() {
    if (!activeSession) {
      return;
    }

    const endMileageText = window.prompt(
      activeSession.direction === "return"
        ? "Return journey ending odometer mileage (optional):"
        : "Ending odometer mileage (optional):",
      activeSession.start_odometer_miles !== null
        ? String(activeSession.start_odometer_miles)
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

    const location = await captureLocation();

    await submit({
      action: "arrive",
      direction: activeSession.direction,
      endOdometerMiles,
      endLatitude: location?.latitude ?? null,
      endLongitude: location?.longitude ?? null,
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

  const activeLabel =
    activeSession?.direction === "return"
      ? "Return journey in progress"
      : "Travelling to customer";

  return (
    <section className="mt-4 rounded-2xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
        Travel
      </p>

      <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
        {activeSession
          ? activeLabel
          : "Journey recording"}
      </h2>

      {activeSession ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/40">
          <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
            {activeSession.direction === "return"
              ? "Returning"
              : "Outbound"}
          </p>
          <p className="mt-1 text-3xl font-black text-amber-950 dark:text-amber-100">
            {elapsed}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void arrive()}
            className="mt-4 min-h-14 w-full rounded-xl bg-[#0c4a3a] px-5 text-base font-black text-white disabled:opacity-45"
          >
            {busy
              ? "Saving location…"
              : activeSession.direction === "return"
                ? "Return complete"
                : "Arrived on site"}
          </button>
        </div>
      ) : canStartOutbound ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void startJourney("outbound")
          }
          className="mt-4 min-h-16 w-full rounded-2xl bg-[#0c4a3a] px-5 text-left text-white shadow-sm disabled:opacity-45"
        >
          <span className="block text-xl font-black">
            Start travel
          </span>
          <span className="mt-1 block text-sm font-semibold text-emerald-100">
            Capture departure location and begin outward travel.
          </span>
        </button>
      ) : canStartReturn ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void startJourney("return")
          }
          className="mt-4 min-h-16 w-full rounded-2xl bg-amber-600 px-5 text-left text-white shadow-sm disabled:opacity-45"
        >
          <span className="block text-xl font-black">
            Start return journey
          </span>
          <span className="mt-1 block text-sm font-semibold text-amber-100">
            Optional — use this when travelling back after the completed job.
          </span>
        </button>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <JourneySummary
          label="Outward"
          session={outboundCompleted}
        />
        <JourneySummary
          label="Return"
          session={returnCompleted}
        />
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </p>
      ) : null}

      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        GPS is captured only when a journey button is pressed. Travel remains editable by the office before invoicing.
      </p>
    </section>
  );
}

function JourneySummary({
  label,
  session,
}: {
  label: string;
  session: TravelSession | null;
}) {
  return (
    <div className="rounded-xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-950 dark:text-white">
        {session
          ? `${session.travel_minutes ?? 0} minutes`
          : "Not recorded"}
      </p>
      {session?.confirmed_distance_miles !== null &&
      session?.confirmed_distance_miles !== undefined ? (
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {session.confirmed_distance_miles.toFixed(1)} miles
        </p>
      ) : null}
    </div>
  );
}

async function captureLocation(): Promise<CapturedLocation | null> {
  if (
    typeof navigator === "undefined" ||
    !navigator.geolocation
  ) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 30_000,
      },
    );
  });
}

function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState(() =>
    Date.now(),
  );

  useEffect(() => {
    if (!startedAt) {
      return;
    }

    const interval = window.setInterval(
      () => setNow(Date.now()),
      1_000,
    );

    return () => window.clearInterval(interval);
  }, [startedAt]);

  if (!startedAt) {
    return "00:00:00";
  }

  const seconds = Math.max(
    0,
    Math.floor(
      (now - new Date(startedAt).getTime()) /
        1_000,
    ),
  );

  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor(
    (seconds % 3_600) / 60,
  );
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
