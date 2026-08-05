"use client";

const DB_NAME = "agricore-offline-v1";
const DB_VERSION = 2;
const CACHE_STORE = "api-cache";
const QUEUE_STORE = "mutation-queue";
const META_STORE = "meta";
const SYNC_LOCK_KEY = "agricore-offline-sync-lock";
const SYNC_LOCK_TTL_MS = 60_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;
const BASE_RETRY_DELAY_MS = 5_000;

export type OfflineQueueItem = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
};

type CachedResponse = {
  key: string;
  body: string;
  status: number;
  headers: Record<string, string>;
  cachedAt: string;
};

type MetaRecord = {
  key: string;
  value: string;
};

export type OfflineSnapshot = {
  online: boolean;
  pending: number;
  failed: number;
  syncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
};

const listeners = new Set<(snapshot: OfflineSnapshot) => void>();
let syncing = false;
let syncTimer: number | null = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open offline storage."));
  });
}

async function storePut(storeName: string, value: unknown) {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("Offline storage failed."));
    });
  } finally {
    db.close();
  }
}

async function storeGet<T>(
  storeName: string,
  key: IDBValidKey,
): Promise<T | null> {
  const db = await openDatabase();

  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () =>
        resolve((request.result as T | undefined) ?? null);
      request.onerror = () =>
        reject(request.error ?? new Error("Offline storage failed."));
    });
  } finally {
    db.close();
  }
}

async function storeGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();

  try {
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve((request.result as T[]) ?? []);
      request.onerror = () =>
        reject(request.error ?? new Error("Offline storage failed."));
    });
  } finally {
    db.close();
  }
}

async function storeDelete(storeName: string, key: IDBValidKey) {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("Offline storage failed."));
    });
  } finally {
    db.close();
  }
}

function responseHeaders(response: Response) {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

function cacheKey(input: RequestInfo | URL) {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
}

function isJsonMutation(init: RequestInit) {
  const method = (init.method ?? "GET").toUpperCase();
  if (["GET", "HEAD"].includes(method)) return false;
  if (init.body == null) return true;
  return typeof init.body === "string";
}

function makeQueuedResponse(item: OfflineQueueItem) {
  return new Response(
    JSON.stringify({
      queued: true,
      queueId: item.id,
      message:
        "Saved on this device. It will sync automatically when a connection is available.",
    }),
    {
      status: 202,
      headers: {
        "Content-Type": "application/json",
        "X-AgriCore-Offline": "queued",
      },
    },
  );
}

async function cacheResponse(key: string, response: Response) {
  const clone = response.clone();
  const body = await clone.text();

  await storePut(CACHE_STORE, {
    key,
    body,
    status: response.status,
    headers: responseHeaders(response),
    cachedAt: new Date().toISOString(),
  } satisfies CachedResponse);
}

async function cachedResponse(key: string): Promise<Response | null> {
  const cached = await storeGet<CachedResponse>(CACHE_STORE, key);
  if (!cached) return null;

  return new Response(cached.body, {
    status: cached.status,
    headers: {
      ...cached.headers,
      "X-AgriCore-Offline": "cache",
      "X-AgriCore-Cached-At": cached.cachedAt,
    },
  });
}

async function requestBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const syncManager = (registration as ServiceWorkerRegistration & {
      sync?: { register(tag: string): Promise<void> };
    }).sync;

    if (syncManager) {
      await syncManager.register("agricore-offline-sync");
    }
  } catch {
    // Background Sync is optional and unsupported by iOS Safari.
  }
}

async function enqueue(input: RequestInfo | URL, init: RequestInit) {
  const headers = new Headers(init.headers);
  headers.delete("authorization");

  const serialisedHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    serialisedHeaders[key] = value;
  });

  const item: OfflineQueueItem = {
    id: crypto.randomUUID(),
    url: cacheKey(input),
    method: (init.method ?? "POST").toUpperCase(),
    headers: serialisedHeaders,
    body: typeof init.body === "string" ? init.body : null,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    nextAttemptAt: null,
  };

  await storePut(QUEUE_STORE, item);
  await requestBackgroundSync();
  await emitSnapshot();
  return item;
}

export async function offlineFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  _getAccessToken?: () => Promise<string | null>,
): Promise<Response> {
  if (!isBrowser()) return fetch(input, init);

  const method = (init.method ?? "GET").toUpperCase();
  const key = cacheKey(input);

  if (["GET", "HEAD"].includes(method)) {
    try {
      const response = await fetch(input, init);
      if (response.ok && method === "GET") {
        await cacheResponse(key, response);
      }
      return response;
    } catch (error) {
      const cached = await cachedResponse(key);
      if (cached) return cached;
      throw error;
    }
  }

  if (!navigator.onLine && isJsonMutation(init)) {
    const item = await enqueue(input, init);
    return makeQueuedResponse(item);
  }

  try {
    const response = await fetch(input, init);

    if (response.status >= 500 && isJsonMutation(init)) {
      const item = await enqueue(input, init);
      return makeQueuedResponse(item);
    }

    return response;
  } catch (error) {
    if (!isJsonMutation(init)) throw error;
    const item = await enqueue(input, init);
    return makeQueuedResponse(item);
  }
}

