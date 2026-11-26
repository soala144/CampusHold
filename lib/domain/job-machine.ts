/**
 * Job lifecycle state machine.
 *
 * This is the single source of truth for which job transitions are allowed
 * and who may perform them. The Stage 2 mock store uses it on the client;
 * Stage 3 will run the same rules on the server.
 */
import type { Tone } from "@/lib/tone";
import type { Job, JobStatus, PaymentStatus } from "./types";

export type Actor = "client" | "freelancer" | "admin" | "system";

export type JobAction =
  | "send_request"
  | "accept"
  | "decline"
  | "cancel"
  | "initiate_payment"
  | "confirm_payment"
  | "fail_payment"
  | "start_work"
  | "submit_delivery"
  | "request_revision"
  | "approve"
  | "complete"
  | "open_dispute"
  | "resolve_dispute_release"
  | "resolve_dispute_refund";

interface TransitionRule {
  from: readonly JobStatus[];
  to: JobStatus | "restore";
  actors: readonly Actor[];
  /** Payment status the job moves to, if any. */
  payment?: PaymentStatus;
  /** Extra guard beyond the status check. Returns a reason when blocked. */
  guard?: (job: Job) => string | null;
}

const DISPUTABLE: readonly JobStatus[] = [
  "payment_confirmed",
  "in_progress",
  "submitted",
  "revision_requested",
  "approved",
];

export const transitions: Record<JobAction, TransitionRule> = {
  send_request: { from: ["draft"], to: "pending_response", actors: ["client"] },
  accept: { from: ["pending_response"], to: "accepted", actors: ["freelancer"] },
  decline: { from: ["pending_response"], to: "cancelled", actors: ["freelancer"] },
  cancel: {
    from: ["draft", "pending_response", "accepted"],
    to: "cancelled",
    actors: ["client", "freelancer"],
  },
  initiate_payment: {
    from: ["accepted"],
    to: "awaiting_payment",
    actors: ["client"],
    payment: "initiated",
  },
  // Only the payment provider's verified confirmation (simulated here) may confirm.
  confirm_payment: {
    from: ["awaiting_payment"],
    to: "payment_confirmed",
    actors: ["system"],
    payment: "pending_settlement",
  },
  fail_payment: { from: ["awaiting_payment"], to: "accepted", actors: ["system"], payment: "failed" },
  start_work: { from: ["payment_confirmed"], to: "in_progress", actors: ["freelancer"] },
  submit_delivery: {
    from: ["in_progress", "revision_requested"],
    to: "submitted",
    actors: ["freelancer"],
  },
  request_revision: {
    from: ["submitted"],
    to: "revision_requested",
    actors: ["client"],
    guard: (job) =>
      job.revisionsUsed >= job.revisionsAllowed
        ? "All included revisions have been used. Approve the work or open a dispute."
        : null,
  },
  // Release is only requested once funds have settled; the store handles that.
  approve: { from: ["submitted"], to: "approved", actors: ["client"] },
  complete: {
    from: ["approved"],
    to: "completed",
    actors: ["system"],
    payment: "transfer_completed",
  },
  open_dispute: {
    from: DISPUTABLE,
    to: "disputed",
    actors: ["client", "freelancer"],
    guard: (job) =>
      job.paymentStatus === "transfer_completed" ? "Payment has already been released." : null,
  },
  resolve_dispute_release: {
    from: ["disputed"],
    to: "completed",
    actors: ["admin"],
    payment: "transfer_completed",
  },
  resolve_dispute_refund: {
    from: ["disputed"],
    to: "cancelled",
    actors: ["admin"],
    payment: "refunded",
  },
};

export type TransitionResult =
  | { ok: true; status: JobStatus; paymentStatus: PaymentStatus }
  | { ok: false; reason: string };

/** Check whether `actor` may perform `action` on `job`, and what the result would be. */
export function evaluateTransition(job: Job, action: JobAction, actor: Actor): TransitionResult {
  const rule = transitions[action];
  if (!rule.actors.includes(actor)) {
    return { ok: false, reason: `This action can't be performed by the ${actor}.` };
  }
  if (!rule.from.includes(job.status)) {
    return {
      ok: false,
      reason: `Not allowed while the job is “${jobStatusMeta[job.status].label}”.`,
    };
  }
  const blocked = rule.guard?.(job);
  if (blocked) return { ok: false, reason: blocked };

  const status = rule.to === "restore" ? (job.statusBeforeDispute ?? job.status) : rule.to;
  return { ok: true, status, paymentStatus: rule.payment ?? job.paymentStatus };
}

export function can(job: Job, action: JobAction, actor: Actor): boolean {
  return evaluateTransition(job, action, actor).ok;
}

/* ---------- Presentation metadata (shared by every screen) ---------- */


export const jobStatusMeta: Record<JobStatus, { label: string; tone: Tone; hint: string }> = {
  draft: { label: "Draft", tone: "neutral", hint: "Not sent yet." },
  pending_response: {
    label: "Pending response",
    tone: "warning",
    hint: "Waiting for the freelancer to accept or decline.",
  },
  accepted: {
    label: "Accepted",
    tone: "info",
    hint: "The freelancer accepted. The client funds the job next.",
  },
  awaiting_payment: {
    label: "Awaiting payment",
    tone: "warning",
    hint: "Payment started. Waiting for the provider to confirm it.",
  },
  payment_confirmed: {
    label: "Payment confirmed",
    tone: "success",
    hint: "Payment verified. The freelancer can start work.",
  },
  in_progress: { label: "In progress", tone: "info", hint: "The freelancer is working on it." },
  submitted: {
    label: "Submitted for review",
    tone: "accent",
    hint: "Work delivered. The client reviews it next.",
  },
  revision_requested: {
    label: "Revision requested",
    tone: "warning",
    hint: "The client asked for changes.",
  },
  approved: {
    label: "Approved",
    tone: "success",
    hint: "Work approved. Payment release has been requested.",
  },
  completed: { label: "Completed", tone: "neutral", hint: "Paid out and closed." },
  disputed: {
    label: "Disputed",
    tone: "danger",
    hint: "Under review. Payment is not released while a dispute is open.",
  },
  cancelled: { label: "Cancelled", tone: "neutral", hint: "This job was cancelled." },
};

/** Ordered lifecycle used for progress indicators (excludes side states). */
export const jobLifecycle: JobStatus[] = [
  "pending_response",
  "accepted",
  "awaiting_payment",
  "payment_confirmed",
  "in_progress",
  "submitted",
  "approved",
  "completed",
];

export function lifecycleIndex(status: JobStatus): number {
  if (status === "revision_requested") return jobLifecycle.indexOf("in_progress");
  if (status === "draft") return -1;
  return jobLifecycle.indexOf(status);
}

/** Jobs whose status means work is ongoing (used for dashboards and filters). */
export const ACTIVE_STATUSES: JobStatus[] = [
  "accepted",
  "awaiting_payment",
  "payment_confirmed",
  "in_progress",
  "submitted",
  "revision_requested",
  "approved",
  "disputed",
];
