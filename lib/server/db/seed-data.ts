/**
 * Insert the CampusHold demo data. Works with any Drizzle Postgres database
 * (used by scripts/seed.ts against Pxxl and by scripts/smoke-test.ts in memory).
 */
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { seedAudit, seedDisputes, seedJobs, seedNotifications, seedPayoutAccounts, seedTransactions, seedUsers } from "@/lib/mock/seed";
import { seedServices } from "@/lib/mock/seed-services";
import * as m from "../mappers";
import * as schema from "./schema";

export async function insertDemoData(db: PgDatabase<PgQueryResultHKT, typeof schema>, passwordHash: string) {
  await db.transaction(async (tx) => {
    await tx.insert(schema.users).values(
      seedUsers.map((u) => ({
        ...m.userToRow({ ...u, onboarded: true }),
        id: u.id,
        username: u.username,
        email: u.email,
        passwordHash,
        joinedAt: u.joinedAt,
        uiMode: "client" as const,
      })),
    );
    await tx.insert(schema.services).values(seedServices.map(m.serviceToRow));
    await tx.insert(schema.jobs).values(seedJobs.map(m.jobToRow));
    await tx.insert(schema.jobThread).values(seedJobs.flatMap((j) => j.thread.map((t) => m.threadToRow(j.id, t))));
    await tx.insert(schema.transactions).values(seedTransactions.map(m.txToRow));
    await tx.insert(schema.payoutAccounts).values(seedPayoutAccounts.map(m.payoutToRow));
    await tx.insert(schema.disputes).values(seedDisputes.map(m.disputeToRow));
    await tx.insert(schema.notifications).values(seedNotifications.map(m.notificationToRow));
    await tx.insert(schema.auditLog).values(seedAudit.map(m.auditToRow));
  });
  return { users: seedUsers, services: seedServices.length, jobs: seedJobs.length };
}
