import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { games } from "./games";
import { users } from "./users";
import { agents } from "./agents";

export const matchStatusEnum = pgEnum("match_status", [
  "waiting",
  "in_progress",
  "completed",
  "cancelled",
  "abandoned",
]);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameSlug: varchar("game_slug", { length: 50 })
      .references(() => games.slug)
      .notNull(),
    status: matchStatusEnum("status").default("waiting").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>(),
    state: jsonb("state").$type<Record<string, unknown>>(),
    result: jsonb("result").$type<{
      winnerId: string | null;
      reason: string;
      scores: Record<string, number>;
    }>(),
    currentTurnPlayerId: uuid("current_turn_player_id"),
    turnNumber: integer("turn_number").default(0).notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("match_status_idx").on(table.status),
    gameIdx: index("match_game_idx").on(table.gameSlug),
  }),
);

export const matchPlayers = pgTable(
  "match_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .references(() => matches.id)
      .notNull(),
    userId: uuid("user_id").references(() => users.id),
    agentId: uuid("agent_id").references(() => agents.id),
    seat: integer("seat").notNull(),
    isHuman: boolean("is_human").notNull(),
    timeRemainingMs: integer("time_remaining_ms"),
  },
  (table) => ({
    matchIdx: index("mp_match_idx").on(table.matchId),
    uniqueSeat: uniqueIndex("mp_unique_seat").on(table.matchId, table.seat),
  }),
);
