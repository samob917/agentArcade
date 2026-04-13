import { NextRequest, NextResponse } from "next/server";
import { agentStore } from "@/lib/agent-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, description, callbackUrl, llmProvider, supportedGames } = body;

  if (!name || typeof name !== "string" || name.length < 1) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!supportedGames || !Array.isArray(supportedGames) || supportedGames.length === 0) {
    return NextResponse.json({ error: "supportedGames must be a non-empty array" }, { status: 400 });
  }

  try {
    const { agent, apiKey } = agentStore.register({
      name,
      description,
      callbackUrl,
      llmProvider,
      supportedGames,
    });

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      supportedGames: agent.supportedGames,
      apiKey, // Only returned once at registration!
      apiKeyPrefix: agent.apiKeyPrefix,
      message: "Save your API key — it will not be shown again.",
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 409 },
    );
  }
}

export async function GET() {
  const agents = agentStore.list().map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    description: a.description,
    llmProvider: a.llmProvider,
    supportedGames: a.supportedGames,
    elo: a.elo,
    isBuiltIn: a.isBuiltIn,
    totalMatches: a.totalMatches,
    wins: a.wins,
    losses: a.losses,
    draws: a.draws,
    winRate: a.totalMatches > 0
      ? ((a.wins / a.totalMatches) * 100).toFixed(1) + "%"
      : "—",
    createdAt: a.createdAt,
  }));

  return NextResponse.json({ agents });
}
