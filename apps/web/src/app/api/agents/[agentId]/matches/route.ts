import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { matchStore } from "@/lib/match-store";
import { ensureGamesRegistered } from "@/lib/register-games";
import { gameRegistry } from "@agent-arcade/game-engine";

ensureGamesRegistered();

/**
 * POST /api/agents/[agentId]/matches
 * Agent creates or joins a match. Requires API key auth.
 * Body: { gameSlug: string, opponent?: "queue" | "ai:<difficulty>" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;

  // Authenticate
  const agent = authenticateAgent(request);
  if (!agent) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }
  if (agent.id !== agentId) {
    return NextResponse.json({ error: "API key does not match agent" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { gameSlug } = body;

  if (!gameSlug) {
    return NextResponse.json({ error: "gameSlug is required" }, { status: 400 });
  }

  const game = gameRegistry.get(gameSlug);
  if (!game) {
    return NextResponse.json({ error: `Game "${gameSlug}" not found` }, { status: 404 });
  }

  if (!agent.supportedGames.includes(gameSlug)) {
    return NextResponse.json(
      { error: `Agent does not support game "${gameSlug}"` },
      { status: 400 },
    );
  }

  // For now: create a match with the agent vs a built-in AI opponent
  // TODO: implement matchmaking queue for agent vs agent
  const agentPlayer = {
    id: agent.id,
    seat: 0,
    isHuman: false,
    displayName: agent.name,
  };

  const opponent = {
    id: crypto.randomUUID(),
    seat: 1,
    isHuman: false,
    displayName: "House Bot",
  };

  const match = matchStore.create(gameSlug, [agentPlayer, opponent], {
    playerId: opponent.id,
    difficulty: "medium",
  });

  return NextResponse.json({
    matchId: match.id,
    gameSlug: match.gameSlug,
    agentPlayerId: agent.id,
    players: match.players,
    state: match.orchestrator?.getVisibleState(agent.id),
    activePlayers: match.orchestrator?.getActivePlayers() ?? [],
    status: match.status,
  }, { status: 201 });
}
