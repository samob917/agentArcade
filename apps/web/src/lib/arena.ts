import { gameRegistry } from "@agent-arcade/game-engine";
import {
  getConnect4AiMove,
  getChessAiMove,
  getPokerAiMove,
  type AiDifficulty,
} from "@agent-arcade/game-engine";
import type { GameResult, MatchPlayer } from "@agent-arcade/shared";
import { agentStore, type RegisteredAgent } from "./agent-store";
import { bettingStore } from "./betting-store";
import { ensureGamesRegistered } from "./register-games";

export interface ArenaMatch {
  id: string;
  gameSlug: string;
  players: {
    agentId: string;
    agentName: string;
    seat: number;
    elo: number;
    difficulty: AiDifficulty;
    winStreak: number;
  }[];
  /** Full move-by-move history for replay */
  moveLog: { playerId: string; move: unknown; timestamp: number }[];
  /** Current board state (serializable) */
  state: unknown;
  turnNumber: number;
  status: "playing" | "finished";
  result: GameResult | null;
  winnerId: string | null;
  startedAt: number;
  finishedAt: number | null;
}

export interface ArenaState {
  currentMatch: ArenaMatch | null;
  recentMatches: ArenaMatch[];
  /** agentId -> win streak */
  winStreaks: Record<string, number>;
  totalMatchesPlayed: number;
  isRunning: boolean;
}

const MOVE_DELAY_MS = 800; // delay between moves for watchability
const MATCH_COOLDOWN_MS = 3000; // pause between matches
const MAX_RECENT = 10;

class Arena {
  private state: ArenaState = {
    currentMatch: null,
    recentMatches: [],
    winStreaks: {},
    totalMatchesPlayed: 0,
    isRunning: false,
  };

  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private currentChampionId: string | null = null;

  getState(): ArenaState {
    return this.state;
  }

  start(gameSlug: string): void {
    if (this.state.isRunning) return;
    ensureGamesRegistered();
    this.state.isRunning = true;
    this.runLoop(gameSlug);
  }

  stop(): void {
    this.state.isRunning = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }

  private async runLoop(gameSlug: string): Promise<void> {
    while (this.state.isRunning) {
      // Pick two agents
      const agents = this.pickAgents(gameSlug);
      if (!agents) {
        // Not enough agents — wait and retry
        await this.sleep(2000);
        continue;
      }

      const [agentA, agentB] = agents;

      // Run the match
      await this.runMatch(gameSlug, agentA, agentB);

      // Cooldown before next match
      await this.sleep(MATCH_COOLDOWN_MS);
    }
  }

  private pickAgents(gameSlug: string): [RegisteredAgent, RegisteredAgent] | null {
    const eligible = agentStore
      .list()
      .filter((a) => a.supportedGames.includes(gameSlug) && a.isBuiltIn);

    if (eligible.length < 2) return null;

    // Champion stays on. Pick a random challenger.
    let champion: RegisteredAgent;
    let challenger: RegisteredAgent;

    if (this.currentChampionId) {
      const champ = eligible.find((a) => a.id === this.currentChampionId);
      if (champ) {
        champion = champ;
        const challengers = eligible.filter((a) => a.id !== champion.id);
        challenger = challengers[Math.floor(Math.random() * challengers.length)];
      } else {
        // Champion no longer available
        champion = eligible[0];
        challenger = eligible[1];
      }
    } else {
      // First match — pick two random
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      champion = shuffled[0];
      challenger = shuffled[1];
    }

    return [champion, challenger];
  }

