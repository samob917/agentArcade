"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChessBoard } from "@/components/chess-board";

interface MatchData {
  matchId: string;
  gameSlug: string;
  players: {
    id: string;
    seat: number;
    displayName: string;
    isHuman: boolean;
  }[];
  status: string;
  state: unknown;
  activePlayers: string[];
  result: unknown;
}

interface StoredMatchInfo {
  mode: "local" | "ai" | "online";
  players: MatchData["players"];
  humanPlayerId?: string;
}

export default function ChessMatchPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const [match, setMatch] = useState<MatchData | null>(null);
  const [matchInfo, setMatchInfo] = useState<StoredMatchInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`match-${matchId}`);
    if (stored) {
      try {
        setMatchInfo(JSON.parse(stored));
      } catch { /* ignore */ }
    }

    const fetchMatch = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`);
        if (!res.ok) {
          setError("Match not found");
          return;
        }
        setMatch(await res.json());
      } catch {
        setError("Failed to load match");
      }
    };

    fetchMatch();
  }, [matchId]);

  if (error) {
    return (
      <div className="bg-grid min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">{error}</div>
          <a href="/games/chess" className="text-sm text-zinc-500 hover:text-white transition-colors">
            Back to lobby
          </a>
        </div>
      </div>
    );
  }

  if (!match || !matchInfo) {
    return (
      <div className="bg-grid min-h-screen flex items-center justify-center">
        <div className="text-zinc-600 text-sm animate-pulse">Loading match...</div>
      </div>
    );
  }

  const isLocalMode = matchInfo.mode === "local";
  const modeLabel = matchInfo.mode === "online" ? "Online" : matchInfo.mode === "ai" ? "vs AI" : "Local";

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/games/chess" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              ← Back to lobby
            </a>
            <h1 className="text-2xl font-bold mt-1">Chess</h1>
          </div>
          <div className="text-xs font-mono text-zinc-700">
            {modeLabel} — {matchId.slice(0, 8)}...
          </div>
        </div>

        <ChessBoard
          matchId={matchId}
          localMode={isLocalMode}
          playerId={!isLocalMode ? matchInfo.humanPlayerId : undefined}
          players={matchInfo.players}
          initialState={match.state as never}
          initialActivePlayers={match.activePlayers}
        />
      </div>
    </div>
  );
}
