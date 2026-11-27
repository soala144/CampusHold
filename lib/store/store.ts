"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { performOp, refreshSnapshot } from "@/lib/server/actions";
import { recordIds } from "./ids";
import { emptyState, type AppState } from "./state";
import type { OpCall } from "./ops";

/**
 * Client cache of the signed-in user's data.
 *
 * The server renders the page with a snapshot (see StoreProvider). Actions run
 * here first so the UI updates instantly, then the same operation runs on the
 * server, which checks permissions and writes to the database. The server's
 * snapshot always wins.
 */

const listeners = new Set<() => void>();
const errorListeners = new Set<(message: string) => void>();
let state: AppState | null = null;
let pending = 0;
let queue: Promise<unknown> = Promise.resolve();

export const InitialStateContext = createContext<AppState>(emptyState());

export function getState(): AppState {
  return state ?? emptyState();
}

function notify() {
  listeners.forEach((l) => l());
}

export function setState(next: AppState) {
  state = next;
  notify();
}

let lastHydrated: AppState | null = null;

/**
 * Called by StoreProvider while rendering a server snapshot. Only a *new*
 * snapshot replaces local state, so optimistic changes aren't overwritten
 * by unrelated re-renders.
 */
export function hydrate(snapshot: AppState) {
  if (typeof window === "undefined" || snapshot === lastHydrated) return;
  lastHydrated = snapshot;
  state = snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppState(): AppState {
  const initial = useContext(InitialStateContext);
  return useSyncExternalStore(subscribe, () => state ?? initial, () => initial);
}

export function onSyncError(listener: (message: string) => void) {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Run an operation: apply it locally for an instant result, then confirm it
 * on the server. Server calls are queued so they apply in order.
 */
export function run<T>(op: OpCall<T>): Result<T> {
  const { result: out, ids } = recordIds(() => op(getState()));
  if ("error" in out) return { ok: false, error: out.error };
  setState(out.state);

  pending++;
  queue = queue.then(async () => {
    try {
      const res = await performOp(op.opName, op.opArgs, ids);
      if (!res.ok) errorListeners.forEach((l) => l(res.error));
      // Only replace local state once every queued change has been confirmed.
      if (pending === 1 && res.snapshot) setState(res.snapshot);
    } catch {
      errorListeners.forEach((l) => l("Couldn't reach the server. Your last change may not have been saved."));
    } finally {
      pending--;
    }
  });
  return { ok: true, value: out.value };
}

/** Pull fresh data (e.g. new messages) unless local changes are still syncing. */
export async function refresh() {
  if (pending > 0 || document.visibilityState !== "visible") return;
  const snapshot = await refreshSnapshot();
  if (snapshot && pending === 0) setState(snapshot);
}
