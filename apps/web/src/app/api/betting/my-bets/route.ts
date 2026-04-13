import { NextRequest, NextResponse } from "next/server";
import { bettingStore } from "@/lib/betting-store";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  return NextResponse.json({
    bets: bettingStore.getUserBets(userId),
    balance: bettingStore.getBalance(userId),
  });
}
