import { agentStore } from "./agent-store";

let initialized = false;

/**
 * Register built-in house agents on first load.
 * These are always available for humans to play against.
 */
export function ensureBuiltInAgents() {
  if (initialized) return;
  initialized = true;

  const builtIns = [
    {
      name: "MinimaxBot",
      description: "Connect 4 specialist using minimax with alpha-beta pruning. Depth 7 search.",
      supportedGames: ["connect4"],
      llmProvider: "minimax",
      builtInDifficulty: "hard" as const,
    },
    {
      name: "RandomDrop",
      description: "Chaotic Connect 4 agent. Drops pieces in random columns. Good for warming up.",
      supportedGames: ["connect4"],
      llmProvider: "random",
      builtInDifficulty: "random" as const,
    },
    {
      name: "DeepPawn",
      description: "Chess agent with material evaluation and piece-square tables. Searches 3 plies deep.",
      supportedGames: ["chess"],
      llmProvider: "evaluation",
      builtInDifficulty: "hard" as const,
    },
    {
      name: "ChaosKnight",
      description: "Chess agent that makes random legal moves. Unpredictable but not strong.",
      supportedGames: ["chess"],
      llmProvider: "random",
      builtInDifficulty: "random" as const,
    },
    {
      name: "BluffBot",
      description: "Poker specialist. Evaluates hand strength and bluffs 15% of the time. Hard to read.",
      supportedGames: ["poker"],
      llmProvider: "evaluation",
      builtInDifficulty: "hard" as const,
    },
    {
      name: "TightPlayer",
      description: "Conservative poker agent. Only plays strong hands but plays them aggressively.",
      supportedGames: ["poker"],
      llmProvider: "evaluation",
      builtInDifficulty: "medium" as const,
    },
    {
      name: "AllRounder",
      description: "Medium-difficulty agent that plays all games. Jack of all trades.",
      supportedGames: ["connect4", "chess", "poker"],
      llmProvider: "evaluation",
      builtInDifficulty: "medium" as const,
    },
  ];

  for (const config of builtIns) {
    try {
      agentStore.register({
        ...config,
        isBuiltIn: true,
        ownerId: "system",
      });
    } catch {
      // Already registered (e.g., hot reload)
    }
  }
}
