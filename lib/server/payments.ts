import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { HELD_PAYMENT_STATES } from "@/lib/domain/payment";
import type { Job, Transaction, User } from "@/lib/domain/types";
import { rawOp } from "@/lib/store/ops";
import type { AppState } from "@/lib/store/state";
import * as bachs from "./bachs";
import { newId } from "./crypto";
import { getDb, schema, type DB } from "./db";
import { loadWorld, persist } from "./world";

/**
 * Real payment flows against Bachs. CampusHold coordinates; Bachs moves money.
 *
 * Rules this module keeps:
 * - A job is funded only after we read the checkout back from Bachs and the
 *   full amount in NGN has been paid. Redirects and webhook bodies alone never count.
 * - Money is released only from settled (available) funds, never pending ones.
 * - Every provider call that moves money carries an idempotency key derived
 *   from our own ledger id, so retries can't pay or refund twice.
 */

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Op = (s: AppState) => { state: AppState; value: unknown } | { error: string };

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
/** Bachs refuses non-https return URLs. Until the app is deployed we open checkout in a new tab. */
export const canRedirect = () => appUrl().startsWith("https://");
const returnUrl = (path: string) => (canRedirect() ? `${appUrl()}${path}` : `https://example.com/campushold-local${path}`);

const op = (name: string, ...args: unknown[]): Op => rawOp(name)!(...args) as Op;

