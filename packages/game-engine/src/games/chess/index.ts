import { z } from "zod";
import { Chess } from "chess.js";
import type { GameResult, MatchPlayer } from "@agent-arcade/shared";
import type { GameDefinition } from "../../types";

export interface ChessState {
  fen: string;
  pgn: string;
  players: { white: string; black: string };
  moveHistory: string[];
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
}

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
}

export type ChessConfig = Record<string, never>;

export interface ChessPublicState extends ChessState {}

export const chessGame: GameDefinition<
  ChessState,
  ChessMove,
  ChessConfig,
  ChessPublicState
> = {
  slug: "chess",
  name: "Chess",
  minPlayers: 2,
  maxPlayers: 2,
  turnBased: true,
  defaultTimeControl: { moveTimeoutMs: 60_000, totalTimeMs: null },

  createInitialState(_config, players: MatchPlayer[]): ChessState {
    const chess = new Chess();
    return {
      fen: chess.fen(),
      pgn: "",
      players: { white: players[0].id, black: players[1].id },
      moveHistory: [],
      lastMove: null,
      isCheck: false,
    };
  },

  validateMove(state, playerId, move): string | null {
    const chess = new Chess(state.fen);
    const currentColor = chess.turn() === "w" ? "white" : "black";

    if (state.players[currentColor] !== playerId) {
      return "Not your turn";
    }

    try {
      const result = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      return result ? null : "Invalid move";
    } catch {
      return "Invalid move";
    }
  },

  applyMove(state, _playerId, move): ChessState {
    const chess = new Chess(state.fen);
    chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });

    return {
      fen: chess.fen(),
      pgn: chess.pgn(),
      players: state.players,
      moveHistory: [...state.moveHistory, `${move.from}${move.to}${move.promotion || ""}`],
      lastMove: { from: move.from, to: move.to },
      isCheck: chess.isCheck(),
    };
  },

  getActivePlayers(state): string[] {
    const chess = new Chess(state.fen);
    if (chess.isGameOver()) return [];
    const currentColor = chess.turn() === "w" ? "white" : "black";
    return [state.players[currentColor]];
  },

  getResult(state): GameResult | null {
    const chess = new Chess(state.fen);
    if (!chess.isGameOver()) return null;

    if (chess.isCheckmate()) {
      // The player whose turn it is has been checkmated (they lost)
      const loserColor = chess.turn() === "w" ? "white" : "black";
      const winnerColor = loserColor === "white" ? "black" : "white";
      return {
        winnerId: state.players[winnerColor],
        reason: "checkmate",
        scores: {
          [state.players[winnerColor]]: 1,
          [state.players[loserColor]]: 0,
        },
        finalState: state,
      };
    }

    // All other game-over conditions are draws
    let reason = "draw";
    if (chess.isStalemate()) reason = "stalemate";
    else if (chess.isThreefoldRepetition()) reason = "threefold_repetition";
    else if (chess.isInsufficientMaterial()) reason = "insufficient_material";
    else if (chess.isDraw()) reason = "fifty_move_rule";

    return {
      winnerId: null,
      reason,
      scores: {
        [state.players.white]: 0.5,
        [state.players.black]: 0.5,
      },
      finalState: state,
    };
  },

  getVisibleState(state, _playerId): ChessPublicState {
    return state; // Chess is a full-information game
  },

  moveSchema: z.object({
    from: z.string().min(2).max(2),
    to: z.string().min(2).max(2),
    promotion: z.enum(["q", "r", "b", "n"]).optional(),
  }),

  configSchema: z.object({}),
};
