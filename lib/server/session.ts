import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import type { User } from "@/lib/domain/types";
import { randomToken, sha256 } from "./crypto";
import { getDb, schema } from "./db";
import { userFromRow } from "./mappers";

const COOKIE = "ch_session";
const TTL_DAYS = 30;

export async function createSession(userId: string) {
  const token = randomToken();
  const expires = new Date(Date.now() + TTL_DAYS * 86_400_000);
  await getDb().insert(schema.sessions).values({ id: sha256(token), userId, expiresAt: expires.toISOString() });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/** The signed-in user, or null. Suspended users are treated as signed out. */
export async function getSessionUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await getDb()
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, sql`now()`)))
    .limit(1);
  const row = rows[0]?.user;
  if (!row || row.status !== "active") return null;
  return userFromRow(row);
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await getDb().delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(COOKIE);
}

/** Sign the user out everywhere (e.g. after a password reset). */
export async function destroyAllSessions(userId: string) {
  await getDb().delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
