import type { ZodType } from "zod";
import type { GameResult, MatchPlayer, TimeControl } from "@agent-arcade/shared";

/**
 * The plugin contract every game must implement.
 * Game logic is pure and deterministic — no side effects, no database access.
 */
export interface GameDefinition<
  TState = unknown,
  TMove = unknown,
  TConfig = unknown,
  TPublicState = unknown,
> {
  /** Unique identifier for this game (e.g., "chess", "poker", "connect4") */
  readonly slug: string;

  /** Display name */
  readonly name: string;

  /** Minimum number of players required */
  readonly minPlayers: number;

  /** Maximum number of players allowed */
  readonly maxPlayers: number;

  /** Whether the game is turn-based (vs simultaneous moves) */
  readonly turnBased: boolean;

  /** Default time control settings */
  readonly defaultTimeControl: TimeControl;

  /** Create the initial state for a new match */
  createInitialState(config: TConfig, players: MatchPlayer[]): TState;

  /** Validate a move. Returns null if valid, error string if invalid. */
  validateMove(state: TState, playerId: string, move: TMove): string | null;

  /** Apply a move and return the new state. Assumes move has been validated. */
  applyMove(state: TState, playerId: string, move: TMove): TState;

  /**
   * Whose turn is it? Returns array of active player IDs.
   * Multiple IDs for simultaneous-move games (e.g., poker betting rounds).
   */
  getActivePlayers(state: TState): string[];

  /** Is the game over? Returns result or null if still in progress. */
  getResult(state: TState): GameResult | null;

  /**
   * Return the state visible to a specific player.
   * Critical for games with hidden information (e.g., poker — each player sees different cards).
   * Use playerId "spectator" for spectator view.
   */
  getVisibleState(state: TState, playerId: string): TPublicState;

  /** Zod schema for validating moves at the API boundary */
  moveSchema: ZodType<TMove>;

  /** Zod schema for validating game config */
  configSchema: ZodType<TConfig>;
}

/** Callbacks the orchestrator uses to communicate state changes */
export interface OrchestratorCallbacks {
  onStateChange: (state: unknown, turnNumber: number) => void;
  onGameEnd: (result: GameResult) => void;
  onMoveTimeout: (playerId: string) => void;
}
