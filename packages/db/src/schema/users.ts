import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  avatarUrl: text("avatar_url"),
  walletAddress: varchar("wallet_address", { length: 42 }),
  elo: integer("elo").default(1200).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
