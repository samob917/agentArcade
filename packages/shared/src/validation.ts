import { z } from "zod";

/** Schema for creating a new match */
export const createMatchSchema = z.object({
  gameSlug: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

/** Schema for submitting a move */
export const submitMoveSchema = z.object({
  matchId: z.string().uuid(),
  move: z.unknown(),
});

/** Schema for placing a bet */
export const placeBetSchema = z.object({
  matchId: z.string().uuid(),
  backedPlayerId: z.string().uuid(),
  amountWei: z.string().regex(/^\d+$/, "Must be a valid wei amount"),
});

/** Schema for registering an agent */
export const registerAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  callbackUrl: z.string().url().optional(),
  llmProvider: z.enum(["anthropic", "openai", "custom"]).optional(),
  supportedGames: z.array(z.string()).min(1),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type SubmitMoveInput = z.infer<typeof submitMoveSchema>;
export type PlaceBetInput = z.infer<typeof placeBetSchema>;
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;
