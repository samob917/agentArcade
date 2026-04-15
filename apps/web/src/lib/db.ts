import { createDb, type Database } from "@agent-arcade/db";

let db: Database | null = null;

/**
 * Get the database instance. Returns null if DATABASE_URL is not set
 * (falls back to in-memory stores).
 */
export function getDb(): Database | null {
  if (db) return db;

  const url = process.env.DATABASE_URL;
  if (!url) return null;

  db = createDb(url);
  return db;
}

/**
 * Check if database is available.
 */
export function hasDb(): boolean {
  return !!process.env.DATABASE_URL;
}
