import "server-only";
import { desc, eq, inArray, or, sql } from "drizzle-orm";
import type { User } from "@/lib/domain/types";
import { STATE_VERSION, type AppState } from "@/lib/store/state";
import type { DB } from "./db";
import { schema } from "./db";
import * as m from "./mappers";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Conn = DB | Tx;

/**
 * Load the slice of data a user is allowed to work with, in the app's
 * AppState shape. Admins see every job; everyone else only their own.
 * `viewer` null = signed-out visitor (public marketplace only).
 */
export async function loadWorld(db: Conn, viewer: User | null): Promise<AppState> {
  const admin = Boolean(viewer?.isAdmin);
  const none = sql`false`;
  // Jobs this viewer may see, as a subquery so every query can run at once.
  const jobScope = !viewer
    ? none
    : admin
      ? sql`true`
      : or(eq(schema.jobs.clientId, viewer.id), eq(schema.jobs.freelancerId, viewer.id))!;
  const visibleJobIds = db.select({ id: schema.jobs.id }).from(schema.jobs).where(jobScope);

  const [userRows, serviceRows, jobRows, threadRows, txRows, disputeRows, payoutRows, notificationRows, auditRows] = await Promise.all([
    db.select().from(schema.users),
    db.select().from(schema.services),
    viewer ? db.select().from(schema.jobs).where(jobScope) : [],
    viewer ? db.select().from(schema.jobThread).where(inArray(schema.jobThread.jobId, visibleJobIds)).orderBy(schema.jobThread.createdAt) : [],
    viewer ? db.select().from(schema.transactions).where(inArray(schema.transactions.jobId, visibleJobIds)) : [],
    viewer ? db.select().from(schema.disputes).where(inArray(schema.disputes.jobId, visibleJobIds)) : [],
    viewer ? db.select().from(schema.payoutAccounts).where(eq(schema.payoutAccounts.userId, viewer.id)) : [],
    viewer
      ? db.select().from(schema.notifications).where(eq(schema.notifications.userId, viewer.id)).orderBy(desc(schema.notifications.createdAt)).limit(100)
      : [],
    admin ? db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(50) : [],
  ]);

  const threads = new Map<string, ReturnType<typeof m.threadFromRow>[]>();
  for (const r of threadRows) {
    const list = threads.get(r.jobId) ?? [];
    list.push(m.threadFromRow(r));
    threads.set(r.jobId, list);
  }

  return {
    version: STATE_VERSION,
    currentUserId: viewer?.id ?? "",
    signedIn: Boolean(viewer),
    mode: (viewer && userRows.find((u) => u.id === viewer.id)?.uiMode) || "client",
    users: userRows.map(m.userFromRow),
    services: serviceRows.map(m.serviceFromRow),
    jobs: jobRows.map((j) => m.jobFromRow(j, threads.get(j.id) ?? [])),
    transactions: txRows.map(m.txFromRow),
    payoutAccounts: payoutRows.map(m.payoutFromRow),
    disputes: disputeRows.map(m.disputeFromRow),
    notifications: notificationRows.map(m.notificationFromRow),
    audit: auditRows.map(m.auditFromRow),
  };
}

/**
 * Strip what a viewer mustn't see before sending state to the browser:
 * other people's contact details, drafts of other people's services,
 * and non-public profiles.
 */
export function toSnapshot(world: AppState): AppState {
  const me = world.currentUserId;
  const admin = world.users.find((u) => u.id === me)?.isAdmin ?? false;
  return {
    ...world,
    users: world.users.map((u) =>
      u.id === me || admin ? u : { ...u, email: "", phone: "", verified: { ...u.verified } },
    ),
    services: world.services.filter((s) => s.status === "active" || s.freelancerId === me),
  };
}

/* ---------- persistence: write back only what an operation changed ---------- */

const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

function diff<T extends { id: string }>(before: T[], after: T[]) {
  const prev = new Map(before.map((x) => [x.id, x]));
  const next = new Map(after.map((x) => [x.id, x]));
  return {
    added: after.filter((x) => !prev.has(x.id)),
    updated: after.filter((x) => prev.has(x.id) && changed(prev.get(x.id), x)),
    removed: before.filter((x) => !next.has(x.id)),
  };
}

