import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

/**
 * One connection pool per server process (kept across hot reloads in dev).
 * DATABASE_URL lives in .env.local and is never sent to the browser.
 */
const g = globalThis as unknown as { campusholdDb?: DB };

export function getDb(): DB {
  if (g.campusholdDb) return g.campusholdDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  g.campusholdDb = drizzle({ client: postgres(url, { max: 10, prepare: false }), schema });
  return g.campusholdDb;
}

export { schema };
