import { NextRequest, NextResponse } from "next/server";
import { matchStore } from "@/lib/match-store";
import { ensureGamesRegistered } from "@/lib/register-games";
import { gameRegistry } from "@agent-arcade/game-engine";
import { DIFFICULTY_LABELS, type AiDifficulty } from "@agent-arcade/game-engine";

ensureGamesRegistered();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const game = gameRegistry.get(slug);
  if (!game) {
    return NextResponse.json({ error: `Game "${slug}" not found` }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const mode = body.mode || "local"; // "local" | "ai"
  const player1Name = body.playerName || "Player 1";
  const difficulty: AiDifficulty = body.difficulty || "medium";

  const humanPlayer = {
    id: crypto.randomUUID(),
    seat: 0,
    isHuman: true,
    displayName: player1Name,
  };

  if (mode === "ai") {
    const diffLabel = DIFFICULTY_LABELS[difficulty];
    const aiPlayerId = crypto.randomUUID();
    const aiPlayer = {
      id: aiPlayerId,
      seat: 1,
      isHuman: false,
      displayName: `AI (${diffLabel.name} ~${diffLabel.elo})`,
    };

    const match = matchStore.create(slug, [humanPlayer, aiPlayer], {
      playerId: aiPlayerId,
      difficulty,
    });

    return NextResponse.json({
      matchId: match.id,
      gameSlug: match.gameSlug,
      players: match.players,
      humanPlayerId: humanPlayer.id,
      state: match.orchestrator?.getVisibleState(humanPlayer.id),
      activePlayers: match.orchestrator?.getActivePlayers() ?? [],
      status: match.status,
      mode: "ai",
    });
  }

  // Local 2-player mode
  const player2Name = body.player2Name || "Player 2";
  const player2 = {
    id: crypto.randomUUID(),
    seat: 1,
    isHuman: true,
    displayName: player2Name,
  };

  const match = matchStore.create(slug, [humanPlayer, player2]);

  return NextResponse.json({
    matchId: match.id,
    gameSlug: match.gameSlug,
    players: match.players,
    state: match.orchestrator?.getVisibleState(humanPlayer.id),
    activePlayers: match.orchestrator?.getActivePlayers() ?? [],
    status: match.status,
    mode: "local",
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const matches = matchStore
    .list()
    .filter((m) => m.gameSlug === slug)
    .map((m) => ({
      id: m.id,
      gameSlug: m.gameSlug,
      players: m.players,
      status: m.status,
      turnNumber: m.turnNumber,
      createdAt: m.createdAt,
    }));

  return NextResponse.json({ matches });
}