/**
 * Persist the difference between two states inside a transaction.
 * Writes are issued together (pipelined on the transaction's connection) in
 * two phases, so parent rows (users, services, jobs) exist before children.
 */
export async function persist(tx: Tx, before: AppState, after: AppState) {
  const phase1: Promise<unknown>[] = [];
  const phase2: Promise<unknown>[] = [];

  // Users: only profile fields ever change through operations.
  for (const u of diff(before.users, after.users).updated) {
    phase1.push(tx.update(schema.users).set(m.userToRow(u)).where(eq(schema.users.id, u.id)));
  }
  if (after.mode !== before.mode && after.currentUserId) {
    phase1.push(tx.update(schema.users).set({ uiMode: after.mode }).where(eq(schema.users.id, after.currentUserId)));
  }

  const services = diff(before.services, after.services);
  if (services.added.length) phase1.push(tx.insert(schema.services).values(services.added.map(m.serviceToRow)));
  for (const x of services.updated) phase1.push(tx.update(schema.services).set(m.serviceToRow(x)).where(eq(schema.services.id, x.id)));
  if (services.removed.length) phase1.push(tx.delete(schema.services).where(inArray(schema.services.id, services.removed.map((x) => x.id))));

  const jobs = diff(before.jobs, after.jobs);
  if (jobs.added.length) phase1.push(tx.insert(schema.jobs).values(jobs.added.map(m.jobToRow)));
  for (const j of jobs.updated) phase1.push(tx.update(schema.jobs).set(m.jobToRow(j)).where(eq(schema.jobs.id, j.id)));

  // Thread items are append-only.
  const prevThread = new Set(before.jobs.flatMap((j) => j.thread.map((t) => t.id)));
  const newThread = after.jobs.flatMap((j) => j.thread.filter((t) => !prevThread.has(t.id)).map((t) => m.threadToRow(j.id, t)));
  if (newThread.length) phase2.push(tx.insert(schema.jobThread).values(newThread));

  const txs = diff(before.transactions, after.transactions);
  if (txs.added.length) phase2.push(tx.insert(schema.transactions).values(txs.added.map(m.txToRow)));
  for (const t of txs.updated) phase2.push(tx.update(schema.transactions).set(m.txToRow(t)).where(eq(schema.transactions.id, t.id)));

  const payouts = diff(
    before.payoutAccounts.map((p) => ({ ...p, id: p.userId })),
    after.payoutAccounts.map((p) => ({ ...p, id: p.userId })),
  );
  for (const p of [...payouts.added, ...payouts.updated]) {
    const { id: _id, ...row } = p;
    void _id;
    phase2.push(
      tx.insert(schema.payoutAccounts).values(m.payoutToRow(row)).onConflictDoUpdate({ target: schema.payoutAccounts.userId, set: m.payoutToRow(row) }),
    );
  }
  if (payouts.removed.length) {
    phase2.push(tx.delete(schema.payoutAccounts).where(inArray(schema.payoutAccounts.userId, payouts.removed.map((p) => p.id))));
  }

  const disputes = diff(before.disputes, after.disputes);
  if (disputes.added.length) phase2.push(tx.insert(schema.disputes).values(disputes.added.map(m.disputeToRow)));
  for (const d of disputes.updated) phase2.push(tx.update(schema.disputes).set(m.disputeToRow(d)).where(eq(schema.disputes.id, d.id)));

  // Notifications may be created for other users; only the viewer's are loaded.
  const notes = diff(before.notifications, after.notifications);
  if (notes.added.length) phase2.push(tx.insert(schema.notifications).values(notes.added.map(m.notificationToRow)));
  for (const n of notes.updated) phase2.push(tx.update(schema.notifications).set({ read: n.read }).where(eq(schema.notifications.id, n.id)));

  const audit = diff(before.audit, after.audit);
  if (audit.added.length) phase2.push(tx.insert(schema.auditLog).values(audit.added.map(m.auditToRow)));

  await Promise.all(phase1);
  await Promise.all(phase2);
}
