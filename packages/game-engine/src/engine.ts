import type { GameResult, MatchPlayer } from "@agent-arcade/shared";
import type { GameDefinition, OrchestratorCallbacks } from "./types";

export type MatchPhase = "waiting" | "active" | "finished";

export interface MoveResult {
  success: boolean;
  error?: string;
  gameResult?: GameResult;
}

/**
 * Manages a single match lifecycle: turn management, timers, move validation.
 * Instantiated per match by the API layer.
 */
export class MatchOrchestrator<
  TState = unknown,
  TMove = unknown,
  TConfig = unknown,
> {
  private state: TState;
  private phase: MatchPhase = "waiting";
  private turnNumber = 0;
  private moveTimer: ReturnType<typeof setTimeout> | null = null;
  private result: GameResult | null = null;

  constructor(
    private game: GameDefinition<TState, TMove, TConfig>,
    config: TConfig,
    private players: MatchPlayer[],
    private callbacks: OrchestratorCallbacks,
    private moveTimeoutMs: number,
  ) {
    this.state = game.createInitialState(config, players);
  }

  /** Start the match. Begins the first turn timer. */
  start(): void {
    if (this.phase !== "waiting") {
      throw new Error(`Cannot start match in phase "${this.phase}"`);
    }
    this.phase = "active";
    this.callbacks.onStateChange(this.state, this.turnNumber);
    this.resetMoveTimer();
  }

  /** Submit a move for a player. Returns success/error. */
  submitMove(playerId: string, move: TMove): MoveResult {
    if (this.phase !== "active") {
      return { success: false, error: "Match is not active" };
    }

    // Check it's this player's turn
    const activePlayers = this.game.getActivePlayers(this.state);
    if (!activePlayers.includes(playerId)) {
      return { success: false, error: "Not your turn" };
    }

    // Validate
    const validationError = this.game.validateMove(
      this.state,
      playerId,
      move,
    );
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Apply
    this.state = this.game.applyMove(this.state, playerId, move);
    this.turnNumber++;

    // Check for game end
    const result = this.game.getResult(this.state);
    if (result) {
      this.finish(result);
      return { success: true, gameResult: result };
    }

    // Notify and restart timer
    this.callbacks.onStateChange(this.state, this.turnNumber);
    this.resetMoveTimer();

    return { success: true };
  }

  /** Get the current state visible to a specific player */
  getVisibleState(playerId: string): unknown {
    return this.game.getVisibleState(this.state, playerId);
  }

  /** Get the full authoritative state (for persistence) */
  getState(): TState {
    return this.state;
  }

  /** Get current active players */
  getActivePlayers(): string[] {
    if (this.phase !== "active") return [];
    return this.game.getActivePlayers(this.state);
  }

  getTurnNumber(): number {
    return this.turnNumber;
  }

  getPhase(): MatchPhase {
    return this.phase;
  }

  getResult(): GameResult | null {
    return this.result;
  }

  /** Force end the match (e.g., player disconnect, admin action) */
  abort(reason: string): void {
    this.finish({
      winnerId: null,
      reason,
      scores: {},
      finalState: this.state,
    });
  }

  /** Restore state from persistence (e.g., after server restart) */
  restore(state: TState, turnNumber: number): void {
    this.state = state;
    this.turnNumber = turnNumber;
    this.phase = "active";
    this.resetMoveTimer();
  }

  /** Clean up timers */
  destroy(): void {
    this.clearMoveTimer();
  }

  private finish(result: GameResult): void {
    this.clearMoveTimer();
    this.phase = "finished";
    this.result = result;
    this.callbacks.onGameEnd(result);
  }

  private resetMoveTimer(): void {
    this.clearMoveTimer();
    if (this.moveTimeoutMs > 0) {
      this.moveTimer = setTimeout(() => {
        const activePlayers = this.game.getActivePlayers(this.state);
        if (activePlayers.length > 0) {
          this.callbacks.onMoveTimeout(activePlayers[0]);
          // Timeout the first active player — the API layer decides what to do
          // (e.g., forfeit, skip turn, etc.)
        }
      }, this.moveTimeoutMs);
    }
  }

  private clearMoveTimer(): void {
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
  }
}
