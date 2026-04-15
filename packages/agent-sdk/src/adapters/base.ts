import type { MatchState } from "../types";

/**
 * Base interface for LLM adapters.
 * Each adapter translates game state into a prompt and the move schema into tool calls.
 */
export interface LLMAdapter {
  /** Generate a move for the given game state */
  decideMove(match: MatchState, options?: LLMAdapterOptions): Promise<unknown>;
}

export interface LLMAdapterOptions {
  /** System prompt override */
  systemPrompt?: string;
  /** Temperature for sampling (0-1) */
  temperature?: number;
  /** Maximum tokens for the response */
  maxTokens?: number;
}

/**
 * Build a game-specific system prompt based on the game slug.
 */
export function getGameSystemPrompt(gameSlug: string): string {
  switch (gameSlug) {
    case "connect4":
      return `You are an expert Connect 4 player. You are playing a competitive match.

The board is a 6-row, 7-column grid. Pieces drop to the lowest available position.
Connect 4 in a row (horizontal, vertical, or diagonal) to win.

Strategy tips:
- Control the center column (column 3) for the most winning connections
- Look for forced wins: create two threats simultaneously
- Block opponent's three-in-a-row immediately
- Build vertically to create diagonal threats

Analyze the board state carefully and choose the optimal column.`;

    case "chess":
      return `You are a strong chess player competing in a match.

You will see the board position in FEN notation and must choose your move.
Use standard algebraic notation for squares (e.g., e2, e4).

Strategy:
- Develop pieces quickly in the opening
- Control the center
- Keep your king safe
- Look for tactics: forks, pins, skewers, discovered attacks
- In the endgame, activate your king

Analyze the position carefully and choose the best move.`;

    case "poker":
      return `You are a skilled Texas Hold'em poker player in a heads-up match.

You will see your hole cards, community cards, pot size, and betting state.
Choose your action: fold, check, call, or raise.

Strategy:
- Play tight-aggressive: be selective with starting hands but bet aggressively with strong ones
- Consider pot odds when deciding to call
- Bluff occasionally to remain unpredictable
- Position matters: act last when possible
- Adjust to your opponent's patterns

Make your decision based on hand strength, pot odds, and game theory.`;

    default:
      return "You are playing a competitive game. Analyze the state and choose the best move.";
  }
}

/**
 * Format the game state into a human-readable description for the LLM.
 */
export function formatGameState(match: MatchState): string {
  const state = match.state as Record<string, unknown>;

  switch (match.gameSlug) {
    case "connect4": {
      const board = state.board as number[][];
      const symbols = [" . ", " X ", " O "];
      let boardStr = "  0  1  2  3  4  5  6\n";
      boardStr += board
        .map((row, i) => `${i} ${row.map((c) => symbols[c]).join("")}`)
        .join("\n");
      const currentIdx = state.currentPlayerIndex as number;
      boardStr += `\n\nYou are player ${currentIdx + 1} (${currentIdx === 0 ? "X" : "O"})`;
      boardStr += `\nMove history: ${(state.moveHistory as number[]).join(", ") || "none"}`;
      return boardStr;
    }

    case "chess": {
      const fen = state.fen as string;
      const pgn = state.pgn as string;
      const turn = fen.split(" ")[1] === "w" ? "White" : "Black";
      return `FEN: ${fen}\nPGN: ${pgn || "(no moves yet)"}\nYou are playing as: ${turn}\n${state.isCheck ? "CHECK!" : ""}`;
    }

    case "poker": {
      const players = state.players as {
        id: string;
        chips: number;
        currentBet: number;
        folded: boolean;
        holeCards: { rank: string; suit: string }[] | null;
      }[];
      const community = state.communityCards as { rank: string; suit: string }[];
      const pot = state.pot as number;
      const phase = state.phase as string;

      const you = players.find((p) => p.id === match.agentPlayerId);
      const opp = players.find((p) => p.id !== match.agentPlayerId);

      const formatCards = (cards: { rank: string; suit: string }[] | null) =>
        cards ? cards.map((c) => `${c.rank}${c.suit[0]}`).join(" ") : "hidden";

      return [
        `Phase: ${phase}`,
        `Pot: ${pot}`,
        `Your cards: ${formatCards(you?.holeCards || null)}`,
        `Your chips: ${you?.chips} | Current bet: ${you?.currentBet}`,
        `Opponent chips: ${opp?.chips} | Current bet: ${opp?.currentBet}`,
        `Community: ${community.length > 0 ? formatCards(community) : "none yet"}`,
        opp?.folded ? "Opponent has folded" : "",
      ].filter(Boolean).join("\n");
    }

    default:
      return JSON.stringify(state, null, 2);
  }
}

/**
 * Get the tool definition for the game's move schema.
 */
export function getMoveToolDef(gameSlug: string) {
  switch (gameSlug) {
    case "connect4":
      return {
        name: "make_move",
        description: "Drop a disc into a column (0-6)",
        input_schema: {
          type: "object" as const,
          properties: {
            column: {
              type: "number" as const,
              description: "Column number (0-6) to drop your disc",
            },
          },
          required: ["column"],
        },
      };

    case "chess":
      return {
        name: "make_move",
        description: "Make a chess move using square coordinates",
        input_schema: {
          type: "object" as const,
          properties: {
            from: {
              type: "string" as const,
              description: "Source square (e.g., 'e2')",
            },
            to: {
              type: "string" as const,
              description: "Target square (e.g., 'e4')",
            },
            promotion: {
              type: "string" as const,
              description: "Promotion piece if pawn reaches last rank: 'q', 'r', 'b', or 'n'",
              enum: ["q", "r", "b", "n"],
            },
          },
          required: ["from", "to"],
        },
      };

    case "poker":
      return {
        name: "make_move",
        description: "Choose a poker action",
        input_schema: {
          type: "object" as const,
          properties: {
            action: {
              type: "string" as const,
              description: "Your action: fold, check, call, or raise",
              enum: ["fold", "check", "call", "raise"],
            },
            amount: {
              type: "number" as const,
              description: "Raise amount (only needed when action is 'raise')",
            },
          },
          required: ["action"],
        },
      };

    default:
      return {
        name: "make_move",
        description: "Submit your move",
        input_schema: {
          type: "object" as const,
          properties: {
            move: { type: "object" as const, description: "Your move data" },
          },
          required: ["move"],
        },
      };
  }
}
