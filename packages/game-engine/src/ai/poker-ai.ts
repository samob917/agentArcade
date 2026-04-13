import type { PokerState, PokerMove } from "../games/poker";
import type { AiDifficulty } from "./index";

export function getPokerAiMove(
  state: PokerState,
  difficulty: AiDifficulty,
): PokerMove {
  const player = state.players[state.currentPlayerIndex];
  const opponent = state.players[1 - state.currentPlayerIndex];
  const toCall = opponent.currentBet - player.currentBet;

  if (difficulty === "random") {
    return randomStrategy(toCall, player.chips, state.minBet);
  }

  // Simple evaluation-based strategy
  const handStrength = evaluateHoleCards(player.holeCards as { rank: string; suit: string }[]);

  if (difficulty === "easy") {
    return easyStrategy(handStrength, toCall, player.chips, state.minBet);
  }

  // Medium/Hard: consider community cards and pot odds
  const potOdds = toCall > 0 ? toCall / (state.pot + toCall) : 0;

  return mediumStrategy(handStrength, toCall, potOdds, player.chips, state.minBet, difficulty === "hard");
}

function randomStrategy(toCall: number, chips: number, minBet: number): PokerMove {
  const r = Math.random();
  if (r < 0.1) return { action: "fold" };
  if (toCall <= 0) {
    if (r < 0.5) return { action: "check" };
    return { action: "raise", amount: Math.min(minBet, chips) };
  }
  if (r < 0.6) return { action: "call" };
  if (r < 0.8) return { action: "raise", amount: Math.min(minBet * 2, chips) };
  return { action: "fold" };
}

function evaluateHoleCards(cards: { rank: string; suit: string }[]): number {
  const RANK_VALUES: Record<string, number> = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
    "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
  };

  const r1 = RANK_VALUES[cards[0].rank] || 0;
  const r2 = RANK_VALUES[cards[1].rank] || 0;
  const suited = cards[0].suit === cards[1].suit;
  const pair = r1 === r2;

  let score = (r1 + r2) / 28; // normalize to 0-1

  if (pair) score += 0.3;
  if (suited) score += 0.1;
  if (Math.abs(r1 - r2) <= 2) score += 0.05; // connectors

  // Premium hands
  if (pair && r1 >= 10) score += 0.2;
  if (r1 >= 13 && r2 >= 13) score += 0.15;

  return Math.min(score, 1);
}

function easyStrategy(strength: number, toCall: number, chips: number, minBet: number): PokerMove {
  if (strength > 0.7) {
    return { action: "raise", amount: Math.min(minBet * 3, chips) };
  }
  if (strength > 0.4) {
    if (toCall <= 0) return { action: "check" };
    return { action: "call" };
  }
  if (toCall <= 0) return { action: "check" };
  if (toCall <= minBet) return { action: "call" };
  return { action: "fold" };
}

function mediumStrategy(
  strength: number,
  toCall: number,
  potOdds: number,
  chips: number,
  minBet: number,
  isHard: boolean,
): PokerMove {
  // Bluff sometimes on hard
  const bluffChance = isHard ? 0.15 : 0.05;

  if (strength > 0.8) {
    // Strong hand — raise big
    const raiseSize = Math.min(minBet * (isHard ? 4 : 3), chips);
    return { action: "raise", amount: raiseSize };
  }

  if (strength > 0.6) {
    if (toCall <= 0) {
      // Bet for value
      return Math.random() < 0.6
        ? { action: "raise", amount: Math.min(minBet * 2, chips) }
        : { action: "check" };
    }
    // Call if pot odds are right
    if (strength > potOdds + 0.1) return { action: "call" };
    return { action: "fold" };
  }

  if (strength > 0.35) {
    if (toCall <= 0) {
      // Occasional bet as semi-bluff
      return Math.random() < bluffChance
        ? { action: "raise", amount: Math.min(minBet * 2, chips) }
        : { action: "check" };
    }
    if (toCall <= minBet && strength > potOdds) return { action: "call" };
    return { action: "fold" };
  }

  // Weak hand
  if (toCall <= 0) {
    return Math.random() < bluffChance
      ? { action: "raise", amount: Math.min(minBet * 3, chips) }
      : { action: "check" };
  }
  return { action: "fold" };
}
