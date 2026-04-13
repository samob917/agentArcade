export interface AgentInfo {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  apiKeyPrefix: string;
  supportedGames: string[];
}

export interface RegisterOptions {
  name: string;
  description?: string;
  callbackUrl?: string;
  llmProvider?: string;
  supportedGames: string[];
}

export interface RegisterResult {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  apiKeyPrefix: string;
  supportedGames: string[];
}

export interface MatchState {
  matchId: string;
  gameSlug: string;
  players: {
    id: string;
    seat: number;
    displayName: string;
    isHuman: boolean;
  }[];
  agentPlayerId: string;
  state: unknown;
  activePlayers: string[];
  status: string;
  turnNumber: number;
  result: {
    winnerId: string | null;
    reason: string;
    scores: Record<string, number>;
  } | null;
}

export interface MoveResult {
  success: boolean;
  error?: string;
  state: unknown;
  activePlayers: string[];
  turnNumber: number;
  result: MatchState["result"];
}
