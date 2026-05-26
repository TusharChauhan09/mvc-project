"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "swr_cache_v1:";
const FRESH_MS = 4000;

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();
// In-flight requests per key — avoids two callers triggering the same fetch in parallel.
const inflight = new Map<string, Promise<unknown>>();
// Last successful fetch time per key — used to skip the on-mount refresh when data is fresh.
const freshness = new Map<string, number>();

function subscribe(key: string, fn: Listener) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
    if (set && set.size === 0) listeners.delete(key);
  };
}

function notify(key: string) {
  const set = listeners.get(key);
  if (!set) return;
  for (const fn of set) fn();
}

function readCache<T>(key: string | null): T | null {
  if (typeof window === "undefined" || !key) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string | null, value: T) {
  if (typeof window === "undefined" || !key) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

function clearCache(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * Force any mounted useCached(key) to re-fetch immediately, and clear the cached
 * snapshot so next mount also re-fetches instead of showing stale data.
 */
export function invalidateCache(key: string) {
  clearCache(key);
  notify(key);
}

/**
 * Optimistically write a value into the cache and notify subscribers so any
 * mounted useCached(key) reflects it without waiting for a network refresh.
 */
export function mutateCache<T>(key: string, value: T) {
  writeCache(key, value);
  freshness.set(key, Date.now());
  notify(key);
}

/**
 * Stale-while-revalidate hook. Returns cached value synchronously on first render,
 * then fetches in background and updates cache. Skips spinner if cached.
 */
export function useCached<T>(
  key: string | null,
  fetcher: () => Promise<T>,
): {
  data: T | null;
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  setData: (value: T) => void;
} {
  const initial = readCache<T>(key);
  const [data, setDataState] = useState<T | null>(initial);
  const [loading, setLoading] = useState(initial === null && key !== null);
  const [error, setError] = useState<unknown>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    if (!key) return;
    try {
      // Dedupe: if same key already in flight (e.g. prewarm fired it), reuse that promise.
      const existing = inflight.get(key) as Promise<T> | undefined;
      const promise = existing ?? fetcherRef.current();
      if (!existing) {
        inflight.set(key, promise.finally(() => inflight.delete(key)));
      }
      const next = await promise;
      setDataState(next);
      writeCache(key, next);
      freshness.set(key, Date.now());
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    if (!key) {
      setLoading(false);
      return;
    }
    // Skip the on-mount refresh when prewarm (or a previous mount) already loaded this key recently.
    const last = freshness.get(key);
    if (initial !== null && last !== undefined && Date.now() - last < FRESH_MS) {
      setLoading(false);
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refresh]);

  // Subscribe to cross-component invalidation/mutation events for this key.
  useEffect(() => {
    if (!key) return;
    return subscribe(key, () => {
      const cached = readCache<T>(key);
      if (cached !== null) {
        setDataState(cached);
      }
      void refresh();
    });
  }, [key, refresh]);

  const setData = useCallback(
    (value: T) => {
      setDataState(value);
      writeCache(key, value);
    },
    [key],
  );

  return { data, loading, error, refresh, setData };
}
