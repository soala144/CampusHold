/**
 * Fill the database with the CampusHold demo data.
 *
 *   pnpm db:seed     seeds an empty database
 *   pnpm db:reset    WIPES all data first, then seeds
 *
 * Every demo account uses the password in SEED_PASSWORD (from .env.local).
 * If it isn't set, a random one is generated and printed once.
 */
import { randomBytes } from "node:crypto";
import { count, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/server/db/schema";
import { insertDemoData } from "../lib/server/db/seed-data";
import { hashPassword } from "../lib/server/crypto";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  const reset = process.argv.includes("--reset");
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle({ client, schema });

  try {
    const [{ n }] = await db.select({ n: count() }).from(schema.users);
    if (n > 0 && !reset) {
      console.log(`The database already has ${n} users. Run "pnpm db:reset" to wipe it and reseed.`);
      return;
    }
    if (reset) {
      await db.execute(sql`truncate table
        audit_log, notifications, disputes, payout_accounts, transactions, job_thread, jobs,
        services, verification_codes, sessions, users restart identity cascade`);
    }

    const password = process.env.SEED_PASSWORD || randomBytes(9).toString("base64url");
    const result = await insertDemoData(db, await hashPassword(password));

    console.log(`Seeded ${result.users.length} users, ${result.services} services and ${result.jobs} jobs.\n`);
    console.log("Demo accounts (all share one password):");
    for (const u of result.users) {
      const role = u.isAdmin
        ? "admin, client + freelancer"
        : [u.roles.client && "client", u.roles.freelancer && "freelancer"].filter(Boolean).join(" + ");
      console.log(`  ${u.email.padEnd(32)} ${role}${u.status === "suspended" ? " (suspended)" : ""}`);
    }
    console.log(
      process.env.SEED_PASSWORD
        ? "\nPassword: the SEED_PASSWORD in .env.local"
        : `\nPassword: ${password}  (set SEED_PASSWORD in .env.local to choose your own)`,
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
