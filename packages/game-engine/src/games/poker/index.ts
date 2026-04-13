import { z } from "zod";
import type { GameResult, MatchPlayer } from "@agent-arcade/shared";
import type { GameDefinition } from "../../types";

// --- Card types ---

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

type Suit = (typeof SUITS)[number];
type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function cardToString(card: Card): string {
  const suitSymbols: Record<Suit, string> = {
    hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠",
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

// --- Hand evaluation (simplified) ---

function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank) + 2;
}

function evaluateHand(cards: Card[]): { score: number; name: string } {
  if (cards.length < 5) return { score: 0, name: "incomplete" };

  // Get best 5-card hand from available cards
  const combos = getCombinations(cards, 5);
  let bestScore = 0;
  let bestName = "high card";

  for (const hand of combos) {
    const { score, name } = evaluateFiveCards(hand);
    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  }

  return { score: bestScore, name: bestName };
}

function getCombinations(arr: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: Card[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = getCombinations(arr.slice(i + 1), k - 1);
    for (const combo of rest) {
      result.push([arr[i], ...combo]);
    }
  }
  return result;
}

function evaluateFiveCards(hand: Card[]): { score: number; name: string } {
  const ranks = hand.map((c) => rankValue(c.rank)).sort((a, b) => b - a);
  const suits = hand.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const isStraight = ranks.every((r, i) => i === 0 || ranks[i - 1] - r === 1)
    || (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2); // ace-low straight

  const rankCounts = new Map<number, number>();
  for (const r of ranks) rankCounts.set(r, (rankCounts.get(r) || 0) + 1);
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const highRank = ranks[0];

  // Score: category * 1M + kickers
  if (isFlush && isStraight && highRank === 14) return { score: 9_000_000 + highRank, name: "royal flush" };
  if (isFlush && isStraight) return { score: 8_000_000 + highRank, name: "straight flush" };
  if (counts[0] === 4) return { score: 7_000_000 + highRank, name: "four of a kind" };
  if (counts[0] === 3 && counts[1] === 2) return { score: 6_000_000 + highRank, name: "full house" };
  if (isFlush) return { score: 5_000_000 + highRank, name: "flush" };
  if (isStraight) return { score: 4_000_000 + highRank, name: "straight" };
  if (counts[0] === 3) return { score: 3_000_000 + highRank, name: "three of a kind" };
  if (counts[0] === 2 && counts[1] === 2) return { score: 2_000_000 + highRank, name: "two pair" };
  if (counts[0] === 2) return { score: 1_000_000 + highRank, name: "pair" };
  return { score: highRank, name: "high card" };
}

// --- Game state ---

type PokerPhase = "preflop" | "flop" | "turn" | "river" | "showdown";

export interface PokerState {
  players: {
    id: string;
    holeCards: Card[];
    chips: number;
    currentBet: number;
    folded: boolean;
    allIn: boolean;
  }[];
  communityCards: Card[];
  deck: Card[];
  pot: number;
  phase: PokerPhase;
  currentPlayerIndex: number;
  dealerIndex: number;
  lastRaiseAmount: number;
  minBet: number;
  actedThisRound: Set<string> | string[]; // serialized as array
  roundComplete: boolean;
}

export interface PokerMove {
  action: "fold" | "check" | "call" | "raise";
  amount?: number;
}

export interface PokerConfig {
  startingChips?: number;
  smallBlind?: number;
  bigBlind?: number;
}

export interface PokerPublicState {
  players: {
    id: string;
    chips: number;
    currentBet: number;
    folded: boolean;
    allIn: boolean;
    holeCards: Card[] | null; // null if hidden
  }[];
  communityCards: Card[];
  pot: number;
  phase: PokerPhase;
  currentPlayerIndex: number;
  dealerIndex: number;
  minBet: number;
}

function getActedSet(state: PokerState): Set<string> {
  if (state.actedThisRound instanceof Set) return state.actedThisRound;
  return new Set(state.actedThisRound as string[]);
}

