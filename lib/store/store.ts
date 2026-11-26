"use client";

import { useSyncExternalStore } from "react";
import { createSeedState, STATE_VERSION, type AppState } from "./state";

/**
 * Tiny client-side store for the Stage 2 mock.
 * Persisted to localStorage so simulated workflows survive a refresh.
 * Replaced by the database and server actions in Stage 3.
 */

const KEY = "campushold:mock-state";
const listeners = new Set<() => void>();
let state: AppState | null = null;

function load(): AppState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    // Corrupt or unavailable storage: fall back to seed data.
  }
  return createSeedState();
}

export function getState(): AppState {
  if (!state) state = load();
  return state;
}

export function setState(next: AppState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or disabled; keep the in-memory state.
  }
  listeners.forEach((l) => l());
}

export function resetState() {
  setState(createSeedState());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Subscribe to the whole state. Selectors should be cheap; state is small. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

/** Run a pure operation against the current state and commit it if it succeeds. */
export function run<T>(op: (s: AppState) => { state: AppState; value: T } | { error: string }): Result<T> {
  const out = op(getState());
  if ("error" in out) return { ok: false, error: out.error };
  setState(out.state);
  return { ok: true, value: out.value };
}

/**
 * Safe to use in server-rendered components: returns null during SSR and
 * hydration, then the real demo session flag once in the browser.
 */
export function useSignedIn(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => getState().signedIn,
    () => null,
  );
}
