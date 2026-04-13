import { z } from "zod";
import type { GameResult, MatchPlayer } from "@agent-arcade/shared";
import type { GameDefinition } from "../../types";

const ROWS = 6;
const COLS = 7;
const WIN_LENGTH = 4;

/** 0 = empty, 1 = player at seat 0, 2 = player at seat 1 */
type Cell = 0 | 1 | 2;

export interface Connect4State {
  board: Cell[][];
  players: [string, string]; // [seat0Id, seat1Id]
  currentPlayerIndex: 0 | 1;
  moveHistory: number[]; // columns played
  lastMove: { row: number; col: number } | null;
}

export interface Connect4Move {
  column: number;
}

export type Connect4Config = Record<string, never>;

export type Connect4PublicState = Connect4State; // full information game

function createEmptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
}

function getDropRow(board: Cell[][], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) return row;
  }
  return -1; // column is full
}

function checkWin(
  board: Cell[][],
  row: number,
  col: number,
  player: Cell,
): boolean {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    let count = 1;
    // Check forward
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player)
        break;
      count++;
    }
    // Check backward
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player)
        break;
      count++;
    }
    if (count >= WIN_LENGTH) return true;
  }
  return false;
}

function isBoardFull(board: Cell[][]): boolean {
  return board[0].every((cell) => cell !== 0);
}

export const connect4Game: GameDefinition<
  Connect4State,
  Connect4Move,
  Connect4Config,
  Connect4PublicState
> = {
  slug: "connect4",
  name: "Connect 4",
  minPlayers: 2,
  maxPlayers: 2,
  turnBased: true,
  defaultTimeControl: { moveTimeoutMs: 30_000, totalTimeMs: null },

  createInitialState(_config, players: MatchPlayer[]): Connect4State {
    return {
      board: createEmptyBoard(),
      players: [players[0].id, players[1].id],
      currentPlayerIndex: 0,
      moveHistory: [],
      lastMove: null,
    };
  },

  validateMove(state, playerId, move): string | null {
    if (state.players[state.currentPlayerIndex] !== playerId) {
      return "Not your turn";
    }
    if (move.column < 0 || move.column >= COLS) {
      return `Column must be between 0 and ${COLS - 1}`;
    }
    if (!Number.isInteger(move.column)) {
      return "Column must be an integer";
    }
    if (getDropRow(state.board, move.column) === -1) {
      return "Column is full";
    }
    return null;
  },

  applyMove(state, _playerId, move): Connect4State {
    const newBoard = state.board.map((row) => [...row]) as Cell[][];
    const row = getDropRow(newBoard, move.column);
    const playerCell = (state.currentPlayerIndex + 1) as Cell;
    newBoard[row][move.column] = playerCell;

    return {
      board: newBoard,
      players: state.players,
      currentPlayerIndex: (state.currentPlayerIndex === 0 ? 1 : 0) as 0 | 1,
      moveHistory: [...state.moveHistory, move.column],
      lastMove: { row, col: move.column },
    };
  },

  getActivePlayers(state): string[] {
    return [state.players[state.currentPlayerIndex]];
  },

  getResult(state): GameResult | null {
    if (!state.lastMove) return null;

    const { row, col } = state.lastMove;
    const playerCell = state.board[row][col];
    // The player who just moved is the opposite of currentPlayerIndex
    const lastPlayerIndex = state.currentPlayerIndex === 0 ? 1 : 0;

    if (checkWin(state.board, row, col, playerCell)) {
      const winnerId = state.players[lastPlayerIndex];
      const loserId = state.players[state.currentPlayerIndex];
      return {
        winnerId,
        reason: "four_in_a_row",
        scores: { [winnerId]: 1, [loserId]: 0 },
        finalState: state,
      };
    }

    if (isBoardFull(state.board)) {
      return {
        winnerId: null,
        reason: "draw",
        scores: { [state.players[0]]: 0.5, [state.players[1]]: 0.5 },
        finalState: state,
      };
    }

    return null;
  },

  getVisibleState(state, _playerId): Connect4PublicState {
    return state; // Connect4 is a full-information game
  },

  moveSchema: z.object({
    column: z.number().int().min(0).max(COLS - 1),
  }),

  configSchema: z.object({}),
};
