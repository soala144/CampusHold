"use server";

import { sql } from "drizzle-orm";
import { rawOp } from "@/lib/store/ops";
import { replayIds } from "@/lib/store/ids";
import type { AppState } from "@/lib/store/state";
import { authorize, simulationEnabled } from "./authorize";
import { getDb } from "./db";
import { getSessionUser } from "./session";
import { loadWorld, persist, toSnapshot } from "./world";

export type PerformResult = { ok: true; snapshot: AppState } | { ok: false; error: string; snapshot: AppState | null };

/** Current data for the signed-in user (or a visitor), safe to send to the browser. */
export async function currentSnapshot(): Promise<AppState> {
  const user = await getSessionUser();
  const world = await loadWorld(getDb(), user);
  return { ...toSnapshot(world), simulation: simulationEnabled() };
}

/** Polled by the browser for new messages and updates. */
export async function refreshSnapshot(): Promise<AppState | null> {
  try {
    return await currentSnapshot();
  } catch {
    return null;
  }
}

/**
 * Run a store operation on the server: check the session and permissions,
 * run the same pure operation the browser ran, and save the result in one
 * transaction. Job rows are locked so two people can't change a job at once.
 */
export async function performOp(name: string, args: unknown[], ids: string[]): Promise<PerformResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Your session has ended. Please log in again.", snapshot: null };
  const factory = rawOp(name);
  if (!factory) return { ok: false, error: "Unknown action.", snapshot: null };
  const replay = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string").slice(0, 50) : [];

  let error: string | null = null;
  let result: AppState | null = null;
  try {
    await getDb().transaction(async (tx) => {
      const jobId = typeof args?.[0] === "string" && args[0].startsWith("job_") ? args[0] : null;
      if (jobId) await tx.execute(sql`select id from jobs where id = ${jobId} for update`);

      const before = await loadWorld(tx, user);
      const verdict = authorize(name, args, user, before);
      if (!verdict.ok) {
        error = verdict.error;
        return;
      }
      const out = replayIds(replay, () => factory(...verdict.args)(before));
      if ("error" in out) {
        error = out.error;
        return;
      }
      await persist(tx, before, out.state);
      result = out.state;
    });
  } catch (e) {
    console.error(`[performOp:${name}]`, e);
    error = "Something went wrong saving that. Please try again.";
  }

  // On success the saved state is already in memory; only reload after a failure.
  if (!error && result) return { ok: true, snapshot: { ...toSnapshot(result), simulation: simulationEnabled() } };
  const snapshot = await currentSnapshot().catch(() => null);
  return { ok: false, error: error ?? "Something went wrong.", snapshot };
}
