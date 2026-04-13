import { Chess } from "chess.js";
import type { ChessState } from "../games/chess";

export type ChessDifficulty = "random" | "easy" | "medium" | "hard";

// Piece values for evaluation
const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 0,
};

// Piece-square tables for positional evaluation (from white's perspective)
const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const PST: Record<string, number[]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
};

function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate()) return 0;

  let score = 0;
  const board = chess.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const value = PIECE_VALUES[piece.type] || 0;
      const pstBonus = PST[piece.type]
        ? piece.color === "w"
          ? PST[piece.type][row * 8 + col]
          : PST[piece.type][(7 - row) * 8 + col]
        : 0;

      if (piece.color === "w") {
        score += value + pstBonus;
      } else {
        score -= value + pstBonus;
      }
    }
  }

  // Bonus for mobility
  const moves = chess.moves().length;
  score += chess.turn() === "w" ? moves * 2 : -moves * 2;

  return score;
}

function minimaxChess(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = chess.moves();

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimaxChess(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimaxChess(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

const DEPTH_MAP: Record<ChessDifficulty, number> = {
  random: 0,
  easy: 1,
  medium: 2,
  hard: 3,
};

export function getChessAiMove(
  state: ChessState,
  difficulty: ChessDifficulty,
): { from: string; to: string; promotion?: string } {
  const chess = new Chess(state.fen);
  const moves = chess.moves({ verbose: true });

  if (moves.length === 0) throw new Error("No legal moves");

  // Random: just pick any legal move
  if (difficulty === "random") {
    const move = moves[Math.floor(Math.random() * moves.length)];
    return { from: move.from, to: move.to, promotion: move.promotion };
  }

  const depth = DEPTH_MAP[difficulty];
  const isWhite = chess.turn() === "w";
  let bestMove = moves[0];
  let bestScore = isWhite ? -Infinity : Infinity;

  // Shuffle moves for variety when scores are equal
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const move of shuffled) {
    chess.move(move);
    const score = minimaxChess(
      chess,
      depth - 1,
      -Infinity,
      Infinity,
      !isWhite,
    );
    chess.undo();

    if (isWhite ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return {
    from: bestMove.from,
    to: bestMove.to,
    promotion: bestMove.promotion,
  };
}
