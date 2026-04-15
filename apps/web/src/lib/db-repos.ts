import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  users,
  agents,
  matches,
  matchPlayers,
  moves,
  bets,
} from "@agent-arcade/db";

// --- Users ---

export async function dbCreateUser(input: {
  name: string;
  email: string | null;
  walletAddress?: string | null;
}) {
  const db = getDb();
  if (!db) return null;

  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email || `${crypto.randomUUID()}@placeholder.local`,
      walletAddress: input.walletAddress,
    })
    .returning();

  return user;
}

export async function dbGetUserByEmail(email: string) {
  const db = getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] || null;
}

// --- Agents ---

export async function dbCreateAgent(input: {
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  supportedGames: string[];
  llmProvider?: string;
  isBuiltIn?: boolean;
}) {
  const db = getDb();
  if (!db) return null;

  const [agent] = await db
    .insert(agents)
    .values({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      ownerId: input.ownerId,
      apiKeyHash: input.apiKeyHash,
      apiKeyPrefix: input.apiKeyPrefix,
      supportedGames: input.supportedGames,
      llmProvider: input.llmProvider || null,
      isBuiltIn: input.isBuiltIn || false,
    })
    .returning();

  return agent;
}

export async function dbGetAgentByApiKeyHash(hash: string) {
  const db = getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKeyHash, hash))
    .limit(1);
  return result[0] || null;
}

export async function dbListAgents() {
  const db = getDb();
  if (!db) return null;

  return db
    .select()
    .from(agents)
    .where(eq(agents.isActive, true))
    .orderBy(desc(agents.elo));
}

export async function dbUpdateAgentStats(
  agentId: string,
  outcome: "win" | "loss" | "draw",
  eloChange: number,
) {
  const db = getDb();
  if (!db) return;

  const field = outcome === "win" ? agents.wins : outcome === "loss" ? agents.losses : agents.draws;

  await db
    .update(agents)
    .set({
      totalMatches: sql`${agents.totalMatches} + 1`,
      [field.name]: sql`${field} + 1`,
      elo: sql`GREATEST(0, ${agents.elo} + ${eloChange})`,
    })
    .where(eq(agents.id, agentId));
}

// --- Matches ---

export async function dbCreateMatch(input: {
  gameSlug: string;
  config?: Record<string, unknown>;
  state?: Record<string, unknown>;
}) {
  const db = getDb();
  if (!db) return null;

  const [match] = await db
    .insert(matches)
    .values({
      gameSlug: input.gameSlug,
      config: input.config,
      state: input.state,
      status: "in_progress",
      startedAt: new Date(),
    })
    .returning();

  return match;
}

export async function dbUpdateMatchState(
  matchId: string,
  state: Record<string, unknown>,
  turnNumber: number,
) {
  const db = getDb();
  if (!db) return;

  await db
    .update(matches)
    .set({ state, turnNumber })
    .where(eq(matches.id, matchId));
}

export async function dbCompleteMatch(
  matchId: string,
  result: Record<string, unknown>,
) {
  const db = getDb();
  if (!db) return;

  await db
    .update(matches)
    .set({
      status: "completed",
      result: result as { winnerId: string | null; reason: string; scores: Record<string, number> },
      completedAt: new Date(),
    })
    .where(eq(matches.id, matchId));
}

// --- Moves ---

export async function dbRecordMove(input: {
  matchId: string;
  playerId: string;
  turnNumber: number;
  moveData: Record<string, unknown>;
}) {
  const db = getDb();
  if (!db) return;

  await db.insert(moves).values(input);
}

// --- Bets ---

export async function dbCreateBet(input: {
  matchId: string;
  userId: string;
  backedPlayerId: string;
  amountWei: string;
  odds: string;
  potentialPayoutWei: string;
}) {
  const db = getDb();
  if (!db) return null;

  const [bet] = await db
    .insert(bets)
    .values(input)
    .returning();

  return bet;
}

export async function dbGetUserBets(userId: string) {
  const db = getDb();
  if (!db) return null;

  return db
    .select()
    .from(bets)
    .where(eq(bets.userId, userId))
    .orderBy(desc(bets.createdAt));
}
