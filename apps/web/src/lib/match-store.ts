import { MatchOrchestrator } from "@agent-arcade/game-engine";
import { gameRegistry } from "@agent-arcade/game-engine";
import {
  getConnect4AiMove,
  getChessAiMove,
  getPokerAiMove,
  type AiDifficulty,
} from "@agent-arcade/game-engine";
import type { GameResult, MatchPlayer } from "@agent-arcade/shared";

export interface AiPlayerConfig {
  playerId: string;
  difficulty: AiDifficulty;
}

export interface StoredMatch {
  id: string;
  gameSlug: string;
  players: MatchPlayer[];
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  state: unknown;
  turnNumber: number;
  result: GameResult | null;
  createdAt: Date;
  orchestrator: MatchOrchestrator | null;
  aiPlayer: AiPlayerConfig | null;
}

/**
 * In-memory match store for development.
 * Will be replaced with Postgres + Drizzle in production.
 */
class MatchStore {
  private matches = new Map<string, StoredMatch>();

  create(
    gameSlug: string,
    players: MatchPlayer[],
    aiPlayer?: AiPlayerConfig,
  ): StoredMatch {
    const game = gameRegistry.getOrThrow(gameSlug);
    const id = crypto.randomUUID();

    const match: StoredMatch = {
      id,
      gameSlug,
      players,
      status: "waiting",
      state: null,
      turnNumber: 0,
      result: null,
      createdAt: new Date(),
      orchestrator: null,
      aiPlayer: aiPlayer ?? null,
    };

    const orchestrator = new MatchOrchestrator(
      game,
      {},
      players,
      {
        onStateChange: (state, turnNumber) => {
          match.state = state;
          match.turnNumber = turnNumber;
        },
        onGameEnd: (result) => {
          match.result = result;
          match.status = "completed";
        },
        onMoveTimeout: (playerId) => {
          console.log(`Player ${playerId} timed out in match ${id}`);
        },
      },
      60_000,
    );

    match.orchestrator = orchestrator;
    orchestrator.start();
    match.status = "in_progress";

    this.matches.set(id, match);
    return match;
  }

  get(id: string): StoredMatch | undefined {
    return this.matches.get(id);
  }

  list(): StoredMatch[] {
    return Array.from(this.matches.values());
  }

  submitMove(
    matchId: string,
    playerId: string,
    move: unknown,
  ): { success: boolean; error?: string; gameResult?: GameResult } {
    const match = this.matches.get(matchId);
    if (!match) return { success: false, error: "Match not found" };
    if (!match.orchestrator)
      return { success: false, error: "Match has no orchestrator" };

    const result = match.orchestrator.submitMove(playerId, move as never);

    if (!result.success) return result;

    // If game ended, return immediately
    if (result.gameResult) return result;

    // If the next player is AI, auto-play their move
    if (match.aiPlayer && match.status === "in_progress") {
      const activePlayers = match.orchestrator.getActivePlayers();
      if (activePlayers.includes(match.aiPlayer.playerId)) {
        const aiResult = this.playAiMove(match);
        if (aiResult?.gameResult) {
          return { success: true, gameResult: aiResult.gameResult };
        }
      }
    }

    return result;
  }

  private playAiMove(match: StoredMatch): { gameResult?: GameResult } | null {
    if (!match.orchestrator || !match.aiPlayer) return null;

    const state = match.orchestrator.getState();
    const difficulty = match.aiPlayer.difficulty;
    let aiMove: unknown;

    try {
      if (match.gameSlug === "connect4") {
        aiMove = getConnect4AiMove(state as never, difficulty);
      } else if (match.gameSlug === "chess") {
        aiMove = getChessAiMove(state as never, difficulty);
      } else if (match.gameSlug === "poker") {
        aiMove = getPokerAiMove(state as never, difficulty);
      } else {
        return null;
      }
    } catch (err) {
      console.error(`AI move error:`, err);
      return null;
    }

    const result = match.orchestrator.submitMove(
      match.aiPlayer.playerId,
      aiMove as never,
    );

    return { gameResult: result.gameResult };
  }
}

// Singleton — persists across API route invocations in dev
export const matchStore = new MatchStore();
