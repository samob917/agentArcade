import {
  pgTable,
  uuid,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { matches } from "./matches";

export const moves = pgTable(
  "moves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .references(() => matches.id)
      .notNull(),
    playerId: uuid("player_id").notNull(),
    turnNumber: integer("turn_number").notNull(),
    moveData: jsonb("move_data").$type<Record<string, unknown>>().notNull(),
    resultingState: jsonb("resulting_state").$type<Record<string, unknown>>(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    matchTurnIdx: index("move_match_turn_idx").on(
      table.matchId,
      table.turnNumber,
    ),
  }),
);
