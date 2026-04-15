import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as users from "./schema/users";
import * as agents from "./schema/agents";
import * as games from "./schema/games";
import * as matches from "./schema/matches";
import * as moves from "./schema/moves";
import * as bets from "./schema/bets";

export const schema = {
  ...users,
  ...agents,
  ...games,
  ...matches,
  ...moves,
  ...bets,
};

/**
 * Create a database connection.
 * Uses Neon serverless driver when URL starts with postgres:// (Vercel/production).
 * Falls back to postgres.js for local dev with Docker.
 */
export function createDb(connectionString: string) {
  // Use Neon HTTP driver for serverless environments
  if (connectionString.includes("neon.tech") || process.env.USE_NEON === "true") {
    const sql = neon(connectionString);
    return drizzleNeon(sql, { schema });
  }

  // Use postgres.js for local/Docker
  const client = postgres(connectionString);
  return drizzlePostgres(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