/** Run an operation as the system on one job, inside a transaction with the job row locked. */
export async function runOnJob(jobId: string, build: (world: AppState) => Op | null, db: DB = getDb()) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from jobs where id = ${jobId} for update`);
    const before = await loadWorld(tx, null, { jobId });
    const operation = build(before);
    if (!operation) return { ok: false as const, error: "nothing to do", state: before };
    const out = operation(before);
    if ("error" in out) return { ok: false as const, error: out.error, state: before };
    await persist(tx, before, out.state);
    return { ok: true as const, state: out.state };
  });
}

async function audit(action: string, target: string, db: DB | Tx = getDb()) {
  await db.insert(schema.auditLog).values({ id: newId("a"), actorId: "system", action, target, createdAt: new Date().toISOString() });
}

async function notify(userId: string, title: string, body: string, href: string) {
  await getDb()
    .insert(schema.notifications)
    .values({ id: newId("n"), userId, type: "payout_initiated", title, body, href, read: false, createdAt: new Date().toISOString() });
}

const findJob = async (jobId: string) => (await getDb().select().from(schema.jobs).where(eq(schema.jobs.id, jobId)))[0];
const jobTxs = (jobId: string) => getDb().select().from(schema.transactions).where(eq(schema.transactions.jobId, jobId));

/* ================= Collection ================= */

export type CheckoutStart = { ok: true; url: string; newTab: boolean } | { ok: false; error: string };

/** Client starts paying for an accepted job. Reuses an open checkout instead of creating a second one. */
export async function startCheckout(user: User, jobId: string): Promise<CheckoutStart> {
  const job = await findJob(jobId);
  if (!job || job.clientId !== user.id) return { ok: false, error: "Only the client can fund this job." };

  if (job.status === "awaiting_payment") {
    const open = (await jobTxs(jobId)).find((t) => t.type === "payment" && t.status === "processing" && t.checkoutUrl);
    if (open?.checkoutUrl) return { ok: true, url: open.checkoutUrl, newTab: !canRedirect() };
  }
  if (job.status !== "accepted") return { ok: false, error: "This job can't be funded right now." };

  // 1. Record the intent in our ledger (job → awaiting payment, payment entry "processing").
  const started = await runOnJob(jobId, () => op("jobAction", jobId, "initiate_payment", { as: "client", byUserId: user.id }));
  if (!started.ok) return { ok: false, error: started.error };
  const payment = started.state.transactions.find((t) => t.jobId === jobId && t.type === "payment" && t.status === "processing" && !t.providerRef);
  if (!payment) return { ok: false, error: "Couldn't record the payment." };
  const reference = `CH-${payment.id}`;

  // 2. Create the hosted checkout at Bachs (idempotent on our ledger id).
  try {
    const session = await bachs.createCheckout({
      amountKobo: job.budget,
      reference,
      customer: { email: user.email, name: user.displayName },
      successUrl: returnUrl(`/jobs/${jobId}/pay?returned=1`),
      cancelUrl: returnUrl(`/jobs/${jobId}/pay?cancelled=1`),
      metadata: { job_id: jobId, transaction_id: payment.id },
      idempotencyKey: payment.id,
    });
    await getDb()
      .update(schema.transactions)
      .set({ provider: "bachs", simulated: false, reference, providerRef: session.checkout_id, checkoutUrl: session.checkout_url ?? null })
      .where(eq(schema.transactions.id, payment.id));
    return { ok: true, url: session.checkout_url!, newTab: !canRedirect() };
  } catch (e) {
    console.error("[bachs] createCheckout", e);
    await runOnJob(jobId, () => op("jobAction", jobId, "fail_payment", { as: "system" }));
    return { ok: false, error: "We couldn't open the payment page. Please try again." };
  }
}

export type PaymentCheck = "paid" | "pending" | "failed" | "expired" | "underpaid" | "none";

/** Read the checkout back from Bachs and update the job. Safe to call repeatedly (polling, webhooks). */
export async function verifyPayment(jobId: string): Promise<PaymentCheck> {
  const payment = (await jobTxs(jobId)).find((t) => t.type === "payment" && t.provider === "bachs" && t.providerRef && t.status === "processing");
  if (!payment) {
    const job = await findJob(jobId);
    return job && job.status !== "awaiting_payment" && job.paymentStatus !== "not_started" && job.paymentStatus !== "failed" ? "paid" : "none";
  }
  const session = await bachs.getCheckout(payment.providerRef!);
  const outcome = bachs.checkoutOutcome(session);

  if (outcome === "paid") {
    // Amount and currency must match what we asked for.
    if (bachs.toKobo(session.amount) !== payment.amount) {
      await audit(`Payment amount mismatch on ${payment.providerRef}`, jobId);
      return "underpaid";
    }
    await runOnJob(jobId, (w) => {
      const job = w.jobs[0];
      return job?.status === "awaiting_payment" ? op("jobAction", jobId, "confirm_payment", { as: "system" }) : null;
    });
    await getDb()
      .update(schema.transactions)
      .set({ providerChargeId: session.charge?.payment_id ?? null, providerFee: bachs.toKobo(session.charge?.fees?.amount) || 0 })
      .where(eq(schema.transactions.id, payment.id));
    await audit(`Payment confirmed by Bachs (${payment.providerRef})`, jobId);
    await syncSettlement(jobId);
    return "paid";
  }
  if (outcome === "failed" || outcome === "expired") {
    await runOnJob(jobId, (w) => (w.jobs[0]?.status === "awaiting_payment" ? op("jobAction", jobId, "fail_payment", { as: "system" }) : null));
    return outcome;
  }
  if (outcome === "underpaid") await audit(`Underpaid checkout ${payment.providerRef}: needs review`, jobId);
  return outcome;
}

/* ================= Settlement and release ================= */

/**
 * Mark a job's funds as available once Bachs's available NGN balance covers
 * every job we're already holding plus this one. Then try any pending payout.
 */
export async function syncSettlement(jobId: string) {
  const job = await findJob(jobId);
  if (!job) return;
  if (job.paymentStatus === "pending_settlement" || job.paymentStatus === "confirmed") {
    const balances = await bachs.getBalances();
    const available = bachs.toKobo(balances.balances.find((b) => b.currency === "NGN")?.available_balance);
    // Bachs keeps its processing fee, so each job is backed by its net amount.
    const [row] = await getDb().execute<{ held: string | null }>(sql`
      select coalesce(sum(j.budget - t.provider_fee), 0) as held
      from jobs j join transactions t on t.job_id = j.id and t.type = 'payment' and t.status = 'succeeded' and t.provider = 'bachs'
      where j.payment_status in ('available', 'release_requested')`);
    const held = Number(row?.held ?? 0);
    if (available - held >= job.budget - (await paymentFee(jobId))) {
      await runOnJob(jobId, () => op("settleFunds", jobId));
      await audit("Funds available at Bachs", job.title);
    }
  }
  await processPayout(jobId);
}

/** The processing fee Bachs kept from a job's payment. */
async function paymentFee(jobId: string) {
  const pay = (await jobTxs(jobId)).find((t) => t.type === "payment" && t.status === "succeeded");
  return pay?.providerFee ?? 0;
}

/** Send an approved job's payout to the freelancer's Bachs account. */
export async function processPayout(jobId: string): Promise<"sent" | "waiting" | "none" | "failed"> {
  const job = await findJob(jobId);
  if (!job || job.paymentStatus !== "release_requested") return "none";
  const payout = (await jobTxs(jobId)).find((t) => t.type === "payout" && t.status === "processing" && !t.providerRef);
  if (!payout) return "none";

  const [freelancer] = await getDb().select().from(schema.users).where(eq(schema.users.id, job.freelancerId));
  if (!freelancer?.bachsAccountId || freelancer.bachsPayoutStatus !== "active") {
    await notify(job.freelancerId, "Set up payouts to get paid", `Your payment for “${job.title}” is ready. Finish payout setup to receive it.`, "/wallet/payouts");
    return "waiting";
  }
  // Pay out what Bachs actually holds for this job: the price minus its processing fee.
  const amount = payout.amount - (await paymentFee(jobId));
  try {
    const transfer = await bachs.createTransfer({
      destination: freelancer.bachsAccountId,
      amountKobo: amount,
      jobId,
      description: `CampusHold: ${job.title}`.slice(0, 120),
      idempotencyKey: payout.id,
    });
    await getDb()
      .update(schema.transactions)
      .set({ provider: "bachs", simulated: false, providerRef: transfer.id, amount })
      .where(eq(schema.transactions.id, payout.id));
    await runOnJob(jobId, () => op("jobAction", jobId, "complete", { as: "system" }));
    await audit(`Transfer ${transfer.id} sent to freelancer`, job.title);
    return "sent";
  } catch (e) {
    if (e instanceof bachs.BachsError && e.code === "INSUFFICIENT_BALANCE") return "waiting";
    console.error("[bachs] transfer", e);
    await runOnJob(jobId, () => op("failTransfer", jobId));
    await audit(`Transfer failed: ${e instanceof Error ? e.message : "unknown error"}`, job.title);
    return "failed";
  }
}

/** After an admin resolves a dispute in the client's favour: refund through Bachs. */
export async function processRefund(jobId: string) {
  const txs = await jobTxs(jobId);
  const refund = txs.find((t) => t.type === "refund" && !t.providerRef && t.provider !== "bachs");
  const payment = txs.find((t) => t.type === "payment" && t.status === "succeeded" && t.providerChargeId);
  if (!refund || !payment) return;
  try {
    const r = await bachs.createRefund({
      chargeId: payment.providerChargeId!,
      reference: `RF-${refund.id}`,
      reason: "Dispute resolved in the client's favour",
      idempotencyKey: refund.id,
    });
    await getDb()
      .update(schema.transactions)
      .set({ provider: "bachs", simulated: false, providerRef: r.refund_id, status: "processing" })
      .where(eq(schema.transactions.id, refund.id));
  } catch (e) {
    // e.g. NGN bank transfers can't be refunded through the API.
    await getDb()
      .update(schema.transactions)
      .set({ provider: "bachs", simulated: false, status: "pending" })
      .where(eq(schema.transactions.id, refund.id));
    await audit(`Manual refund needed: ${e instanceof Error ? e.message : "refund failed"}`, jobId);
  }
}

/** After an admin resolves a dispute in the freelancer's favour: the payout the op recorded must really be sent. */
export async function processDisputeRelease(jobId: string) {
  const job = await findJob(jobId);
  if (!job) return;
  const payout = (await jobTxs(jobId)).find((t) => t.type === "payout" && !t.providerRef && t.provider !== "bachs");
  if (!payout) return;
  const [freelancer] = await getDb().select().from(schema.users).where(eq(schema.users.id, job.freelancerId));
  if (!freelancer?.bachsAccountId || freelancer.bachsPayoutStatus !== "active") {
    await getDb().update(schema.transactions).set({ provider: "bachs", simulated: false, status: "pending" }).where(eq(schema.transactions.id, payout.id));
    await notify(job.freelancerId, "Set up payouts to get paid", `A dispute on “${job.title}” was resolved in your favour. Finish payout setup to receive it.`, "/wallet/payouts");
    return;
  }
  try {
    const t = await bachs.createTransfer({ destination: freelancer.bachsAccountId, amountKobo: payout.amount, jobId, description: `CampusHold: ${job.title}`.slice(0, 120), idempotencyKey: payout.id });
    await getDb().update(schema.transactions).set({ provider: "bachs", simulated: false, providerRef: t.id, status: "succeeded" }).where(eq(schema.transactions.id, payout.id));
  } catch (e) {
    await getDb().update(schema.transactions).set({ provider: "bachs", simulated: false, status: "failed" }).where(eq(schema.transactions.id, payout.id));
    await audit(`Dispute payout failed: ${e instanceof Error ? e.message : "transfer failed"}`, job.title);
  }
}

/* ================= Freelancer payouts (Bachs Connect) ================= */

export type OnboardingStart = { ok: true; url: string; newTab: boolean } | { ok: false; error: string };

export async function startPayoutOnboarding(user: User): Promise<OnboardingStart> {
  if (!user.roles.freelancer) return { ok: false, error: "Payouts are for freelancers." };
  const db = getDb();
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  let accountId = row.bachsAccountId;
  try {
    if (!accountId) {
      const acct = await bachs.createConnectedAccount({ email: row.email, name: row.displayName, idempotencyKey: `acct-${user.id}` });
      accountId = acct.id;
      await db.update(schema.users).set({ bachsAccountId: accountId, bachsPayoutStatus: "onboarding" }).where(eq(schema.users.id, user.id));
    }
    const link = await bachs.createAccountLink(accountId, returnUrl("/wallet/payouts?setup=done"), returnUrl("/wallet/payouts?setup=retry"));
    return { ok: true, url: link.url, newTab: !canRedirect() };
  } catch (e) {
    console.error("[bachs] onboarding", e);
    if (e instanceof bachs.BachsError && e.status === 403) {
      return { ok: false, error: "Payouts through Bachs aren’t switched on for CampusHold yet. We’ll let you know when they are." };
    }
    return { ok: false, error: "We couldn't start payout setup. Please try again." };
  }
}

/** Re-read a freelancer's Bachs account and release anything waiting on them. */
export async function refreshPayoutStatus(userId: string) {
  const db = getDb();
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!row?.bachsAccountId) return null;
  const acct = await bachs.getConnectedAccount(row.bachsAccountId);
  const status = bachs.transfersActive(acct) ? "active" : (acct.requirements?.currently_due?.length ?? 0) > 0 ? "onboarding" : "restricted";
  await db.update(schema.users).set({ bachsPayoutStatus: status }).where(eq(schema.users.id, userId));
  if (status === "active") {
    const waiting = await db
      .select({ id: schema.jobs.id })
      .from(schema.jobs)
      .where(and(eq(schema.jobs.freelancerId, userId), eq(schema.jobs.paymentStatus, "release_requested")));
    for (const j of waiting) await processPayout(j.id);
  }
  return status;
}

/* ================= Webhooks ================= */

interface BachsEvent {
  id: string;
  type: string;
  account?: string;
  data: Record<string, unknown>;
}

/** Handle one verified, not-yet-processed event. Re-reads state from Bachs rather than trusting the payload. */
export async function handleEvent(event: BachsEvent) {
  const d = event.data ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  switch (event.type) {
    case "checkout.completed":
    case "checkout.expired":
    case "collection.succeeded":
    case "collection.failed":
    case "collection.underpaid": {
      const checkoutId = str(d.checkout_id) ?? (str(d.id)?.startsWith("chk_") ? str(d.id) : undefined);
      if (!checkoutId) return "ignored";
      const [tx] = await getDb().select().from(schema.transactions).where(eq(schema.transactions.providerRef, checkoutId));
      if (!tx) return "ignored";
      return verifyPayment(tx.jobId);
    }
    case "refund.paid":
    case "refund.failed": {
      const refundId = str(d.refund_id) ?? str(d.id);
      if (!refundId) return "ignored";
      const status = event.type === "refund.paid" ? "succeeded" : "failed";
      await getDb().update(schema.transactions).set({ status, updatedAt: new Date().toISOString() }).where(eq(schema.transactions.providerRef, refundId));
      if (status === "failed") await audit(`Refund ${refundId} failed: needs manual refund`, refundId);
      return status;
    }
    case "account.updated":
    case "capability.updated": {
      const accountId = event.account ?? str(d.account_id) ?? str(d.id);
      if (!accountId) return "ignored";
      const [row] = await getDb().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.bachsAccountId, accountId));
      return row ? refreshPayoutStatus(row.id) : "ignored";
    }
    default:
      return "ignored";
  }
}

/* ================= Helpers for the UI ================= */

export function paymentsMode(): AppState["payments"] {
  if (bachs.paymentsProvider() !== "bachs") return "simulated";
  return process.env.BACHS_ENV === "live" ? "bachs-live" : "bachs-sandbox";
}

/** Is this job's money currently with Bachs on our behalf? */
export const isHeld = (j: Pick<Job, "paymentStatus">) => HELD_PAYMENT_STATES.includes(j.paymentStatus);
export type { Transaction };
