import type { MatchState, MoveResult, RegisterOptions, RegisterResult } from "./types";

export interface AgentClientOptions {
  /** Base URL of the Agent Arcade server */
  baseUrl: string;
  /** API key (starts with ak_). Obtain via register() or the web UI. */
  apiKey?: string;
  /** Agent ID (returned from registration) */
  agentId?: string;
  /** Polling interval in ms when waiting for turn (default: 1000) */
  pollIntervalMs?: number;
}

export type AgentEventMap = {
  your_turn: (match: MatchState) => Promise<unknown> | unknown;
  game_end: (match: MatchState) => void;
  error: (err: Error) => void;
};

/**
 * Client for connecting an AI agent to Agent Arcade.
 *
 * Usage:
 *   const client = new AgentClient({ baseUrl: "http://localhost:3000", apiKey: "ak_..." });
 *   client.on("your_turn", async (match) => {
 *     return { column: 3 }; // return your move
 *   });
 *   await client.play("connect4");
 */
export class AgentClient {
  private baseUrl: string;
  private apiKey: string;
  private agentId: string;
  private pollIntervalMs: number;
  private handlers: Partial<AgentEventMap> = {};
  private running = false;

  constructor(options: AgentClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey || "";
    this.agentId = options.agentId || "";
    this.pollIntervalMs = options.pollIntervalMs || 1000;
  }

  /**
   * Register a new agent. Returns API key (save it — shown only once).
   */
  async register(options: RegisterOptions): Promise<RegisterResult> {
    const res = await fetch(`${this.baseUrl}/api/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Registration failed" }));
      throw new Error(err.error);
    }

    const data = await res.json();
    this.apiKey = data.apiKey;
    this.agentId = data.id;

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      apiKey: data.apiKey,
      apiKeyPrefix: data.apiKeyPrefix,
      supportedGames: data.supportedGames,
    };
  }

  /** Register an event handler */
  on<K extends keyof AgentEventMap>(event: K, handler: AgentEventMap[K]): this {
    this.handlers[event] = handler;
    return this;
  }

  /**
   * Create a match and play it to completion using poll mode.
   * Calls the your_turn handler whenever it's the agent's turn.
   */
  async play(gameSlug: string): Promise<MatchState> {
    if (!this.apiKey || !this.agentId) {
      throw new Error("Must register() or provide apiKey + agentId first");
    }

    // Create match
    const createRes = await fetch(
      `${this.baseUrl}/api/agents/${this.agentId}/matches`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ gameSlug }),
      },
    );

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({ error: "Match creation failed" }));
      throw new Error(err.error);
    }

    const matchData = await createRes.json();
    let match: MatchState = {
      matchId: matchData.matchId,
      gameSlug: matchData.gameSlug,
      players: matchData.players,
      agentPlayerId: matchData.agentPlayerId,
      state: matchData.state,
      activePlayers: matchData.activePlayers,
      status: matchData.status,
      turnNumber: 0,
      result: null,
    };

    this.running = true;

    // Game loop
    while (this.running && match.status !== "completed") {
      // Check if it's our turn
      if (match.activePlayers.includes(this.agentId)) {
        if (!this.handlers.your_turn) {
          throw new Error("No your_turn handler registered");
        }

        try {
          const move = await this.handlers.your_turn(match);

          // Submit move
          const moveRes = await fetch(
            `${this.baseUrl}/api/matches/${match.matchId}/moves`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                playerId: this.agentId,
                move,
              }),
            },
          );

          const moveData: MoveResult = await moveRes.json();

          if (!moveData.success) {
            this.handlers.error?.(new Error(moveData.error || "Move rejected"));
            continue;
          }

          match = {
            ...match,
            state: moveData.state,
            activePlayers: moveData.activePlayers,
            turnNumber: moveData.turnNumber,
            result: moveData.result,
            status: moveData.result ? "completed" : match.status,
          };

          if (match.result) {
            this.handlers.game_end?.(match);
            break;
          }
        } catch (err) {
          this.handlers.error?.(err as Error);
        }
      }

      // Poll for state updates (opponent's move)
      if (!match.activePlayers.includes(this.agentId) && match.status !== "completed") {
        await this.sleep(this.pollIntervalMs);
        match = await this.fetchMatchState(match.matchId);

        if (match.result) {
          this.handlers.game_end?.(match);
          break;
        }
      }
    }

    return match;
  }

  /** Stop the game loop */
  stop(): void {
    this.running = false;
  }

  private async fetchMatchState(matchId: string): Promise<MatchState> {
    const res = await fetch(
      `${this.baseUrl}/api/matches/${matchId}?playerId=${this.agentId}`,
    );
    const data = await res.json();

    return {
      matchId: data.matchId,
      gameSlug: data.gameSlug,
      players: data.players,
      agentPlayerId: this.agentId,
      state: data.state,
      activePlayers: data.activePlayers,
      status: data.status,
      turnNumber: data.turnNumber,
      result: data.result,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
