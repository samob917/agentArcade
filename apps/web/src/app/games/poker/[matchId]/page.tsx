"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface Card {
  rank: string;
  suit: string;
}

interface PlayerState {
  id: string;
  chips: number;
  currentBet: number;
  folded: boolean;
  allIn: boolean;
  holeCards: Card[] | null;
}

interface PokerPublicState {
  players: PlayerState[];
  communityCards: Card[];
  pot: number;
  phase: string;
  currentPlayerIndex: number;
  dealerIndex: number;
  minBet: number;
}

interface MatchData {
  matchId: string;
  players: { id: string; seat: number; displayName: string; isHuman: boolean }[];
  state: PokerPublicState;
  activePlayers: string[];
  result: { winnerId: string | null; reason: string } | null;
  status: string;
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠",
};
const SUIT_COLORS: Record<string, string> = {
  hearts: "text-red-500", diamonds: "text-red-400", clubs: "text-white", spades: "text-white",
};

function CardDisplay({ card }: { card: Card }) {
  return (
    <div className={`inline-flex flex-col items-center justify-center w-12 h-16 rounded-lg bg-white text-black font-bold text-sm border border-zinc-300 ${SUIT_COLORS[card.suit]}`}>
      <span className="text-xs font-bold text-black">{card.rank}</span>
      <span className="text-lg leading-none">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

function HiddenCard() {
  return (
    <div className="inline-flex items-center justify-center w-12 h-16 rounded-lg bg-gradient-to-br from-blue-800 to-blue-950 border border-blue-700 text-blue-500 text-lg">
      ?
    </div>
  );
}

export default function PokerMatchPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const [match, setMatch] = useState<MatchData | null>(null);
  const [humanPlayerId, setHumanPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem(`match-${matchId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setHumanPlayerId(parsed.humanPlayerId);
    }
  }, [matchId]);

  const fetchMatch = useCallback(async () => {
    const pid = humanPlayerId || "";
    const res = await fetch(`/api/matches/${matchId}?playerId=${pid}`);
    if (res.ok) setMatch(await res.json());
  }, [matchId, humanPlayerId]);

  useEffect(() => {
    if (humanPlayerId) fetchMatch();
  }, [humanPlayerId, fetchMatch]);

  const submitAction = async (action: string, amount?: number) => {
    if (!humanPlayerId || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/matches/${matchId}/moves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: humanPlayerId,
          move: { action, ...(amount ? { amount } : {}) },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error);
      } else {
        setMatch((prev) =>
          prev
            ? { ...prev, state: data.state, activePlayers: data.activePlayers, result: data.result }
            : null,
        );
      }
    } catch {
      setError("Failed to submit action");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!match || !humanPlayerId) {
    return (
      <div className="bg-grid min-h-screen flex items-center justify-center">
        <div className="text-zinc-600 text-sm animate-pulse">Loading match...</div>
      </div>
    );
  }

  const state = match.state;
  const humanPlayer = state.players.find((p) => p.id === humanPlayerId)!;
  const aiPlayer = state.players.find((p) => p.id !== humanPlayerId)!;
  const humanInfo = match.players.find((p) => p.id === humanPlayerId)!;
  const aiInfo = match.players.find((p) => p.id !== humanPlayerId)!;
  const isMyTurn = match.activePlayers.includes(humanPlayerId);
  const toCall = aiPlayer.currentBet - humanPlayer.currentBet;
  const minRaise = state.minBet;

  const resultMsg = match.result
    ? match.result.winnerId === humanPlayerId
      ? `You win! (${match.result.reason})`
      : match.result.winnerId === null
        ? "Split pot!"
        : `You lose — ${match.result.reason}`
    : null;

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <a href="/games/poker" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">← Back</a>
            <h1 className="text-2xl font-bold mt-1">Texas Hold&apos;em</h1>
          </div>
          <span className="text-xs font-mono text-zinc-700">{state.phase}</span>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-emerald-glow/20 bg-gradient-to-b from-emerald-950/30 to-zinc-950 p-8">
          {/* AI Player (top) */}
          <div className="text-center mb-6">
            <div className="text-sm font-semibold text-zinc-400 mb-2">
              {aiInfo.displayName} — {aiPlayer.chips} chips
              {aiPlayer.folded && <span className="text-red-500 ml-2">FOLDED</span>}
            </div>
            <div className="flex justify-center gap-2">
              {aiPlayer.holeCards
                ? aiPlayer.holeCards.map((c, i) => <CardDisplay key={i} card={c} />)
                : [0, 1].map((i) => <HiddenCard key={i} />)}
            </div>
            {aiPlayer.currentBet > 0 && (
              <div className="mt-2 text-xs font-mono text-zinc-500">Bet: {aiPlayer.currentBet}</div>
            )}
          </div>

          {/* Community Cards + Pot */}
          <div className="text-center my-8">
            <div className="mb-3">
              <span className="text-xs text-zinc-600 font-mono">POT</span>
              <div className="text-2xl font-bold font-mono text-emerald-glow">{state.pot}</div>
            </div>
            <div className="flex justify-center gap-2 min-h-[64px] items-center">
              {state.communityCards.length > 0
                ? state.communityCards.map((c, i) => <CardDisplay key={i} card={c} />)
                : <span className="text-zinc-700 text-sm">Waiting for flop...</span>}
            </div>
          </div>

          {/* Human Player (bottom) */}
          <div className="text-center mt-6">
            {humanPlayer.currentBet > 0 && (
              <div className="mb-2 text-xs font-mono text-zinc-500">Bet: {humanPlayer.currentBet}</div>
            )}
            <div className="flex justify-center gap-2 mb-2">
              {humanPlayer.holeCards
                ? humanPlayer.holeCards.map((c, i) => <CardDisplay key={i} card={c} />)
                : [0, 1].map((i) => <HiddenCard key={i} />)}
            </div>
            <div className="text-sm font-semibold mb-1">
              {humanInfo.displayName} — {humanPlayer.chips} chips
              {humanPlayer.folded && <span className="text-red-500 ml-2">FOLDED</span>}
            </div>
          </div>
        </div>

        {/* Result */}
        {resultMsg && (
          <div className={`mt-6 text-center text-lg font-bold ${
            match.result?.winnerId === humanPlayerId ? "text-emerald-glow" : "text-red-500"
          }`}>
            {resultMsg}
            <div className="mt-4">
              <a href="/games/poker" className="rounded-xl bg-emerald-glow/20 border border-emerald-glow/30 px-6 py-2.5 text-sm font-semibold text-emerald-glow hover:bg-emerald-glow/30 transition-all">
                Play Again
              </a>
            </div>
          </div>
        )}

        {/* Actions */}
        {isMyTurn && !match.result && (
          <div className="mt-6 space-y-3">
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => submitAction("fold")}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
              >
                Fold
              </button>
              {toCall <= 0 ? (
                <button
                  onClick={() => submitAction("check")}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  Check
                </button>
              ) : (
                <button
                  onClick={() => submitAction("call")}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-cyan-glow/20 bg-cyan-glow/5 px-4 py-3 text-sm font-semibold text-cyan-glow hover:bg-cyan-glow/10 transition-all disabled:opacity-50"
                >
                  Call {toCall}
                </button>
              )}
              <div className="flex-1 flex gap-2">
                <input
                  type="number"
                  value={raiseAmount || ""}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  placeholder={`Min ${minRaise}`}
                  className="w-20 rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-zinc-200 font-mono focus:outline-none focus:border-emerald-glow/30"
                />
                <button
                  onClick={() => submitAction("raise", raiseAmount || minRaise)}
                  disabled={isSubmitting || (raiseAmount > 0 && raiseAmount < minRaise)}
                  className="flex-1 rounded-xl border border-emerald-glow/20 bg-emerald-glow/5 px-4 py-3 text-sm font-semibold text-emerald-glow hover:bg-emerald-glow/10 transition-all disabled:opacity-50"
                >
                  Raise
                </button>
              </div>
            </div>
          </div>
        )}

        {!isMyTurn && !match.result && (
          <div className="mt-6 text-center text-sm text-zinc-500 animate-pulse">
            Waiting for opponent...
          </div>
        )}
      </div>
    </div>
  );
}
