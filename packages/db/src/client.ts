import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as users from "./schema/users";
import * as agents from "./schema/agents";
import * as games from "./schema/games";
import * as matches from "./schema/matches";
import * as moves from "./schema/moves";
import * as bets from "./schema/bets";

const schema = {
  ...users,
  ...agents,
  ...games,
  ...matches,
  ...moves,
  ...bets,
};

export function createDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
