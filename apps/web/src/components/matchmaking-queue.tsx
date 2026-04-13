"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface MatchmakingQueueProps {
  gameSlug: string;
  gamePath: string; // e.g. "/games/connect4"
}

export function MatchmakingQueue({ gameSlug, gamePath }: MatchmakingQueueProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "searching" | "matched">("idle");
  const [queueEntryId, setQueueEntryId] = useState<string | null>(null);
  const [queueSize, setQueueSize] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const joinQueue = async () => {
    if (!user) return;
    setStatus("searching");
    setSearchTime(0);

    try {
      const res = await fetch("/api/matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          gameSlug,
        }),
      });
      const data = await res.json();
      setQueueEntryId(data.queueEntryId);
      setQueueSize(data.queueSize);

      if (data.status === "matched") {
        handleMatched(data.matchId, data.onlineMatch);
        return;
      }

      // Start polling
      pollRef.current = setInterval(async () => {
        const pollRes = await fetch(`/api/matchmaking?entryId=${data.queueEntryId}`);
        const pollData = await pollRes.json();

        if (pollData.status === "matched") {
          cleanup();
          handleMatched(pollData.matchId, pollData.onlineMatch);
        }
      }, 1000);

      // Start timer
      timerRef.current = setInterval(() => {
        setSearchTime((t) => t + 1);
      }, 1000);
    } catch {
      setStatus("idle");
    }
  };

  const handleMatched = (matchId: string, onlineMatch: {
    players: { userId: string; playerId: string }[];
  }) => {
    setStatus("matched");
    cleanup();

    // Find our playerId
    const ourPlayer = onlineMatch.players.find((p: { userId: string }) => p.userId === user?.id);

    sessionStorage.setItem(
      `match-${matchId}`,
      JSON.stringify({
        mode: "online",
        players: onlineMatch.players,
        humanPlayerId: ourPlayer?.playerId,
        onlineMatch,
      }),
    );

    setTimeout(() => {
      router.push(`${gamePath}/${matchId}`);
    }, 500);
  };

  const cancelSearch = async () => {
    cleanup();
    if (queueEntryId) {
      await fetch(`/api/matchmaking?entryId=${queueEntryId}`, { method: "DELETE" });
    }
    setStatus("idle");
    setQueueEntryId(null);
  };

  if (status === "matched") {
    return (
      <div className="text-center py-6">
        <div className="text-emerald-glow text-lg font-semibold mb-2">Match found!</div>
        <div className="text-zinc-500 text-sm animate-pulse">Loading game...</div>
      </div>
    );
  }

  if (status === "searching") {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-glow/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-cyan-glow animate-spin" />
        </div>
        <div>
          <div className="text-sm font-semibold text-cyan-glow">Searching for opponent...</div>
          <div className="text-xs text-zinc-600 font-mono mt-1">{searchTime}s</div>
        </div>
        {queueSize > 0 && (
          <div className="text-xs text-zinc-600">
            {queueSize} player{queueSize !== 1 ? "s" : ""} in queue
          </div>
        )}
        <p className="text-xs text-zinc-700 max-w-xs mx-auto">
          Share this page link with a friend — they can join the same queue to match with you!
        </p>
        <button
          onClick={cancelSearch}
          className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm text-zinc-400 hover:bg-white/10 transition-all"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={joinQueue}
      className="w-full rounded-xl bg-gradient-to-r from-cyan-glow to-purple-glow px-6 py-3.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity shadow-lg shadow-cyan-glow/20"
    >
      Find Online Match
    </button>
  );
}
