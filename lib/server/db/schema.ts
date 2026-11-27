/**
 * CampusHold database schema (Drizzle, PostgreSQL).
 *
 * Money is stored as integer kobo. Statuses are Postgres enums so invalid
 * values are rejected by the database itself. Small, always-loaded-together
 * structures (packages, deliverables, submissions) are JSONB; anything that
 * grows without bound or is queried on its own (messages, ledger entries,
 * notifications) has its own table.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  Attachment,
  ClientProfile,
  Deliverable,
  FreelancerProfile,
  Location,
  ServiceCover,
  ServicePackage,
  Submission,
} from "@/lib/domain/types";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

/* ---------- enums ---------- */

export const userStatus = pgEnum("user_status", ["active", "suspended"]);
export const uiMode = pgEnum("ui_mode", ["client", "freelancer"]);
export const category = pgEnum("category", [
  "design",
  "development",
  "writing",
  "video",
  "photography",
  "marketing",
  "research",
  "tutoring",
]);
export const serviceStatus = pgEnum("service_status", ["active", "paused", "draft"]);
export const jobStatus = pgEnum("job_status", [
  "draft",
  "pending_response",
  "accepted",
  "awaiting_payment",
  "payment_confirmed",
  "in_progress",
  "submitted",
  "revision_requested",
  "approved",
  "completed",
  "disputed",
  "cancelled",
]);
export const paymentStatus = pgEnum("payment_status", [
  "not_started",
  "initiated",
  "confirmed",
  "pending_settlement",
  "available",
  "release_requested",
  "transfer_processing",
  "transfer_completed",
  "refund_processing",
  "refunded",
  "failed",
]);
export const threadKind = pgEnum("thread_kind", ["message", "event"]);
export const txType = pgEnum("tx_type", ["payment", "payout", "refund"]);
export const txStatus = pgEnum("tx_status", ["processing", "pending", "succeeded", "failed"]);
export const payoutStatus = pgEnum("payout_status", ["pending_verification", "verified"]);
export const disputeReason = pgEnum("dispute_reason", [
  "not_delivered",
  "not_as_agreed",
  "missed_deadline",
  "unresponsive",
  "other",
]);
export const disputeStatus = pgEnum("dispute_status", ["open", "under_review", "resolved"]);
export const codeKind = pgEnum("code_kind", ["email", "phone", "reset"]);

/* ---------- users & auth ---------- */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    passwordHash: text("password_hash").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    location: jsonb("location").$type<Location>().notNull(),
    avatarHue: integer("avatar_hue").notNull(),
    isClient: boolean("is_client").notNull().default(false),
    isFreelancer: boolean("is_freelancer").notNull().default(false),
    isAdmin: boolean("is_admin").notNull().default(false),
    emailVerified: boolean("email_verified").notNull().default(false),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    onboarded: boolean("onboarded").notNull().default(false),
    status: userStatus("status").notNull().default("active"),
    uiMode: uiMode("ui_mode").notNull().default("client"),
    bachsAccountId: text("bachs_account_id"),
    bachsPayoutStatus: text("bachs_payout_status"),
    freelancer: jsonb("freelancer").$type<FreelancerProfile>(),
    client: jsonb("client").$type<ClientProfile>(),
    joinedAt: ts("joined_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`), uniqueIndex("users_username_idx").on(t.username)],
);

/** Server-side sessions. The cookie holds a random token; only its SHA-256 hash is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** One-time codes for email/phone verification and password reset (hashed). */
export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: codeKind("kind").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("codes_user_kind_idx").on(t.userId, t.kind)],
);

/* ---------- marketplace ---------- */

export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
    freelancerId: text("freelancer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: category("category").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    packages: jsonb("packages").$type<ServicePackage[]>().notNull(),
    faq: jsonb("faq").$type<{ q: string; a: string }[]>().notNull().default([]),
    images: jsonb("images").$type<Attachment[]>().notNull().default([]),
    cover: jsonb("cover").$type<ServiceCover>(),
    status: serviceStatus("status").notNull().default("draft"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("services_freelancer_idx").on(t.freelancerId), index("services_status_idx").on(t.status)],
);

