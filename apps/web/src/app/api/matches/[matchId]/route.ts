import { NextRequest, NextResponse } from "next/server";
import { matchStore } from "@/lib/match-store";
import { ensureGamesRegistered } from "@/lib/register-games";

ensureGamesRegistered();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const playerId = request.nextUrl.searchParams.get("playerId");

  const match = matchStore.get(matchId);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const state = playerId
    ? match.orchestrator?.getVisibleState(playerId)
    : match.state;

  return NextResponse.json({
    matchId: match.id,
    gameSlug: match.gameSlug,
    players: match.players,
    status: match.status,
    state,
    turnNumber: match.turnNumber,
    activePlayers: match.orchestrator?.getActivePlayers() ?? [],
    result: match.result,
  });
}
