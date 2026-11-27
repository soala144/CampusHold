import { eq } from "drizzle-orm";
import { verifyWebhook } from "@/lib/server/bachs";
import { getDb, schema } from "@/lib/server/db";
import { handleEvent } from "@/lib/server/payments";

/**
 * Bachs webhook endpoint: POST /api/webhooks/bachs
 *
 * 1. Verify the HMAC signature over the raw body (reject with 400 if bad).
 * 2. Record the event id; a duplicate delivery is acknowledged and skipped.
 * 3. Process it. Our own failure returns 500 so Bachs retries.
 */
export async function POST(request: Request) {
  const secret = process.env.BACHS_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });

  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers, secret)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: { id?: string; type?: string; account?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (typeof event.id !== "string" || typeof event.type !== "string") return new Response("Missing id or type", { status: 400 });

  const db = getDb();
  const inserted = await db
    .insert(schema.webhookEvents)
    .values({ id: event.id, provider: "bachs", type: event.type, payload: event })
    .onConflictDoNothing()
    .returning({ id: schema.webhookEvents.id });
  if (inserted.length === 0) {
    const [existing] = await db.select({ status: schema.webhookEvents.status }).from(schema.webhookEvents).where(eq(schema.webhookEvents.id, event.id));
    // Already handled: acknowledge. Previously failed: try again below.
    if (existing?.status !== "failed") return Response.json({ ok: true, duplicate: true });
  }

  try {
    const result = await handleEvent({ id: event.id, type: event.type, account: event.account, data: event.data ?? {} });
    await db
      .update(schema.webhookEvents)
      .set({ status: result === "ignored" ? "ignored" : "processed", processedAt: new Date().toISOString(), error: null })
      .where(eq(schema.webhookEvents.id, event.id));
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[bachs webhook]", event.type, e);
    await db
      .update(schema.webhookEvents)
      .set({ status: "failed", error: e instanceof Error ? e.message.slice(0, 500) : "error" })
      .where(eq(schema.webhookEvents.id, event.id));
    return new Response("Processing failed", { status: 500 });
  }
}
