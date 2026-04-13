"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";

interface Market {
  matchId: string;
  gameSlug: string;
  playerA: { id: string; name: string };
  playerB: { id: string; name: string };
  poolA: number;
  poolB: number;
  poolDraw: number;
  drawAllowed: boolean;
  status: string;
  result: string | null;
  betCount: number;
  odds: { oddsA: number; oddsB: number; oddsDraw: number };
}

interface BetRecord {
  id: string;
  matchId: string;
  outcome: string;
  amount: number;
  payout: number | null;
  status: string;
  createdAt: number;
}

export default function BettingPage() {
  const { user, isAuthenticated } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [settledMarkets, setSettledMarkets] = useState<Market[]>([]);
  const [myBets, setMyBets] = useState<BetRecord[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(50);
  const [placingBet, setPlacingBet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const params = user ? `?userId=${user.id}` : "";
    const res = await fetch(`/api/betting${params}`);
    const data = await res.json();
    setMarkets(data.activeMarkets || []);
    setSettledMarkets(data.recentSettled || []);
    if (data.balance !== null) setBalance(data.balance);

    if (user) {
      const betsRes = await fetch(`/api/betting/my-bets?userId=${user.id}`);
      const betsData = await betsRes.json();
      setMyBets(betsData.bets || []);
      setBalance(betsData.balance);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const placeBet = async (matchId: string, outcome: string) => {
    if (!user) return;
    setPlacingBet(matchId);
    setError(null);

    try {
      const res = await fetch("/api/betting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          userId: user.id,
          userName: user.name,
          outcome,
          amount: betAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setBalance(data.balance);
        fetchData();
      }
    } catch {
      setError("Failed to place bet");
    } finally {
      setPlacingBet(null);
    }
  };

  const totalWinnings = myBets
    .filter((b) => b.status === "won")
    .reduce((sum, b) => sum + (b.payout || 0), 0);

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-3">Betting</h1>
            <p className="text-zinc-500">
              Bet on arena matches. Parimutuel pools — odds shift in real-time.
            </p>
          </div>
          {isAuthenticated && balance !== null && (
            <div className="rounded-xl border border-cyan-glow/20 bg-cyan-glow/5 px-5 py-3 text-right">
              <div className="text-xs text-zinc-500">Your Balance</div>
              <div className="text-xl font-bold font-mono text-cyan-glow">
                {balance.toFixed(0)} credits
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div className="text-xs text-zinc-600 mb-1">Active Markets</div>
            <div className="text-2xl font-bold font-mono text-cyan-glow">{markets.length}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div className="text-xs text-zinc-600 mb-1">Your Bets</div>
            <div className="text-2xl font-bold font-mono text-purple-glow">{myBets.length}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div className="text-xs text-zinc-600 mb-1">Total Winnings</div>
            <div className="text-2xl font-bold font-mono text-emerald-glow">
              {totalWinnings.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Bet amount selector */}
        {isAuthenticated && (
          <div className="mb-6 flex items-center gap-3">
            <span className="text-xs text-zinc-500">Bet amount:</span>
            {[10, 25, 50, 100, 250].map((amt) => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${
                  betAmount === amt
                    ? "bg-cyan-glow/10 border border-cyan-glow/30 text-cyan-glow"
                    : "bg-white/5 border border-white/5 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {/* Active Markets */}
        <h2 className="text-lg font-semibold mb-4">
          Active Markets
          {markets.length === 0 && (
            <span className="text-sm text-zinc-600 font-normal ml-2">
              — Start the <Link href="/live" className="text-cyan-glow hover:underline">arena</Link> to create markets
            </span>
          )}
        </h2>
        <div className="space-y-4 mb-12">
          {markets.map((market) => {
            const totalPool = market.poolA + market.poolB + market.poolDraw;
            const alreadyBet = myBets.some((b) => b.matchId === market.matchId);

            return (
              <div
                key={market.matchId}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-600">{market.gameSlug}</span>
                    <span className="text-zinc-700">|</span>
                    <span className="text-xs text-zinc-500">{market.betCount} bets</span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-cyan-glow">
                    {totalPool.toFixed(0)} credits in pool
                  </span>
                </div>

                <div className={`grid ${market.drawAllowed ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
                  <button
                    onClick={() => placeBet(market.matchId, "playerA")}
                    disabled={!isAuthenticated || alreadyBet || placingBet === market.matchId}
                    className="rounded-xl border border-cyan-glow/20 bg-cyan-glow/5 p-4 text-left hover:bg-cyan-glow/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="text-sm font-semibold mb-1">{market.playerA.name}</div>
                    <div className="text-2xl font-bold font-mono text-cyan-glow">
                      {market.odds.oddsA > 0 ? `${market.odds.oddsA}x` : "—"}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1">{market.poolA.toFixed(0)} credits</div>
                  </button>
                  <button
                    onClick={() => placeBet(market.matchId, "playerB")}
                    disabled={!isAuthenticated || alreadyBet || placingBet === market.matchId}
                    className="rounded-xl border border-purple-glow/20 bg-purple-glow/5 p-4 text-left hover:bg-purple-glow/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="text-sm font-semibold mb-1">{market.playerB.name}</div>
                    <div className="text-2xl font-bold font-mono text-purple-glow">
                      {market.odds.oddsB > 0 ? `${market.odds.oddsB}x` : "—"}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1">{market.poolB.toFixed(0)} credits</div>
                  </button>
                  {market.drawAllowed && (
                    <button
                      onClick={() => placeBet(market.matchId, "draw")}
                      disabled={!isAuthenticated || alreadyBet || placingBet === market.matchId}
                      className="rounded-xl border border-zinc-700/30 bg-white/[0.02] p-4 text-left hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="text-sm font-semibold mb-1">Draw</div>
                      <div className="text-2xl font-bold font-mono text-zinc-400">
                        {market.odds.oddsDraw > 0 ? `${market.odds.oddsDraw}x` : "—"}
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-1">{market.poolDraw.toFixed(0)} credits</div>
                    </button>
                  )}
                </div>

                {alreadyBet && (
                  <div className="mt-3 text-xs text-zinc-600 text-center">
                    You already have a bet on this match
                  </div>
                )}
                {!isAuthenticated && (
                  <div className="mt-3 text-xs text-zinc-600 text-center">
                    <Link href="/login" className="text-cyan-glow hover:underline">Sign in</Link> to place bets
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* My Bets */}
        {myBets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold mb-4">My Bets</h2>
            <div className="rounded-2xl border border-white/5 overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-4 px-6 py-3 text-xs text-zinc-600 uppercase tracking-wider font-mono border-b border-white/5 bg-white/[0.02]">
                <span>Match</span>
                <span>Backed</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Payout</span>
              </div>
              {myBets.slice(0, 10).map((bet) => (
                <div
                  key={bet.id}
                  className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-4 px-6 py-3 border-b border-white/[0.03] text-sm items-center"
                >
                  <span className="font-mono text-xs text-zinc-500">{bet.matchId.slice(0, 8)}...</span>
                  <span className="text-xs text-zinc-400 capitalize">{bet.outcome}</span>
                  <span className="font-mono text-zinc-300">{bet.amount}</span>
                  <span className={`text-xs font-medium ${
                    bet.status === "won" ? "text-emerald-glow"
                    : bet.status === "lost" ? "text-red-500"
                    : "text-zinc-500"
                  }`}>
                    {bet.status}
                  </span>
                  <span className="font-mono text-zinc-400">
                    {bet.payout !== null ? bet.payout.toFixed(0) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
          <h3 className="text-lg font-semibold mb-4">How Betting Works</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-zinc-500">
            <div>
              <span className="text-cyan-glow font-mono text-xs block mb-2">01 — Get Credits</span>
              Every account starts with 1,000 credits. Real crypto (USDC on Base L2) coming soon.
            </div>
            <div>
              <span className="text-purple-glow font-mono text-xs block mb-2">02 — Pick a Side</span>
              Bet on the arena match while it&apos;s live. Odds shift based on the pool ratio.
            </div>
            <div>
              <span className="text-emerald-glow font-mono text-xs block mb-2">03 — Collect</span>
              Winners split the pool proportionally. 2.5% platform fee. Payouts are instant.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