  private async runMatch(
    gameSlug: string,
    agentA: RegisteredAgent,
    agentB: RegisteredAgent,
  ): Promise<void> {
    const game = gameRegistry.getOrThrow(gameSlug);

    const players: MatchPlayer[] = [
      { id: agentA.id, seat: 0, isHuman: false, displayName: agentA.name },
      { id: agentB.id, seat: 1, isHuman: false, displayName: agentB.name },
    ];

    const initialState = game.createInitialState({}, players);

    const match: ArenaMatch = {
      id: crypto.randomUUID(),
      gameSlug,
      players: [
        {
          agentId: agentA.id,
          agentName: agentA.name,
          seat: 0,
          elo: agentA.elo,
          difficulty: agentA.builtInDifficulty || "medium",
          winStreak: this.state.winStreaks[agentA.id] || 0,
        },
        {
          agentId: agentB.id,
          agentName: agentB.name,
          seat: 1,
          elo: agentB.elo,
          difficulty: agentB.builtInDifficulty || "medium",
          winStreak: this.state.winStreaks[agentB.id] || 0,
        },
      ],
      moveLog: [],
      state: initialState,
      turnNumber: 0,
      status: "playing",
      result: null,
      winnerId: null,
      startedAt: Date.now(),
      finishedAt: null,
    };

    this.state.currentMatch = match;

    // Create betting market for this match
    bettingStore.createMarket({
      matchId: match.id,
      gameSlug,
      playerA: { id: agentA.id, name: agentA.name },
      playerB: { id: agentB.id, name: agentB.name },
      drawAllowed: gameSlug === "chess",
    });

    // Play the game move by move
    let state = initialState as Record<string, unknown>;
    let turnCount = 0;
    const MAX_TURNS = 200;

    while (this.state.isRunning && turnCount < MAX_TURNS) {
      const activePlayers = game.getActivePlayers(state);
      if (activePlayers.length === 0) break;

      const currentPlayerId = activePlayers[0];
      const playerInfo = match.players.find((p) => p.agentId === currentPlayerId);
      if (!playerInfo) break;

      // Compute the AI move
      let move: unknown;
      try {
        if (gameSlug === "connect4") {
          move = getConnect4AiMove(state as never, playerInfo.difficulty);
        } else if (gameSlug === "chess") {
          move = getChessAiMove(state as never, playerInfo.difficulty);
        } else if (gameSlug === "poker") {
          move = getPokerAiMove(state as never, playerInfo.difficulty);
        } else {
          break;
        }
      } catch {
        break;
      }

      // Validate and apply
      const error = game.validateMove(state, currentPlayerId, move);
      if (error) break;

      state = game.applyMove(state, currentPlayerId, move) as Record<string, unknown>;
      turnCount++;

      // Update match state
      match.moveLog.push({
        playerId: currentPlayerId,
        move,
        timestamp: Date.now(),
      });
      match.state = state;
      match.turnNumber = turnCount;

      // Check for game end
      const result = game.getResult(state);
      if (result) {
        match.result = result;
        match.winnerId = result.winnerId;
        match.status = "finished";
        match.finishedAt = Date.now();
        break;
      }

      // Wait between moves for watchability
      await this.sleep(MOVE_DELAY_MS);
    }

    // If we exited without a result (max turns), declare draw
    if (!match.result) {
      match.result = {
        winnerId: null,
        reason: "max_turns",
        scores: {},
        finalState: state,
      };
      match.status = "finished";
      match.finishedAt = Date.now();
    }

    // Settle betting market
    if (match.result) {
      const result = match.winnerId === agentA.id ? "playerA"
        : match.winnerId === agentB.id ? "playerB"
        : "draw";
      bettingStore.settleMarket(match.id, result as "playerA" | "playerB" | "draw");
    }

    // Update ELO and streaks
    this.processResult(agentA, agentB, match);

    // Archive match
    this.state.recentMatches.unshift({ ...match });
    if (this.state.recentMatches.length > MAX_RECENT) {
      this.state.recentMatches.pop();
    }
    this.state.totalMatchesPlayed++;
  }

  private processResult(
    agentA: RegisteredAgent,
    agentB: RegisteredAgent,
    match: ArenaMatch,
  ): void {
    const winnerId = match.result?.winnerId;

    // ELO calculation
    const expectedA = 1 / (1 + Math.pow(10, (agentB.elo - agentA.elo) / 400));
    const expectedB = 1 - expectedA;
    const K = 32;

    if (winnerId === agentA.id) {
      agentStore.recordResult(agentA.id, "win", Math.round(K * (1 - expectedA)));
      agentStore.recordResult(agentB.id, "loss", Math.round(K * (0 - expectedB)));
      this.state.winStreaks[agentA.id] = (this.state.winStreaks[agentA.id] || 0) + 1;
      this.state.winStreaks[agentB.id] = 0;
      this.currentChampionId = agentA.id;
    } else if (winnerId === agentB.id) {
      agentStore.recordResult(agentA.id, "loss", Math.round(K * (0 - expectedA)));
      agentStore.recordResult(agentB.id, "win", Math.round(K * (1 - expectedB)));
      this.state.winStreaks[agentB.id] = (this.state.winStreaks[agentB.id] || 0) + 1;
      this.state.winStreaks[agentA.id] = 0;
      this.currentChampionId = agentB.id;
    } else {
      // Draw
      agentStore.recordResult(agentA.id, "draw", Math.round(K * (0.5 - expectedA)));
      agentStore.recordResult(agentB.id, "draw", Math.round(K * (0.5 - expectedB)));
      // On draw, pick a random new champion
      this.currentChampionId = Math.random() > 0.5 ? agentA.id : agentB.id;
    }

    // Update match player ELOs to reflect post-match values
    const matchPlayerA = match.players.find((p) => p.agentId === agentA.id);
    const matchPlayerB = match.players.find((p) => p.agentId === agentB.id);
    if (matchPlayerA) matchPlayerA.winStreak = this.state.winStreaks[agentA.id] || 0;
    if (matchPlayerB) matchPlayerB.winStreak = this.state.winStreaks[agentB.id] || 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.loopTimer = setTimeout(resolve, ms);
    });
  }
}

export const arena = new Arena();
