import type {
  AuditEntry,
  Dispute,
  Job,
  Notification,
  PayoutAccount,
  Service,
  ThreadItem,
  Transaction,
  User,
} from "@/lib/domain/types";
import type { schema } from "./db";

/** Postgres returns "2026-11-26 11:00:00+00"; the app compares ISO strings, so normalise. */
export const iso = (v: string) => new Date(v).toISOString();
const isoOrNull = (v: string | null | undefined) => (v ? iso(v) : undefined);

type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];
type Insert<T extends { $inferInsert: unknown }> = T["$inferInsert"];

/* ---------- users ---------- */

export function userFromRow(r: Row<typeof schema.users>): User {
  return {
    id: r.id,
    username: r.username,
    firstName: r.firstName,
    lastName: r.lastName,
    displayName: r.displayName,
    email: r.email,
    phone: r.phone,
    bio: r.bio,
    location: r.location,
    avatarHue: r.avatarHue,
    roles: { client: r.isClient, freelancer: r.isFreelancer },
    isAdmin: r.isAdmin,
    verified: { email: r.emailVerified, phone: r.phoneVerified },
    status: r.status,
    onboarded: r.onboarded,
    payouts: r.bachsAccountId
      ? { accountId: r.bachsAccountId, status: (r.bachsPayoutStatus ?? "onboarding") as "onboarding" | "active" | "restricted" }
      : undefined,
    joinedAt: iso(r.joinedAt),
    freelancer: r.freelancer ?? undefined,
    client: r.client ?? undefined,
  };
}

/** Columns a domain user maps to. Password and email are never written from app state. */
export function userToRow(u: User): Omit<Insert<typeof schema.users>, "passwordHash" | "email" | "id" | "username"> {
  return {
    phone: u.phone,
    firstName: u.firstName,
    lastName: u.lastName,
    displayName: u.displayName,
    bio: u.bio,
    location: u.location,
    avatarHue: u.avatarHue,
    isClient: u.roles.client,
    isFreelancer: u.roles.freelancer,
    isAdmin: u.isAdmin,
    emailVerified: u.verified.email,
    phoneVerified: u.verified.phone,
    status: u.status,
    onboarded: u.onboarded ?? false,
    freelancer: u.freelancer ?? null,
    client: u.client ?? null,
  };
}

/* ---------- services ---------- */

export const serviceFromRow = (r: Row<typeof schema.services>): Service => ({
  id: r.id,
  freelancerId: r.freelancerId,
  title: r.title,
  category: r.category,
  summary: r.summary,
  description: r.description,
  tags: r.tags,
  packages: r.packages,
  faq: r.faq,
  images: r.images,
  cover: r.cover ?? undefined,
  status: r.status,
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

export const serviceToRow = (s: Service): Insert<typeof schema.services> => ({
  ...s,
  cover: s.cover ?? null,
});

/* ---------- jobs ---------- */

export function jobFromRow(r: Row<typeof schema.jobs>, thread: ThreadItem[]): Job {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    budget: r.budget,
    deadline: iso(r.deadline),
    skills: r.skills,
    deliverables: r.deliverables,
    attachments: r.attachments,
    clientId: r.clientId,
    freelancerId: r.freelancerId,
    status: r.status,
    paymentStatus: r.paymentStatus,
    revisionsAllowed: r.revisionsAllowed,
    revisionsUsed: r.revisionsUsed,
    submissions: r.submissions,
    thread,
    lastReadAt: r.lastReadAt,
    serviceId: r.serviceId ?? undefined,
    packageName: r.packageName ?? undefined,
    disputeId: r.disputeId ?? undefined,
    statusBeforeDispute: r.statusBeforeDispute ?? undefined,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

export function jobToRow(j: Job): Insert<typeof schema.jobs> {
  const { thread: _thread, ...rest } = j;
  void _thread;
  return {
    ...rest,
    serviceId: j.serviceId ?? null,
    packageName: j.packageName ?? null,
    disputeId: j.disputeId ?? null,
    statusBeforeDispute: j.statusBeforeDispute ?? null,
  };
}

export function threadFromRow(r: Row<typeof schema.jobThread>): ThreadItem {
  return r.kind === "message"
    ? { kind: "message", id: r.id, authorId: r.authorId!, body: r.body ?? "", attachments: r.attachments, createdAt: iso(r.createdAt) }
    : {
        kind: "event",
        id: r.id,
        event: r.event as Extract<ThreadItem, { kind: "event" }>["event"],
        actorId: r.authorId ?? undefined,
        note: r.note ?? undefined,
        createdAt: iso(r.createdAt),
      };
}

export function threadToRow(jobId: string, t: ThreadItem): Insert<typeof schema.jobThread> {
  return t.kind === "message"
    ? { id: t.id, jobId, kind: "message", authorId: t.authorId, body: t.body, attachments: t.attachments, createdAt: t.createdAt }
    : { id: t.id, jobId, kind: "event", authorId: t.actorId ?? null, event: t.event, note: t.note ?? null, attachments: [], createdAt: t.createdAt };
}

/* ---------- money, disputes, notifications, audit ---------- */

export const txFromRow = (r: Row<typeof schema.transactions>): Transaction => ({
  ...r,
  provider: r.provider as Transaction["provider"],
  providerRef: r.providerRef ?? undefined,
  providerChargeId: r.providerChargeId ?? undefined,
  checkoutUrl: r.checkoutUrl ?? undefined,
  providerFee: r.providerFee || undefined,
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});
export const txToRow = (t: Transaction): Insert<typeof schema.transactions> => ({
  ...t,
  provider: t.provider ?? "simulated",
  providerRef: t.providerRef ?? null,
  providerChargeId: t.providerChargeId ?? null,
  checkoutUrl: t.checkoutUrl ?? null,
  providerFee: t.providerFee ?? 0,
});

export const payoutFromRow = (r: Row<typeof schema.payoutAccounts>): PayoutAccount => ({ ...r, createdAt: iso(r.createdAt) });
export const payoutToRow = (p: PayoutAccount): Insert<typeof schema.payoutAccounts> => ({ ...p });

export const disputeFromRow = (r: Row<typeof schema.disputes>): Dispute => ({
  ...r,
  resolution: r.resolution ?? undefined,
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});
export const disputeToRow = (d: Dispute): Insert<typeof schema.disputes> => ({ ...d, resolution: d.resolution ?? null });

export const notificationFromRow = (r: Row<typeof schema.notifications>): Notification => ({
  ...r,
  type: r.type as Notification["type"],
  createdAt: iso(r.createdAt),
});
export const notificationToRow = (n: Notification): Insert<typeof schema.notifications> => ({ ...n });

export const auditFromRow = (r: Row<typeof schema.auditLog>): AuditEntry => ({ ...r, createdAt: iso(r.createdAt) });
export const auditToRow = (a: AuditEntry): Insert<typeof schema.auditLog> => ({ ...a });

export { isoOrNull };
