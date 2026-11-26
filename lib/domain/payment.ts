import type { Tone } from "@/lib/tone";
import type { Job, Kobo, PaymentStatus, Transaction } from "./types";

export const paymentStatusMeta: Record<PaymentStatus, { label: string; tone: Tone; hint: string }> =
  {
    not_started: { label: "Not funded", tone: "neutral", hint: "No payment has been made yet." },
    initiated: {
      label: "Payment initiated",
      tone: "warning",
      hint: "Checkout started. Not confirmed until the provider verifies it.",
    },
    confirmed: { label: "Payment confirmed", tone: "success", hint: "Verified with the provider." },
    pending_settlement: {
      label: "Funds pending settlement",
      tone: "info",
      hint: "Payment confirmed. The provider is still settling the funds.",
    },
    available: {
      label: "Funds available",
      tone: "success",
      hint: "Settled and available for transfer once released.",
    },
    release_requested: {
      label: "Release requested",
      tone: "accent",
      hint: "The client approved the work. Payout has been requested.",
    },
    transfer_processing: {
      label: "Transfer processing",
      tone: "info",
      hint: "The provider is sending the payout.",
    },
    transfer_completed: {
      label: "Transfer completed",
      tone: "success",
      hint: "The payout has been sent to the freelancer.",
    },
    refund_processing: {
      label: "Refund processing",
      tone: "warning",
      hint: "A refund to the client is being processed.",
    },
    refunded: { label: "Refunded", tone: "neutral", hint: "Returned to the client." },
    failed: { label: "Payment failed", tone: "danger", hint: "The payment did not go through." },
  };

/** Payment states in which money is with the provider on behalf of a job. */
export const HELD_PAYMENT_STATES: PaymentStatus[] = [
  "confirmed",
  "pending_settlement",
  "available",
  "release_requested",
  "transfer_processing",
];

export interface Balances {
  /** Confirmed but still settling with the provider. */
  pendingSettlement: Kobo;
  /** Settled and waiting for approval/release. */
  held: Kobo;
  /** Freelancer: payouts in flight. Client: releases in flight. */
  inTransit: Kobo;
  /** Freelancer: payouts received. Client: paid out for completed work. */
  settled: Kobo;
  /** Client only: refunds received. */
  refunded: Kobo;
}

const sum = (xs: { amount: Kobo }[]) => xs.reduce((s, x) => s + x.amount, 0);

/**
 * Derive balances for a user from jobs and ledger entries.
 * Never stored — always computed, so it can't drift from the records.
 */
export function deriveBalances(
  userId: string,
  view: "client" | "freelancer",
  jobs: Job[],
  transactions: Transaction[],
): Balances {
  const mine = jobs.filter((j) => (view === "client" ? j.clientId : j.freelancerId) === userId);
  const budgetWhere = (states: PaymentStatus[]) =>
    mine.filter((j) => states.includes(j.paymentStatus)).reduce((s, j) => s + j.budget, 0);

  const pendingSettlement = budgetWhere(["confirmed", "pending_settlement"]);
  const held = budgetWhere(["available", "release_requested"]);

  if (view === "freelancer") {
    const payouts = transactions.filter((t) => t.type === "payout" && t.userId === userId);
    return {
      pendingSettlement,
      held,
      inTransit: sum(payouts.filter((t) => t.status === "processing")),
      settled: sum(payouts.filter((t) => t.status === "succeeded")),
      refunded: 0,
    };
  }

  const refunds = transactions.filter((t) => t.type === "refund" && t.userId === userId);
  return {
    pendingSettlement,
    held,
    inTransit: budgetWhere(["transfer_processing"]),
    settled: budgetWhere(["transfer_completed"]),
    refunded: sum(refunds.filter((t) => t.status === "succeeded")),
  };
}
