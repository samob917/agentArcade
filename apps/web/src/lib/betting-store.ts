/**
 * Off-chain betting engine that mirrors the BettingPool contract logic.
 * Used for development — connect to real contract when deployed.
 */

export interface BettingMarket {
  matchId: string;
  gameSlug: string;
  playerA: { id: string; name: string };
  playerB: { id: string; name: string };
  poolA: number; // total bet on A
  poolB: number; // total bet on B
  poolDraw: number;
  drawAllowed: boolean;
  status: "open" | "locked" | "settled" | "cancelled";
  result: "playerA" | "playerB" | "draw" | null;
  bets: BetRecord[];
  createdAt: number;
}

export interface BetRecord {
  id: string;
  userId: string;
  userName: string;
  matchId: string;
  outcome: "playerA" | "playerB" | "draw";
  amount: number; // in "credits" (dev currency)
  payout: number | null;
  status: "active" | "won" | "lost" | "refunded";
  createdAt: number;
}

const PLATFORM_FEE = 0.025; // 2.5%

class BettingStore {
  private markets = new Map<string, BettingMarket>();
  private userBalances = new Map<string, number>();

  /** Get or create a user balance (start with 1000 credits) */
  getBalance(userId: string): number {
    if (!this.userBalances.has(userId)) {
      this.userBalances.set(userId, 1000);
    }
    return this.userBalances.get(userId)!;
  }

  createMarket(input: {
    matchId: string;
    gameSlug: string;
    playerA: { id: string; name: string };
    playerB: { id: string; name: string };
    drawAllowed: boolean;
  }): BettingMarket {
    const market: BettingMarket = {
      ...input,
      poolA: 0,
      poolB: 0,
      poolDraw: 0,
      status: "open",
      result: null,
      bets: [],
      createdAt: Date.now(),
    };
    this.markets.set(input.matchId, market);
    return market;
  }

  placeBet(
    matchId: string,
    userId: string,
    userName: string,
    outcome: "playerA" | "playerB" | "draw",
    amount: number,
  ): BetRecord {
    const market = this.markets.get(matchId);
    if (!market) throw new Error("Market not found");
    if (market.status !== "open") throw new Error("Market is closed");
    if (amount <= 0) throw new Error("Invalid amount");
    if (outcome === "draw" && !market.drawAllowed) throw new Error("Draw bets not allowed");

    // Check duplicate
    if (market.bets.some((b) => b.userId === userId)) {
      throw new Error("Already bet on this match");
    }

    const balance = this.getBalance(userId);
    if (balance < amount) throw new Error("Insufficient balance");

    // Deduct balance
    this.userBalances.set(userId, balance - amount);

    // Create bet
    const bet: BetRecord = {
      id: crypto.randomUUID(),
      userId,
      userName,
      matchId,
      outcome,
      amount,
      payout: null,
      status: "active",
      createdAt: Date.now(),
    };

    market.bets.push(bet);

    if (outcome === "playerA") market.poolA += amount;
    else if (outcome === "playerB") market.poolB += amount;
    else market.poolDraw += amount;

    return bet;
  }

  settleMarket(matchId: string, result: "playerA" | "playerB" | "draw"): void {
    const market = this.markets.get(matchId);
    if (!market) return;

    market.result = result;
    market.status = "settled";

    const totalPool = market.poolA + market.poolB + market.poolDraw;
    const winningPool =
      result === "playerA" ? market.poolA
      : result === "playerB" ? market.poolB
      : market.poolDraw;

    for (const bet of market.bets) {
      if (bet.outcome === result && winningPool > 0) {
        const grossPayout = (bet.amount / winningPool) * totalPool;
        const fee = grossPayout * PLATFORM_FEE;
        bet.payout = grossPayout - fee;
        bet.status = "won";
        // Credit the winner
        const current = this.getBalance(bet.userId);
        this.userBalances.set(bet.userId, current + bet.payout);
      } else {
        bet.payout = 0;
        bet.status = "lost";
      }
    }
  }

  getMarket(matchId: string): BettingMarket | undefined {
    return this.markets.get(matchId);
  }

  getActiveMarkets(): BettingMarket[] {
    return Array.from(this.markets.values())
      .filter((m) => m.status === "open")
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getRecentSettled(): BettingMarket[] {
    return Array.from(this.markets.values())
      .filter((m) => m.status === "settled")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
  }

  getUserBets(userId: string): BetRecord[] {
    const bets: BetRecord[] = [];
    for (const market of this.markets.values()) {
      for (const bet of market.bets) {
        if (bet.userId === userId) bets.push(bet);
      }
    }
    return bets.sort((a, b) => b.createdAt - a.createdAt);
  }

  getOdds(matchId: string): { oddsA: number; oddsB: number; oddsDraw: number } {
    const market = this.markets.get(matchId);
    if (!market) return { oddsA: 0, oddsB: 0, oddsDraw: 0 };

    const total = market.poolA + market.poolB + market.poolDraw;
    if (total === 0) return { oddsA: 2, oddsB: 2, oddsDraw: 0 }; // default even odds

    return {
      oddsA: market.poolA > 0 ? Number(((total / market.poolA) * (1 - PLATFORM_FEE)).toFixed(2)) : 0,
      oddsB: market.poolB > 0 ? Number(((total / market.poolB) * (1 - PLATFORM_FEE)).toFixed(2)) : 0,
      oddsDraw: market.poolDraw > 0 ? Number(((total / market.poolDraw) * (1 - PLATFORM_FEE)).toFixed(2)) : 0,
    };
  }
}

export const bettingStore = new BettingStore();
