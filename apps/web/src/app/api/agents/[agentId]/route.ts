import { NextRequest, NextResponse } from "next/server";
import { agentStore } from "@/lib/agent-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;

  const agent = agentStore.getById(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    description: agent.description,
    llmProvider: agent.llmProvider,
    supportedGames: agent.supportedGames,
    elo: agent.elo,
    isBuiltIn: agent.isBuiltIn,
    totalMatches: agent.totalMatches,
    wins: agent.wins,
    losses: agent.losses,
    draws: agent.draws,
    winRate: agent.totalMatches > 0
      ? ((agent.wins / agent.totalMatches) * 100).toFixed(1) + "%"
      : "—",
    createdAt: agent.createdAt,
  });
}