export const pokerGame: GameDefinition<
  PokerState,
  PokerMove,
  PokerConfig,
  PokerPublicState
> = {
  slug: "poker",
  name: "Texas Hold'em",
  minPlayers: 2,
  maxPlayers: 2, // heads-up for now
  turnBased: true,
  defaultTimeControl: { moveTimeoutMs: 30_000, totalTimeMs: null },

  createInitialState(config, players: MatchPlayer[]): PokerState {
    const startingChips = config.startingChips || 1000;
    const smallBlind = config.smallBlind || 10;
    const bigBlind = config.bigBlind || 20;

    const deck = shuffleDeck(createDeck());

    const pokerPlayers = players.map((p) => ({
      id: p.id,
      holeCards: [] as Card[],
      chips: startingChips,
      currentBet: 0,
      folded: false,
      allIn: false,
    }));

    // Deal hole cards
    for (const p of pokerPlayers) {
      p.holeCards = [deck.pop()!, deck.pop()!];
    }

    // Post blinds (heads-up: dealer posts small blind, other posts big blind)
    const dealerIdx = 0;
    const bbIdx = 1;
    pokerPlayers[dealerIdx].chips -= smallBlind;
    pokerPlayers[dealerIdx].currentBet = smallBlind;
    pokerPlayers[bbIdx].chips -= bigBlind;
    pokerPlayers[bbIdx].currentBet = bigBlind;

    return {
      players: pokerPlayers,
      communityCards: [],
      deck,
      pot: smallBlind + bigBlind,
      phase: "preflop",
      currentPlayerIndex: dealerIdx, // dealer acts first preflop in heads-up
      dealerIndex: dealerIdx,
      lastRaiseAmount: bigBlind,
      minBet: bigBlind,
      actedThisRound: [],
      roundComplete: false,
    };
  },

  validateMove(state, playerId, move): string | null {
    const player = state.players[state.currentPlayerIndex];
    if (player.id !== playerId) return "Not your turn";
    if (player.folded) return "You have folded";

    const opponent = state.players[1 - state.currentPlayerIndex];
    const toCall = opponent.currentBet - player.currentBet;

    switch (move.action) {
      case "fold":
        return null;
      case "check":
        if (toCall > 0) return "Cannot check — must call or raise";
        return null;
      case "call":
        if (toCall <= 0) return "Nothing to call — use check";
        return null;
      case "raise":
        if (!move.amount || move.amount < state.minBet) {
          return `Raise must be at least ${state.minBet}`;
        }
        if (move.amount > player.chips) return "Not enough chips";
        return null;
      default:
        return "Invalid action";
    }
  },

  applyMove(state, _playerId, move): PokerState {
    const newState: PokerState = {
      ...state,
      players: state.players.map((p) => ({ ...p, holeCards: [...p.holeCards] })),
      communityCards: [...state.communityCards],
      deck: [...state.deck],
      actedThisRound: [...(state.actedThisRound instanceof Set ? Array.from(state.actedThisRound) : state.actedThisRound)],
    };

    const player = newState.players[newState.currentPlayerIndex];
    const opponent = newState.players[1 - newState.currentPlayerIndex];
    const acted = new Set(newState.actedThisRound as string[]);

    switch (move.action) {
      case "fold":
        player.folded = true;
        break;

      case "check":
        break;

      case "call": {
        const toCall = Math.min(opponent.currentBet - player.currentBet, player.chips);
        player.chips -= toCall;
        player.currentBet += toCall;
        newState.pot += toCall;
        if (player.chips === 0) player.allIn = true;
        break;
      }

      case "raise": {
        const raiseAmount = move.amount!;
        const totalBet = opponent.currentBet + raiseAmount;
        const additional = totalBet - player.currentBet;
        player.chips -= additional;
        player.currentBet = totalBet;
        newState.pot += additional;
        newState.lastRaiseAmount = raiseAmount;
        if (player.chips === 0) player.allIn = true;
        // Reset acted — opponent needs to act again
        acted.clear();
        break;
      }
    }

    acted.add(player.id);
    newState.actedThisRound = Array.from(acted);

    // Check if round is complete
    const activePlayers = newState.players.filter((p) => !p.folded);
    const allActed = activePlayers.every((p) => acted.has(p.id));
    const betsEqual = activePlayers.every((p) =>
      p.currentBet === activePlayers[0].currentBet || p.allIn,
    );

    if (player.folded || (allActed && betsEqual)) {
      // Advance phase
      if (player.folded || newState.phase === "river") {
        newState.phase = "showdown";
      } else {
        const nextPhases: Record<string, PokerPhase> = {
          preflop: "flop",
          flop: "turn",
          turn: "river",
        };
        newState.phase = nextPhases[newState.phase] || "showdown";

        // Deal community cards
        if (newState.phase === "flop") {
          newState.communityCards.push(newState.deck.pop()!, newState.deck.pop()!, newState.deck.pop()!);
        } else if (newState.phase === "turn" || newState.phase === "river") {
          newState.communityCards.push(newState.deck.pop()!);
        }

        // Reset bets for new round
        for (const p of newState.players) {
          p.currentBet = 0;
        }
        newState.actedThisRound = [];
        newState.lastRaiseAmount = newState.minBet;

        // In heads-up, dealer acts first postflop? Actually BB acts first postflop
        newState.currentPlayerIndex = 1 - newState.dealerIndex;
      }
    } else {
      // Next player
      newState.currentPlayerIndex = 1 - newState.currentPlayerIndex;
    }

    return newState;
  },

  getActivePlayers(state): string[] {
    if (state.phase === "showdown") return [];
    const activePlayers = state.players.filter((p) => !p.folded && !p.allIn);
    if (activePlayers.length <= 1) return [];
    return [state.players[state.currentPlayerIndex].id];
  },

  getResult(state): GameResult | null {
    const activePlayers = state.players.filter((p) => !p.folded);

    // Someone folded — other player wins
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      const loser = state.players.find((p) => p.folded)!;
      return {
        winnerId: winner.id,
        reason: "fold",
        scores: { [winner.id]: state.pot, [loser.id]: 0 },
        finalState: state,
      };
    }

    // Showdown
    if (state.phase === "showdown") {
      const hands = activePlayers.map((p) => ({
        player: p,
        eval: evaluateHand([...p.holeCards, ...state.communityCards]),
      }));

      hands.sort((a, b) => b.eval.score - a.eval.score);

      if (hands[0].eval.score > hands[1].eval.score) {
        return {
          winnerId: hands[0].player.id,
          reason: hands[0].eval.name,
          scores: { [hands[0].player.id]: state.pot, [hands[1].player.id]: 0 },
          finalState: state,
        };
      }

      // Tie — split pot
      return {
        winnerId: null,
        reason: "split pot",
        scores: {
          [hands[0].player.id]: state.pot / 2,
          [hands[1].player.id]: state.pot / 2,
        },
        finalState: state,
      };
    }

    return null;
  },

  getVisibleState(state, playerId): PokerPublicState {
    return {
      players: state.players.map((p) => ({
        id: p.id,
        chips: p.chips,
        currentBet: p.currentBet,
        folded: p.folded,
        allIn: p.allIn,
        // Only show hole cards to the player themselves, or at showdown
        holeCards:
          p.id === playerId || state.phase === "showdown"
            ? p.holeCards
            : null,
      })),
      communityCards: state.communityCards,
      pot: state.pot,
      phase: state.phase,
      currentPlayerIndex: state.currentPlayerIndex,
      dealerIndex: state.dealerIndex,
      minBet: state.minBet,
    };
  },

  moveSchema: z.object({
    action: z.enum(["fold", "check", "call", "raise"]),
    amount: z.number().positive().optional(),
  }),

  configSchema: z.object({
    startingChips: z.number().positive().optional(),
    smallBlind: z.number().positive().optional(),
    bigBlind: z.number().positive().optional(),
  }),
};

export { cardToString };
