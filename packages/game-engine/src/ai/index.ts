export { getConnect4AiMove, type Connect4Difficulty } from "./connect4-ai";
export { getChessAiMove, type ChessDifficulty } from "./chess-ai";
export { getPokerAiMove } from "./poker-ai";

export type AiDifficulty = "random" | "easy" | "medium" | "hard";

export const DIFFICULTY_LABELS: Record<AiDifficulty, { name: string; elo: number }> = {
  random: { name: "Random", elo: 400 },
  easy: { name: "Easy", elo: 800 },
  medium: { name: "Medium", elo: 1200 },
  hard: { name: "Hard", elo: 1800 },
};