function retryDelay(attempts: number) {
  return Math.min(
    MAX_RETRY_DELAY_MS,
    BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attempts - 1),
  );
}

function canAttempt(item: OfflineQueueItem, now: number) {
  if (!item.nextAttemptAt) return true;
  return Date.parse(item.nextAttemptAt) <= now;
}

function acquireSyncLock() {
  if (!isBrowser()) return false;

  const now = Date.now();
  const current = Number(window.localStorage.getItem(SYNC_LOCK_KEY) ?? "0");

  if (Number.isFinite(current) && current > now - SYNC_LOCK_TTL_MS) {
    return false;
  }

  window.localStorage.setItem(SYNC_LOCK_KEY, String(now));
  return true;
}

function releaseSyncLock() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SYNC_LOCK_KEY);
}

function refreshSyncLock() {
  if (!isBrowser()) return;
  window.localStorage.setItem(SYNC_LOCK_KEY, String(Date.now()));
}

async function recordLastError(message: string | null) {
  if (message) {
    await storePut(META_STORE, { key: "lastError", value: message });
  } else {
    await storeDelete(META_STORE, "lastError");
  }
}

export async function flushOfflineQueue(
  getAccessToken: () => Promise<string | null>,
  options: { force?: boolean } = {},
) {
  if (!isBrowser() || syncing || !navigator.onLine) return;
  if (!acquireSyncLock()) return;

  syncing = true;
  await emitSnapshot();

  try {
    const items = (await storeGetAll<OfflineQueueItem>(QUEUE_STORE)).sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt),
    );
    const now = Date.now();

    for (const item of items) {
      if (!options.force && !canAttempt(item, now)) continue;

      refreshSyncLock();
      const token = await getAccessToken();

      if (!token) {
        await recordLastError("Sign in is required before saved changes can sync.");
        break;
      }

      const headers = new Headers(item.headers);
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("X-AgriCore-Offline-Replay", item.id);

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers,
          body: item.body,
          cache: "no-store",
        });

        if (response.ok || response.status === 409) {
          await storeDelete(QUEUE_STORE, item.id);
          await recordLastError(null);
          continue;
        }

        item.attempts += 1;
        item.lastError = `HTTP ${response.status}`;
        item.nextAttemptAt = new Date(
          Date.now() + retryDelay(item.attempts),
        ).toISOString();
        await storePut(QUEUE_STORE, item);
        await recordLastError(item.lastError);

        if (response.status === 401 || response.status === 403) break;
      } catch (error) {
        item.attempts += 1;
        item.lastError =
          error instanceof Error ? error.message : "Network error";
        item.nextAttemptAt = new Date(
          Date.now() + retryDelay(item.attempts),
        ).toISOString();
        await storePut(QUEUE_STORE, item);
        await recordLastError(item.lastError);
        break;
      }
    }

    const remaining = await storeGetAll<OfflineQueueItem>(QUEUE_STORE);

    if (remaining.length === 0) {
      await storePut(META_STORE, {
        key: "lastSyncedAt",
        value: new Date().toISOString(),
      });
      await recordLastError(null);
    } else {
      await requestBackgroundSync();
    }
  } finally {
    syncing = false;
    releaseSyncLock();
    await emitSnapshot();
  }
}

export async function getOfflineSnapshot(): Promise<OfflineSnapshot> {
  if (!isBrowser()) {
    return {
      online: true,
      pending: 0,
      failed: 0,
      syncing: false,
      lastSyncedAt: null,
      lastError: null,
    };
  }

  const [items, lastSynced, lastError] = await Promise.all([
    storeGetAll<OfflineQueueItem>(QUEUE_STORE),
    storeGet<MetaRecord>(META_STORE, "lastSyncedAt"),
    storeGet<MetaRecord>(META_STORE, "lastError"),
  ]);

  return {
    online: navigator.onLine,
    pending: items.length,
    failed: items.filter((item) => item.attempts > 0).length,
    syncing,
    lastSyncedAt: lastSynced?.value ?? null,
    lastError: lastError?.value ?? null,
  };
}

async function emitSnapshot() {
  const snapshot = await getOfflineSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribeOfflineStatus(
  listener: (snapshot: OfflineSnapshot) => void,
) {
  listeners.add(listener);
  void getOfflineSnapshot().then(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function initialiseOfflineSync(
  getAccessToken: () => Promise<string | null>,
) {
  if (!isBrowser()) return () => undefined;

  const runSync = (force = false) => {
    if (!navigator.onLine) return;
    void flushOfflineQueue(getAccessToken, { force });
  };

  const onOnline = () => {
    runSync(true);
    void emitSnapshot();
  };

  const onOffline = () => {
    void emitSnapshot();
  };

  const onFocus = () => runSync();

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") runSync();
  };

  const onServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data?.type === "AGRICORE_SYNC_REQUESTED") runSync(true);
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibilityChange);
  navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);

  syncTimer = window.setInterval(() => runSync(), 30_000);
  runSync(true);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    navigator.serviceWorker?.removeEventListener(
      "message",
      onServiceWorkerMessage,
    );

    if (syncTimer !== null) {
      window.clearInterval(syncTimer);
      syncTimer = null;
    }
  };
}
