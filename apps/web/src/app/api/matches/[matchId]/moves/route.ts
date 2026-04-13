import { NextRequest, NextResponse } from "next/server";
import { matchStore } from "@/lib/match-store";
import { ensureGamesRegistered } from "@/lib/register-games";

ensureGamesRegistered();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const body = await request.json();
  const { playerId, move } = body;

  if (!playerId || move === undefined) {
    return NextResponse.json(
      { error: "playerId and move are required" },
      { status: 400 },
    );
  }

  const result = matchStore.submitMove(matchId, playerId, move);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  }

  const match = matchStore.get(matchId);

  // Return the latest state — may include AI's auto-response move
  return NextResponse.json({
    success: true,
    state: match?.orchestrator?.getVisibleState(playerId),
    turnNumber: match?.turnNumber,
    activePlayers: match?.orchestrator?.getActivePlayers() ?? [],
    result: match?.result ?? result.gameResult ?? null,
  });
}
