"use server";

import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { codeSchema, forgotSchema, loginSchema, resetSchema, signupSchema } from "@/lib/validation/auth";
import { DUMMY_HASH, hashPassword, newId, randomToken, sha256, sixDigitCode, verifyPassword } from "./crypto";
import { getDb, schema } from "./db";
import { createSession, destroyAllSessions, destroySession, getSessionUser } from "./session";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: Record<string, string> };

const CODE_TTL_MIN = 15;

/**
 * Email/SMS aren't connected yet, so verification codes are returned to the
 * person who requested them and shown on screen. Turn off with
 * SHOW_CODES_ON_SCREEN=false once a provider is set up. Password-reset links
 * are never shown on screen (that would let anyone reset any account).
 */
const showCodes = () => process.env.SHOW_CODES_ON_SCREEN !== "false";
export type Codes = { email?: string; phone?: string };
const RESET_TTL_MIN = 30;
const MAX_ATTEMPTS = 5;

/**
 * Until an email/SMS provider is connected, codes and links are printed to the
 * server console. Swap this for Resend/Termii without touching the callers.
 */
function deliver(kind: "email" | "phone" | "reset", to: string, value: string) {
  const label = { email: "Email verification code", phone: "Phone verification code", reset: "Password reset link" }[kind];
  console.log(`\n[CampusHold] ${label} for ${to}: ${value}\n`);
}

async function issueCode(userId: string, kind: "email" | "phone", to: string) {
  const db = getDb();
  // Invalidate earlier codes of the same kind.
  await db
    .update(schema.verificationCodes)
    .set({ usedAt: new Date().toISOString() })
    .where(and(eq(schema.verificationCodes.userId, userId), eq(schema.verificationCodes.kind, kind), isNull(schema.verificationCodes.usedAt)));
  const code = sixDigitCode();
  await db.insert(schema.verificationCodes).values({
    userId,
    kind,
    codeHash: sha256(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
  });
  deliver(kind, to, code);
  return code;
}

function usernameFrom(email: string) {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 20) || "user";
  return `${base}.${randomToken().slice(0, 4).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
}

export async function signUp(input: unknown): Promise<Result<{ codes?: Codes }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  const d = parsed.data;
  const db = getDb();

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${d.email}`)
    .limit(1);
  if (existing.length) return { ok: false, error: "An account with this email already exists. Try logging in." };

  const id = newId("u");
  await db.insert(schema.users).values({
    id,
    username: usernameFrom(d.email),
    email: d.email,
    phone: d.phone,
    passwordHash: await hashPassword(d.password),
    firstName: d.firstName,
    lastName: d.lastName,
    displayName: `${d.firstName} ${d.lastName}`,
    location: { country: "Nigeria", state: "", city: "" },
    avatarHue: Math.floor(Math.random() * 360),
  });
  await createSession(id);
  const email = await issueCode(id, "email", d.email);
  const phone = await issueCode(id, "phone", d.phone);
  return { ok: true, codes: showCodes() ? { email, phone } : undefined };
}

export async function logIn(input: unknown): Promise<Result<{ next: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter your email and password." };
  const { email, password } = parsed.data;
  const [row] = await getDb()
    .select()
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${email}`)
    .limit(1);
  // Always run the hash so unknown emails aren't faster than wrong passwords.
  const valid = await verifyPassword(password, row?.passwordHash ?? DUMMY_HASH);
  if (!row || !valid) return { ok: false, error: "That email and password don't match." };
  if (row.status !== "active") return { ok: false, error: "This account has been suspended. Contact support." };
  await createSession(row.id);
  return { ok: true, next: row.onboarded ? "/dashboard" : row.emailVerified ? "/onboarding" : "/verify" };
}

export async function logOut(): Promise<void> {
  await destroySession();
}

export async function verifyCode(kind: "email" | "phone", input: unknown): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please log in again." };
  const parsed = codeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter the 6-digit code." };
  const db = getDb();
  const [code] = await db
    .select()
    .from(schema.verificationCodes)
    .where(
      and(
        eq(schema.verificationCodes.userId, user.id),
        eq(schema.verificationCodes.kind, kind),
        isNull(schema.verificationCodes.usedAt),
        gt(schema.verificationCodes.expiresAt, new Date().toISOString()),
      ),
    )
    .orderBy(desc(schema.verificationCodes.createdAt))
    .limit(1);
  if (!code || code.attempts >= MAX_ATTEMPTS) return { ok: false, error: "That code has expired. Request a new one." };
  if (code.codeHash !== sha256(parsed.data.code)) {
    await db.update(schema.verificationCodes).set({ attempts: code.attempts + 1 }).where(eq(schema.verificationCodes.id, code.id));
    return { ok: false, error: "That code is incorrect." };
  }
  await db.update(schema.verificationCodes).set({ usedAt: new Date().toISOString() }).where(eq(schema.verificationCodes.id, code.id));
  await db
    .update(schema.users)
    .set(kind === "email" ? { emailVerified: true } : { phoneVerified: true })
    .where(eq(schema.users.id, user.id));
  return { ok: true };
}

export async function resendCode(kind: "email" | "phone"): Promise<Result<{ code?: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please log in again." };
  const [row] = await getDb().select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
  const code = await issueCode(user.id, kind, kind === "email" ? row.email : row.phone);
  return { ok: true, code: showCodes() ? code : undefined };
}

/** Whoever is signed in, for screens outside the app (verify, onboarding). */
export async function whoAmI(): Promise<{ email: string; emailVerified: boolean; phoneVerified: boolean } | null> {
  const user = await getSessionUser();
  return user ? { email: user.email, emailVerified: user.verified.email, phoneVerified: user.verified.phone } : null;
}

export async function requestPasswordReset(input: unknown): Promise<Result> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const db = getDb();
  const [row] = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${parsed.data.email}`)
    .limit(1);
  // Same response whether or not the account exists.
  if (row) {
    const token = randomToken();
    await db.insert(schema.verificationCodes).values({
      userId: row.id,
      kind: "reset",
      codeHash: sha256(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000).toISOString(),
    });
    const base = process.env.APP_URL ?? "http://localhost:3000";
    deliver("reset", row.email, `${base}/reset-password?token=${token}`);
  }
  return { ok: true };
}

export async function resetPassword(token: unknown, input: unknown): Promise<Result> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your password." };
  if (typeof token !== "string" || token.length < 20) return { ok: false, error: "This reset link is invalid." };
  const db = getDb();
  const [code] = await db
    .select()
    .from(schema.verificationCodes)
    .where(
      and(
        eq(schema.verificationCodes.kind, "reset"),
        eq(schema.verificationCodes.codeHash, sha256(token)),
        isNull(schema.verificationCodes.usedAt),
        gt(schema.verificationCodes.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1);
  if (!code) return { ok: false, error: "This reset link has expired. Request a new one." };
  await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(schema.users.id, code.userId));
  await db.update(schema.verificationCodes).set({ usedAt: new Date().toISOString() }).where(eq(schema.verificationCodes.id, code.id));
  await destroyAllSessions(code.userId);
  return { ok: true };
}
