/** Player types in the system */
export type PlayerType = "human" | "agent";

/** Match status lifecycle */
export type MatchStatus =
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "abandoned";

/** Bet status lifecycle */
export type BetStatus =
  | "pending"
  | "active"
  | "won"
  | "lost"
  | "cancelled"
  | "settled";

/** Result of a completed game */
export interface GameResult {
  winnerId: string | null; // null = draw
  reason: string;
  scores: Record<string, number>;
  finalState: unknown;
}

/** Information about a player in a match */
export interface MatchPlayer {
  id: string;
  seat: number;
  isHuman: boolean;
  displayName: string;
}

/** Time control settings for a match */
export interface TimeControl {
  moveTimeoutMs: number;
  totalTimeMs: number | null;
}

/** WebSocket message types: client -> server */
export type ClientMessage =
  | { type: "join_match"; matchId: string }
  | { type: "spectate"; matchId: string }
  | { type: "move"; matchId: string; move: unknown }
  | { type: "join_queue"; gameSlug: string }
  | { type: "ping" };

/** WebSocket message types: server -> client */
export type ServerMessage =
  | { type: "connected"; playerId: string }
  | {
      type: "match_start";
      matchId: string;
      gameSlug: string;
      players: MatchPlayer[];
      state: unknown;
    }
  | {
      type: "state_update";
      matchId: string;
      state: unknown;
      turnNumber: number;
      activePlayers: string[];
    }
  | { type: "move_ack"; success: boolean; error?: string }
  | { type: "game_end"; matchId: string; result: GameResult }
  | {
      type: "bet_update";
      matchId: string;
      odds: { oddsA: number; oddsB: number };
      totalPool: string;
    }
  | { type: "error"; message: string }
  | { type: "pong" };
