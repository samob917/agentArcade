import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { matches } from "./matches";
import { users } from "./users";

export const betStatusEnum = pgEnum("bet_status", [
  "pending",
  "active",
  "won",
  "lost",
  "cancelled",
  "settled",
]);

export const bets = pgTable(
  "bets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .references(() => matches.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    backedPlayerId: uuid("backed_player_id").notNull(),
    amountWei: numeric("amount_wei", { precision: 78 }).notNull(),
    odds: numeric("odds", { precision: 10, scale: 4 }).notNull(),
    potentialPayoutWei: numeric("potential_payout_wei", {
      precision: 78,
    }).notNull(),
    status: betStatusEnum("status").default("pending").notNull(),
    txHash: varchar("tx_hash", { length: 66 }),
    settlementTxHash: varchar("settlement_tx_hash", { length: 66 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    settledAt: timestamp("settled_at"),
  },
  (table) => ({
    matchIdx: index("bet_match_idx").on(table.matchId),
    userIdx: index("bet_user_idx").on(table.userId),
  }),
);
