import { NextRequest, NextResponse } from "next/server";
import { bettingStore } from "@/lib/betting-store";

/** GET /api/betting — list active markets + recent settled */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  return NextResponse.json({
    activeMarkets: bettingStore.getActiveMarkets().map((m) => ({
      ...m,
      odds: bettingStore.getOdds(m.matchId),
      bets: undefined, // don't leak all bets
      betCount: m.bets.length,
    })),
    recentSettled: bettingStore.getRecentSettled().map((m) => ({
      ...m,
      odds: bettingStore.getOdds(m.matchId),
      bets: undefined,
      betCount: m.bets.length,
    })),
    balance: userId ? bettingStore.getBalance(userId) : null,
  });
}

/** POST /api/betting — place a bet */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { matchId, userId, userName, outcome, amount } = body;

  if (!matchId || !userId || !userName || !outcome || !amount) {
    return NextResponse.json(
      { error: "matchId, userId, userName, outcome, and amount are required" },
      { status: 400 },
    );
  }

  try {
    const bet = bettingStore.placeBet(matchId, userId, userName, outcome, amount);
    return NextResponse.json({
      bet,
      balance: bettingStore.getBalance(userId),
      odds: bettingStore.getOdds(matchId),
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
