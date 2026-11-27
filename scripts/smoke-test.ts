/**
 * End-to-end check of the data layer against a real (in-memory) Postgres.
 *
 *   pnpm test:smoke
 *
 * Applies the migrations, seeds the demo data, then runs operations through
 * the same authorise → operate → persist path the server actions use.
 */
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../lib/server/db/schema";
import { insertDemoData } from "../lib/server/db/seed-data";
import { authorize } from "../lib/server/authorize";
import { userFromRow } from "../lib/server/mappers";
import { loadWorld, persist, toSnapshot } from "../lib/server/world";
import { rawOp } from "../lib/store/ops";
import { HELD_PAYMENT_STATES } from "../lib/domain/payment";
import type { DB } from "../lib/server/db";
import { createHmac } from "node:crypto";
import { verifyWebhook } from "../lib/server/bachs";
import { cleanAttachments } from "../lib/server/cloudinary";

const pg = new PGlite();
const db = drizzle({ client: pg, schema }) as unknown as DB;

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n`, e);
    process.exitCode = 1;
  }
}

async function userById(id: string) {
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return userFromRow(row);
}

/** Mirrors performOp in lib/server/actions.ts, minus cookies. */
async function perform(userId: string, name: string, args: unknown[]) {
  const user = await userById(userId);
  let error: string | null = null;
  await db.transaction(async (tx) => {
    const before = await loadWorld(tx, user);
    const verdict = authorize(name, args, user, before);
    if (!verdict.ok) {
      error = verdict.error;
      return;
    }
    const out = rawOp(name)!(...verdict.args)(before);
    if ("error" in out) {
      error = out.error;
      return;
    }
    await persist(tx, before, out.state);
  });
  return error;
}

const job = async (id: string) => (await db.select().from(schema.jobs).where(eq(schema.jobs.id, id)))[0];

async function main() {
  console.log("Migrating and seeding an in-memory Postgres…");
  await migrate(db as never, { migrationsFolder: "drizzle" });
  await insertDemoData(db as never, "scrypt$test$test");

  console.log("\nPermissions and lifecycle");
  await test("client can't approve work that isn't submitted", async () => {
    assert.match((await perform("u_me", "jobAction", ["job_landing", "approve", { as: "client" }]))!, /Not allowed/);
  });
  await test("freelancer can't approve their own delivery", async () => {
    assert.ok(await perform("u_ada", "jobAction", ["job_brand", "approve", { as: "client" }]));
  });
  await test("client approves a submitted job; payout is requested", async () => {
    assert.equal(await perform("u_me", "jobAction", ["job_brand", "approve", { as: "client" }]), null);
    const j = await job("job_brand");
    assert.equal(j.status, "approved");
    assert.equal(j.paymentStatus, "release_requested");
    const payouts = await db.select().from(schema.transactions).where(sql`job_id = 'job_brand' and type = 'payout'`);
    assert.equal(payouts.length, 1);
    assert.equal(payouts[0].status, "processing");
  });
  await test("approving twice is refused", async () => {
    assert.ok(await perform("u_me", "jobAction", ["job_brand", "approve", { as: "client" }]));
  });
  await test("simulated transfer completes the job", async () => {
    assert.equal(await perform("u_me", "jobAction", ["job_brand", "complete", { as: "system" }]), null);
    const j = await job("job_brand");
    assert.equal(j.status, "completed");
    assert.equal(j.paymentStatus, "transfer_completed");
  });
  await test("freelancer accepts a request; client is notified", async () => {
    assert.equal(await perform("u_zainab", "jobAction", ["job_photos", "accept", { as: "freelancer" }]), null);
    assert.equal((await job("job_photos")).status, "accepted");
    const notes = await db.select().from(schema.notifications).where(sql`user_id = 'u_me' and type = 'job_accepted'`);
    assert.ok(notes.some((n) => n.body.includes("Product photos")));
  });

  console.log("\nMessaging and access");
  await test("a party can message; author comes from the session", async () => {
    assert.equal(await perform("u_ada", "sendMessage", ["job_deck", "u_me", "Thanks for the work!", []]), null);
    const [msg] = await db.select().from(schema.jobThread).where(sql`job_id = 'job_deck' and kind = 'message'`);
    assert.equal(msg.authorId, "u_ada");
  });
  await test("someone outside the job can't touch it", async () => {
    assert.ok(await perform("u_chidi", "sendMessage", ["job_brand", "u_chidi", "hi", []]));
    assert.ok(await perform("u_chidi", "jobAction", ["job_brand", "open_dispute", { as: "client" }]));
  });
  await test("users can't make themselves admin", async () => {
    assert.equal(await perform("u_ada", "updateUser", ["u_ada", { isAdmin: true, displayName: "Ada O." }]), null);
    const ada = await userById("u_ada");
    assert.equal(ada.isAdmin, false);
    assert.equal(ada.displayName, "Ada O.");
  });
  await test("only admins can suspend users", async () => {
    assert.ok(await perform("u_ada", "setUserStatus", ["u_chidi", "suspended"]));
    assert.equal(await perform("u_me", "setUserStatus", ["u_chidi", "suspended"]), null);
    assert.equal((await userById("u_chidi")).status, "suspended");
  });

  console.log("\nServices");
  await test("requesting a service creates a job with the package scope", async () => {
    assert.equal(await perform("u_me", "requestService", ["ignored", "svc_reels", (await svcPkg("svc_reels", 1)), "Five reels from our hostel tour footage, upbeat music please.", []]), null);
    const [j] = await db.select().from(schema.jobs).where(eq(schema.jobs.serviceId, "svc_reels"));
    assert.equal(j.clientId, "u_me");
    assert.equal(j.status, "pending_response");
    assert.equal(j.budget, 25_000 * 100);
  });
  await test("you can't request your own service", async () => {
    assert.ok(await perform("u_me", "requestService", ["u_me", "svc_tobi", await svcPkg("svc_tobi", 0), "x".repeat(40), []]));
  });

  console.log("\nPrivacy and money");
  await test("other users' email and phone are hidden from the browser", async () => {
    const snap = toSnapshot(await loadWorld(db, await userById("u_ada")));
    const tobi = snap.users.find((u) => u.id === "u_me")!;
    assert.equal(tobi.email, "");
    assert.equal(tobi.phone, "");
    assert.ok(snap.users.find((u) => u.id === "u_ada")!.email);
  });
  await test("non-admins only receive their own jobs", async () => {
    const snap = toSnapshot(await loadWorld(db, await userById("u_zainab")));
    assert.ok(snap.jobs.every((j) => j.clientId === "u_zainab" || j.freelancerId === "u_zainab"));
  });
  await test("ledger reconciles: collected − paid out − refunded − held = 0", async () => {
    const txs = await db.select().from(schema.transactions);
    const sum = (type: string) => txs.filter((t) => t.type === type && t.status === "succeeded").reduce((n, t) => n + t.amount, 0);
    const jobs = await db.select().from(schema.jobs);
    const held = jobs.filter((j) => HELD_PAYMENT_STATES.includes(j.paymentStatus)).reduce((n, j) => n + j.budget, 0);
    assert.equal(sum("payment") - sum("payout") - sum("refund") - held, 0);
  });
  await test("database rejects a non-positive job budget", async () => {
    await assert.rejects(db.execute(sql`update jobs set budget = 0 where id = 'job_landing'`));
  });

  console.log("\nPayments and uploads");
  const secret = "whsec_test";
  const body = JSON.stringify({ id: "evt_1", type: "checkout.completed", data: {} });
  const sign = (ts: number, b = body, s = secret) => createHmac("sha256", s).update(`${ts}.${b}`).digest("hex");
  const nowMs = 1_800_000_000_000;
  const ts = nowMs / 1000;
  await test("webhook: valid V2 signature is accepted", async () => {
    assert.ok(verifyWebhook(body, new Headers({ "x-bachs-signature-v2": `t=${ts},v1=${sign(ts)}` }), secret, nowMs));
  });
  await test("webhook: valid V1 headers are accepted", async () => {
    assert.ok(verifyWebhook(body, new Headers({ "x-bachs-timestamp": String(ts), "x-bachs-signature": sign(ts) }), secret, nowMs));
  });
  await test("webhook: tampered body, wrong secret and stale timestamp are rejected", async () => {
    const h = new Headers({ "x-bachs-signature-v2": `t=${ts},v1=${sign(ts)}` });
    assert.equal(verifyWebhook(body.replace("evt_1", "evt_2"), h, secret, nowMs), false);
    assert.equal(verifyWebhook(body, new Headers({ "x-bachs-signature-v2": `t=${ts},v1=${sign(ts, body, "other")}` }), secret, nowMs), false);
    const stale = ts - 301;
    assert.equal(verifyWebhook(body, new Headers({ "x-bachs-signature-v2": `t=${stale},v1=${sign(stale)}` }), secret, nowMs), false);
    assert.equal(verifyWebhook(body, new Headers(), secret, nowMs), false);
  });
  await test("uploads: links outside the user's own folder are dropped", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "k";
    process.env.CLOUDINARY_API_SECRET = "s";
    const own = "https://res.cloudinary.com/demo/image/upload/v1/campushold/u_me/files/a.png";
    const other = "https://res.cloudinary.com/demo/image/upload/v1/campushold/u_ada/files/a.png";
    const files = cleanAttachments(
      [
        { id: "f1", name: "a.png", sizeBytes: 10, url: own },
        { id: "f2", name: "b.png", sizeBytes: 10, url: other },
        { id: "f3", name: "c.png", sizeBytes: 10, url: "https://evil.example/x.png" },
      ],
      "u_me",
    )!;
    assert.deepEqual(files.map((f) => f.url), [own, undefined, undefined]);
    assert.equal(cleanAttachments([{ id: 1 }], "u_me"), null);
  });
  await test("with Bachs on, clients can't mark a job funded directly", async () => {
    process.env.PAYMENTS_PROVIDER = "bachs";
    try {
      assert.match((await perform("u_me", "jobAction", ["job_landing", "initiate_payment", { as: "client" }]))!, /payment page/);
      assert.match((await perform("u_me", "jobAction", ["job_landing", "confirm_payment", { as: "system" }]))!, /permission/);
    } finally {
      delete process.env.PAYMENTS_PROVIDER;
    }
  });

  console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}.`);
}

async function svcPkg(serviceId: string, index: number) {
  const [s] = await db.select().from(schema.services).where(eq(schema.services.id, serviceId));
  return s.packages[index].id;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pg.close());
