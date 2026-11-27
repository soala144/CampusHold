import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Bachs API client (server only). Docs: https://docs.bachs.io
 * Money crosses this boundary as decimal strings in naira ("1500.00");
 * the rest of the app uses integer kobo.
 */

export type PaymentsProvider = "simulated" | "bachs";
export const paymentsProvider = (): PaymentsProvider => (process.env.PAYMENTS_PROVIDER === "bachs" ? "bachs" : "simulated");

const base = () => (process.env.BACHS_ENV === "live" ? "https://api.bachs.io" : "https://sandbox-api.bachs.io");

export class BachsError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export const toNaira = (kobo: number) => (kobo / 100).toFixed(2);
export const toKobo = (naira: string | number | null | undefined) => Math.round(Number(naira ?? 0) * 100);

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, opts: { idempotencyKey?: string; accountId?: string } = {}): Promise<T> {
  const key = process.env.BACHS_API_KEY;
  if (!key) throw new BachsError("BACHS_API_KEY is not set.", 500);
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  if (opts.accountId) headers["X-Account-Id"] = opts.accountId;

  const res = await fetch(base() + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = (json ?? {}) as { detail?: unknown; error_code?: string };
    const detail = typeof err.detail === "string" ? err.detail : `Bachs request failed (${res.status}).`;
    throw new BachsError(detail, res.status, err.error_code);
  }
  return json as T;
}

/* ---------- checkout ---------- */

export interface CheckoutSession {
  checkout_id: string;
  checkout_url?: string;
  status: string; // "open" | "complete" | "expired" …
  payment_status?: string; // "requires_payment_method" | "paid" …
  amount: string;
  currency: string;
  reference: string;
  expires_at: string;
  charge?: {
    payment_id: string;
    status: string;
    amount: string;
    amount_paid: string;
    currency: string;
    is_refundable: boolean;
    failure_message: string | null;
    payment_method?: unknown;
    fees?: { amount: string; currency: string } | null;
    fee_paid_by?: string;
  } | null;
  metadata?: Record<string, string> | null;
}

export function createCheckout(input: {
  amountKobo: number;
  reference: string;
  customer: { email: string; name: string };
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}) {
  return call<CheckoutSession>(
    "POST",
    "/v1/checkout-sessions",
    {
      pricing: { currency: "NGN", amount: toNaira(input.amountKobo) },
      customer: input.customer,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      reference: input.reference,
      metadata: input.metadata,
      expires_in_minutes: 60,
    },
    { idempotencyKey: input.idempotencyKey },
  );
}

export const getCheckout = (id: string) => call<CheckoutSession>("GET", `/v1/checkout-sessions/${encodeURIComponent(id)}`);

/** Our reading of a checkout: has the full amount actually been received? */
export function checkoutOutcome(s: CheckoutSession): "paid" | "failed" | "expired" | "underpaid" | "pending" {
  const pay = (s.payment_status ?? "").toLowerCase();
  const charge = (s.charge?.status ?? "").toLowerCase();
  const due = toKobo(s.amount);
  const paid = toKobo(s.charge?.amount_paid);
  if ((pay === "paid" || charge === "succeeded" || charge === "accepted") && paid >= due && s.currency === "NGN") return "paid";
  if (charge === "underpaid" || (paid > 0 && paid < due)) return "underpaid";
  if (charge === "failed") return "failed";
  if (s.status.toLowerCase() === "expired") return "expired";
  return "pending";
}

/* ---------- balances, connect, transfers, refunds ---------- */

export interface Balances {
  balances: { currency: string; available_balance: string; pending_balance: string }[];
}
export const getBalances = (accountId?: string) => call<Balances>("GET", "/v1/balances", undefined, { accountId });

export interface ConnectedAccount {
  id: string;
  capabilities?: Record<string, { status: string; requested?: boolean }>;
  requirements?: { currently_due?: string[]; past_due?: string[] };
}
export function createConnectedAccount(input: { email: string; name: string; idempotencyKey: string }) {
  return call<ConnectedAccount>(
    "POST",
    "/v1/accounts",
    {
      contact_email: input.email,
      display_name: input.name,
      country: "NG",
      entity_type: "individual",
      configuration: { recipient: { capabilities: { transfers: { requested: true }, payouts: { requested: true } } } },
      dashboard: "light",
    },
    { idempotencyKey: input.idempotencyKey },
  );
}
export const getConnectedAccount = (id: string) => call<ConnectedAccount>("GET", `/v1/accounts/${encodeURIComponent(id)}`);
export function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  return call<{ url: string; expires_at?: string }>("POST", `/v1/accounts/${encodeURIComponent(accountId)}/account-links`, {
    type: "onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
}
export const transfersActive = (a: ConnectedAccount) => a.capabilities?.transfers?.status === "active";

export function createTransfer(input: { destination: string; amountKobo: number; jobId: string; description: string; idempotencyKey: string }) {
  return call<{ id: string; status: string }>(
    "POST",
    "/v1/transfers",
    {
      destination: input.destination,
      amount: toNaira(input.amountKobo),
      currency: "NGN",
      transfer_group: input.jobId,
      description: input.description,
      metadata: { job_id: input.jobId },
    },
    { idempotencyKey: input.idempotencyKey },
  );
}

export function createRefund(input: { chargeId: string; reference: string; reason: string; idempotencyKey: string }) {
  return call<{ refund_id: string; status: string }>(
    "POST",
    "/v1/refunds",
    { charge_id: input.chargeId, reference: input.reference, reason: input.reason, idempotency_key: input.idempotencyKey },
    { idempotencyKey: input.idempotencyKey },
  );
}

/* ---------- webhooks ---------- */

const TOLERANCE_S = 300;

/**
 * Verify a Bachs webhook: HMAC-SHA256 (hex) of "{timestamp}.{raw body}".
 * Accepts the V2 header ("t=…,v1=…", possibly several v1 during secret
 * rotation) or the V1 pair (X-Bachs-Timestamp + X-Bachs-Signature).
 */
export function verifyWebhook(rawBody: string, headers: Headers, secret: string, now = Date.now()): boolean {
  let timestamp: string | null = null;
  let signatures: string[] = [];
  const v2 = headers.get("x-bachs-signature-v2");
  if (v2) {
    for (const part of v2.split(",")) {
      const [k, v] = part.trim().split("=", 2);
      if (k === "t") timestamp = v;
      if (k === "v1" && v) signatures.push(v);
    }
  } else {
    timestamp = headers.get("x-bachs-timestamp");
    const v1 = headers.get("x-bachs-signature");
    signatures = v1 ? [v1] : [];
  }
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_S) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"));
  return signatures.some((sig) => {
    const got = Buffer.from(sig.trim().toLowerCase());
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