/* ---------- jobs ---------- */

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => users.id),
    freelancerId: text("freelancer_id")
      .notNull()
      .references(() => users.id),
    serviceId: text("service_id").references(() => services.id, { onDelete: "set null" }),
    packageName: text("package_name"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: category("category").notNull(),
    budget: integer("budget").notNull(),
    deadline: ts("deadline").notNull(),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    deliverables: jsonb("deliverables").$type<Deliverable[]>().notNull(),
    attachments: jsonb("attachments").$type<Attachment[]>().notNull().default([]),
    status: jobStatus("status").notNull(),
    paymentStatus: paymentStatus("payment_status").notNull().default("not_started"),
    revisionsAllowed: integer("revisions_allowed").notNull(),
    revisionsUsed: integer("revisions_used").notNull().default(0),
    submissions: jsonb("submissions").$type<Submission[]>().notNull().default([]),
    lastReadAt: jsonb("last_read_at").$type<Record<string, string>>().notNull().default({}),
    disputeId: text("dispute_id"),
    statusBeforeDispute: jobStatus("status_before_dispute"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("jobs_client_idx").on(t.clientId),
    index("jobs_freelancer_idx").on(t.freelancerId),
    index("jobs_status_idx").on(t.status),
    check("jobs_budget_positive", sql`${t.budget} > 0`),
    check("jobs_parties_differ", sql`${t.clientId} <> ${t.freelancerId}`),
    check("jobs_revisions_valid", sql`${t.revisionsUsed} >= 0 and ${t.revisionsUsed} <= ${t.revisionsAllowed}`),
  ],
);

/** Messages and system events in a job workspace, in order. */
export const jobThread = pgTable(
  "job_thread",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    kind: threadKind("kind").notNull(),
    authorId: text("author_id").references(() => users.id),
    event: text("event"),
    body: text("body"),
    note: text("note"),
    attachments: jsonb("attachments").$type<Attachment[]>().notNull().default([]),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("thread_job_created_idx").on(t.jobId, t.createdAt)],
);

/* ---------- money ---------- */

/** Append-mostly ledger. Balances are derived from this and job payment states. */
export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id),
    type: txType("type").notNull(),
    amount: integer("amount").notNull(),
    status: txStatus("status").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    counterpartyId: text("counterparty_id")
      .notNull()
      .references(() => users.id),
    reference: text("reference").notNull(),
    simulated: boolean("simulated").notNull().default(true),
    provider: text("provider").notNull().default("simulated"),
    providerRef: text("provider_ref"),
    providerChargeId: text("provider_charge_id"),
    checkoutUrl: text("checkout_url"),
    /** Fee the provider kept from this payment, in kobo. */
    providerFee: integer("provider_fee").notNull().default(0),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("tx_reference_idx").on(t.reference),
    uniqueIndex("tx_provider_ref_idx").on(t.providerRef),
    index("tx_job_idx").on(t.jobId),
    index("tx_user_idx").on(t.userId),
    check("tx_amount_positive", sql`${t.amount} > 0`),
  ],
);

export const payoutAccounts = pgTable("payout_accounts", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountNumberLast4: text("account_number_last4").notNull(),
  accountName: text("account_name").notNull(),
  status: payoutStatus("status").notNull().default("pending_verification"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/* ---------- disputes, notifications, audit ---------- */

export const disputes = pgTable(
  "disputes",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id),
    openedById: text("opened_by_id")
      .notNull()
      .references(() => users.id),
    reason: disputeReason("reason").notNull(),
    details: text("details").notNull(),
    evidence: jsonb("evidence").$type<Attachment[]>().notNull().default([]),
    status: disputeStatus("status").notNull().default("open"),
    resolution: jsonb("resolution").$type<{ outcome: "release_to_freelancer" | "refund_to_client" | "split"; note: string }>(),
    updates: jsonb("updates")
      .$type<{ id: string; authorId: string; body: string; createdAt: string }[]>()
      .notNull()
      .default([]),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (t) => [index("disputes_job_idx").on(t.jobId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    target: text("target").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

/** Every webhook delivery we accept, so retries and duplicates are processed once. */
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("received"),
  error: text("error"),
  receivedAt: ts("received_at").notNull().defaultNow(),
  processedAt: ts("processed_at"),
});
