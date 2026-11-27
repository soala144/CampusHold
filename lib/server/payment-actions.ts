"use server";

import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { getSessionUser } from "./session";
import * as payments from "./payments";

/** Client: open Bachs checkout for a job. */
export async function startJobCheckout(jobId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Please log in again." };
  if (typeof jobId !== "string") return { ok: false as const, error: "Job not found." };
  return payments.startCheckout(user, jobId);
}

/** Client (polling) or anyone on the job: ask Bachs whether the payment has landed. */
export async function checkJobPayment(jobId: string): Promise<payments.PaymentCheck> {
  const user = await getSessionUser();
  if (!user || typeof jobId !== "string") return "none";
  const [job] = await getDb().select({ c: schema.jobs.clientId, f: schema.jobs.freelancerId }).from(schema.jobs).where(eq(schema.jobs.id, jobId));
  if (!job || (job.c !== user.id && job.f !== user.id && !user.isAdmin)) return "none";
  try {
    return await payments.verifyPayment(jobId);
  } catch (e) {
    console.error("[bachs] verify", e);
    return "pending";
  }
}

/** Freelancer: start or continue payout setup with Bachs. */
export async function startPayoutSetup() {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Please log in again." };
  return payments.startPayoutOnboarding(user);
}

/** Freelancer: refresh payout status after returning from Bachs. */
export async function refreshPayoutSetup() {
  const user = await getSessionUser();
  if (!user) return null;
  try {
    return await payments.refreshPayoutStatus(user.id);
  } catch (e) {
    console.error("[bachs] refresh payouts", e);
    return null;
  }
}
