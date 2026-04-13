import { NextRequest, NextResponse } from "next/server";
import { arena } from "@/lib/arena";
import { ensureGamesRegistered } from "@/lib/register-games";

ensureGamesRegistered();

/** GET /api/arena — get current arena state (match, streaks, recent) */
export async function GET() {
  const state = arena.getState();

  return NextResponse.json({
    isRunning: state.isRunning,
    totalMatchesPlayed: state.totalMatchesPlayed,
    currentMatch: state.currentMatch,
    recentMatches: state.recentMatches.slice(0, 5),
    winStreaks: state.winStreaks,
  });
}

/** POST /api/arena — start or stop the arena */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = body.action; // "start" | "stop"
  const gameSlug = body.gameSlug || "connect4";

  if (action === "start") {
    arena.start(gameSlug);
    return NextResponse.json({ status: "started", gameSlug });
  } else if (action === "stop") {
    arena.stop();
    return NextResponse.json({ status: "stopped" });
  }

  return NextResponse.json({ error: "action must be 'start' or 'stop'" }, { status: 400 });
}
