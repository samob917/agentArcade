import { NextRequest, NextResponse } from "next/server";
import { matchmaking } from "@/lib/matchmaking";
import { ensureGamesRegistered } from "@/lib/register-games";

ensureGamesRegistered();

/** POST /api/matchmaking — join queue */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { userId, userName, gameSlug } = body;
  if (!userId || !userName || !gameSlug) {
    return NextResponse.json({ error: "userId, userName, and gameSlug required" }, { status: 400 });
  }

  const entry = matchmaking.joinQueue(userId, userName, gameSlug);

  // Check if immediately matched
  const status = matchmaking.getQueueStatus(entry.id);

  return NextResponse.json({
    queueEntryId: entry.id,
    ...status,
    queueSize: matchmaking.getQueueSize(gameSlug),
  });
}

/** GET /api/matchmaking?entryId=xxx — poll queue status */
export async function GET(request: NextRequest) {
  const entryId = request.nextUrl.searchParams.get("entryId");
  const gameSlug = request.nextUrl.searchParams.get("gameSlug");

  if (entryId) {
    const status = matchmaking.getQueueStatus(entryId);
    return NextResponse.json(status);
  }

  if (gameSlug) {
    return NextResponse.json({ queueSize: matchmaking.getQueueSize(gameSlug) });
  }

  return NextResponse.json({ error: "entryId or gameSlug required" }, { status: 400 });
}

/** DELETE /api/matchmaking?entryId=xxx — leave queue */
export async function DELETE(request: NextRequest) {
  const entryId = request.nextUrl.searchParams.get("entryId");
  if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });

  matchmaking.leaveQueue(entryId);
  return NextResponse.json({ ok: true });
}
