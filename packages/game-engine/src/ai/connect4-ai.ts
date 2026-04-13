import type { Connect4State } from "../games/connect4";

const ROWS = 6;
const COLS = 7;
const WIN_LENGTH = 4;

type Cell = 0 | 1 | 2;

function getDropRow(board: Cell[][], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) return row;
  }
  return -1;
}

function getValidColumns(board: Cell[][]): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === 0) cols.push(c);
  }
  return cols;
}

function checkWin(board: Cell[][], row: number, col: number, player: Cell): boolean {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
      count++;
    }
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row - dr * i, c = col - dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
      count++;
    }
    if (count >= WIN_LENGTH) return true;
  }
  return false;
}

function evaluateWindow(window: Cell[], player: Cell): number {
  const opponent: Cell = player === 1 ? 2 : 1;
  const playerCount = window.filter((c) => c === player).length;
  const opponentCount = window.filter((c) => c === opponent).length;
  const emptyCount = window.filter((c) => c === 0).length;

  if (playerCount === 4) return 100;
  if (playerCount === 3 && emptyCount === 1) return 5;
  if (playerCount === 2 && emptyCount === 2) return 2;
  if (opponentCount === 3 && emptyCount === 1) return -4;
  return 0;
}

function scorePosition(board: Cell[][], player: Cell): number {
  let score = 0;

  // Prefer center column
  const centerCol = Math.floor(COLS / 2);
  const centerCount = board.reduce((acc, row) => acc + (row[centerCol] === player ? 1 : 0), 0);
  score += centerCount * 3;

  // Horizontal windows
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      const window = board[r].slice(c, c + WIN_LENGTH) as Cell[];
      score += evaluateWindow(window, player);
    }
  }
  // Vertical windows
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
      const window = Array.from({ length: WIN_LENGTH }, (_, i) => board[r + i][c]) as Cell[];
      score += evaluateWindow(window, player);
    }
  }
  // Diagonal windows
  for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      const window1 = Array.from({ length: WIN_LENGTH }, (_, i) => board[r + i][c + i]) as Cell[];
      score += evaluateWindow(window1, player);
      const window2 = Array.from({ length: WIN_LENGTH }, (_, i) => board[r + WIN_LENGTH - 1 - i][c + i]) as Cell[];
      score += evaluateWindow(window2, player);
    }
  }

  return score;
}

function isBoardFull(board: Cell[][]): boolean {
  return board[0].every((c) => c !== 0);
}

function minimax(
  board: Cell[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Cell,
): [number, number | null] {
  const opponent: Cell = aiPlayer === 1 ? 2 : 1;
  const validCols = getValidColumns(board);

  // Check terminal states
  for (const col of validCols) {
    const row = getDropRow(board, col);
    if (row >= 0) {
      // Check if last move was a win for either player
    }
  }

  if (isBoardFull(board)) return [0, null];
  if (depth === 0) return [scorePosition(board, aiPlayer), null];

  if (maximizing) {
    let maxScore = -Infinity;
    let bestCol = validCols[Math.floor(Math.random() * validCols.length)];

    for (const col of validCols) {
      const row = getDropRow(board, col);
      if (row < 0) continue;

      const newBoard = board.map((r) => [...r]) as Cell[][];
      newBoard[row][col] = aiPlayer;

      if (checkWin(newBoard, row, col, aiPlayer)) return [10000 + depth, col];

      const [score] = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer);
      if (score > maxScore) {
        maxScore = score;
        bestCol = col;
      }
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return [maxScore, bestCol];
  } else {
    let minScore = Infinity;
    let bestCol = validCols[Math.floor(Math.random() * validCols.length)];

    for (const col of validCols) {
      const row = getDropRow(board, col);
      if (row < 0) continue;

      const newBoard = board.map((r) => [...r]) as Cell[][];
      newBoard[row][col] = opponent;

      if (checkWin(newBoard, row, col, opponent)) return [-10000 - depth, col];

      const [score] = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer);
      if (score < minScore) {
        minScore = score;
        bestCol = col;
      }
      beta = Math.min(beta, score);
      if (alpha >= beta) break;
    }
    return [minScore, bestCol];
  }
}

export type Connect4Difficulty = "random" | "easy" | "medium" | "hard";

const DEPTH_MAP: Record<Connect4Difficulty, number> = {
  random: 0,
  easy: 2,
  medium: 4,
  hard: 7,
};

export function getConnect4AiMove(
  state: Connect4State,
  difficulty: Connect4Difficulty,
): { column: number } {
  const validCols = getValidColumns(state.board as Cell[][]);
  if (validCols.length === 0) throw new Error("No valid moves");

  if (difficulty === "random") {
    return { column: validCols[Math.floor(Math.random() * validCols.length)] };
  }

  const aiCell = (state.currentPlayerIndex + 1) as Cell;
  const depth = DEPTH_MAP[difficulty];

  // Check for immediate win first
  for (const col of validCols) {
    const row = getDropRow(state.board as Cell[][], col);
    if (row < 0) continue;
    const testBoard = state.board.map((r) => [...r]) as Cell[][];
    testBoard[row][col] = aiCell;
    if (checkWin(testBoard, row, col, aiCell)) {
      return { column: col };
    }
  }

  // Check for immediate block
  const opponentCell: Cell = aiCell === 1 ? 2 : 1;
  for (const col of validCols) {
    const row = getDropRow(state.board as Cell[][], col);
    if (row < 0) continue;
    const testBoard = state.board.map((r) => [...r]) as Cell[][];
    testBoard[row][col] = opponentCell;
    if (checkWin(testBoard, row, col, opponentCell)) {
      return { column: col };
    }
  }

  const [, bestCol] = minimax(
    state.board as Cell[][],
    depth,
    -Infinity,
    Infinity,
    true,
    aiCell,
  );

  return { column: bestCol ?? validCols[Math.floor(Math.random() * validCols.length)] };
}
