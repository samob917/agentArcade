import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  slug: varchar("slug", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  minPlayers: integer("min_players").notNull(),
  maxPlayers: integer("max_players").notNull(),
  turnBased: boolean("turn_based").default(true).notNull(),
  defaultTimeControl: jsonb("default_time_control")
    .$type<{ moveTimeoutMs: number; totalTimeMs: number | null }>()
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
