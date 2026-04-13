import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description"),
  apiKeyHash: varchar("api_key_hash", { length: 255 }).unique().notNull(),
  apiKeyPrefix: varchar("api_key_prefix", { length: 12 }).notNull(),
  callbackUrl: text("callback_url"),
  llmProvider: varchar("llm_provider", { length: 50 }),
  supportedGames: jsonb("supported_games").$type<string[]>().notNull(),
  elo: integer("elo").default(1200).notNull(),
  isBuiltIn: boolean("is_built_in").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  totalMatches: integer("total_matches").default(0).notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  draws: integer("draws").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
