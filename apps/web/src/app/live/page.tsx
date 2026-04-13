"use client";

import { useState, useEffect, useCallback } from "react";

interface ArenaPlayer {
  agentId: string;
  agentName: string;
  seat: number;
  elo: number;
  difficulty: string;
  winStreak: number;
}

interface ArenaMatch {
  id: string;
  gameSlug: string;
  players: ArenaPlayer[];
  state: unknown;
  turnNumber: number;
  status: "playing" | "finished";
  result: {
    winnerId: string | null;
    reason: string;
  } | null;
  winnerId: string | null;
  startedAt: number;
  finishedAt: number | null;
  moveLog: { playerId: string; move: unknown; timestamp: number }[];
}

interface ArenaState {
  isRunning: boolean;
  totalMatchesPlayed: number;
  currentMatch: ArenaMatch | null;
  recentMatches: ArenaMatch[];
  winStreaks: Record<string, number>;
}

const ROWS = 6;
const COLS = 7;

function Connect4LiveBoard({ state }: { state: { board: number[][]; lastMove: { row: number; col: number } | null } }) {
  return (
    <div className="inline-grid grid-cols-7 gap-1.5 bg-[#0a0a15] p-2.5 rounded-xl border border-white/10">
      {state.board.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
          const isLast = state.lastMove?.row === rowIdx && state.lastMove?.col === colIdx;
          return (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={`h-10 w-10 rounded-full border transition-all duration-300 ${
                cell === 0
                  ? "bg-zinc-900/50 border-white/5"
                  : cell === 1
                    ? "bg-cyan-glow border-transparent shadow-[0_0_10px_rgba(6,245,245,0.3)]"
                    : "bg-purple-glow border-transparent shadow-[0_0_10px_rgba(168,85,247,0.3)]"
              } ${isLast ? "ring-2 ring-white/40 ring-offset-1 ring-offset-[#0a0a15]" : ""}`}
            />
          );
        }),
      )}
    </div>
  );
}

function ChessLiveBoard({ state }: { state: { fen: string; lastMove: { from: string; to: string } | null } }) {
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];
  const PIECE_GLYPH: Record<string, string> = {
    K: "\u265A", Q: "\u265B", R: "\u265C", B: "\u265D", N: "\u265E", P: "\u265F",
    k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F",
  };

  const rows = state.fen.split(" ")[0].split("/");
  const board = rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) cells.push(null);
      else cells.push(ch);
    }
    return cells;
  });

  return (
    <div className="inline-grid grid-cols-8 gap-0 rounded-xl overflow-hidden border border-white/10">
      {RANKS.map((rank, rowIdx) =>
        FILES.map((file, colIdx) => {
          const piece = board[rowIdx]?.[colIdx];
          const square = `${file}${rank}`;
          const isLight = (rowIdx + colIdx) % 2 === 0;
          const isLast = state.lastMove && (state.lastMove.from === square || state.lastMove.to === square);
          const isWhite = piece ? piece === piece.toUpperCase() : false;

          return (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={`h-10 w-10 flex items-center justify-center text-xl transition-all duration-300 ${
                isLast
                  ? isLight ? "bg-amber-400/30" : "bg-amber-500/25"
                  : isLight ? "bg-[#b8a07a]" : "bg-[#7a5c3a]"
              }`}
            >
              {piece && (
                <span
                  className={isWhite
                    ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    : "text-zinc-900 drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]"
                  }
                  style={isWhite
                    ? { WebkitTextStroke: "0.5px rgba(0,0,0,0.3)" }
                    : { WebkitTextStroke: "0.5px rgba(255,255,255,0.15)" }
                  }
                >
                  {PIECE_GLYPH[piece]}
                </span>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

function MatchResultBadge({ match }: { match: ArenaMatch }) {
  if (!match.result) return null;
  const winner = match.players.find((p) => p.agentId === match.winnerId);
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
      match.winnerId ? "bg-emerald-glow/10 text-emerald-glow" : "bg-zinc-800 text-zinc-400"
    }`}>
      {match.winnerId ? `${winner?.agentName} wins` : "Draw"} — {match.result.reason}
    </span>
  );
}

export default function LivePage() {
  const [arenaState, setArenaState] = useState<ArenaState | null>(null);
  const [selectedGame, setSelectedGame] = useState("connect4");
  const [isStarting, setIsStarting] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/arena");
      const data: ArenaState = await res.json();
      setArenaState(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 500); // poll every 500ms for smooth updates
    return () => clearInterval(interval);
  }, [fetchState]);

  const toggleArena = async () => {
    setIsStarting(true);
    const action = arenaState?.isRunning ? "stop" : "start";
    await fetch("/api/arena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, gameSlug: selectedGame }),
    });
    await fetchState();
    setIsStarting(false);
  };

  const match = arenaState?.currentMatch;
  const isRunning = arenaState?.isRunning || false;

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {isRunning && (
              <span className="relative flex h-3 w-3">
                <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-red-500" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </span>
            )}
            <h1 className="text-4xl font-bold">
              {isRunning ? "Live Arena" : "Arena"}
            </h1>
            {arenaState && (
              <span className="text-sm text-zinc-600 font-mono">
                {arenaState.totalMatchesPlayed} matches played
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isRunning && (
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedGame("connect4")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedGame === "connect4"
                      ? "bg-cyan-glow/10 border border-cyan-glow/30 text-cyan-glow"
                      : "bg-white/5 border border-white/5 text-zinc-500"
                  }`}
                >
                  Connect 4
                </button>
                <button
                  onClick={() => setSelectedGame("chess")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedGame === "chess"
                      ? "bg-purple-glow/10 border border-purple-glow/30 text-purple-glow"
                      : "bg-white/5 border border-white/5 text-zinc-500"
                  }`}
                >
                  Chess
                </button>
              </div>
            )}
            <button
              onClick={toggleArena}
              disabled={isStarting}
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
                isRunning
                  ? "bg-red-500/20 border border-red-500/30 text-red-500 hover:bg-red-500/30"
                  : "bg-gradient-to-r from-cyan-glow to-cyan-glow/80 text-black hover:opacity-90 shadow-lg shadow-cyan-glow/20"
              }`}
            >
              {isStarting ? "..." : isRunning ? "Stop Arena" : "Start Arena"}
            </button>
          </div>
        </div>

        {!isRunning && !match && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
            <div className="text-4xl mb-4">&#x1F3AE;</div>
            <h2 className="text-xl font-semibold mb-2">Agent Arena</h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              Watch AI agents battle each other in real-time. Winner stays on, loser gets swapped.
              ELO ratings update after every match.
            </p>
            <p className="text-xs text-zinc-700">Select a game and click Start Arena to begin.</p>
          </div>
        )}

        {/* Current Match */}
        {match && (
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 items-start mb-10">
            {/* Player A (left) */}
            <div className={`rounded-2xl border p-6 text-right transition-all ${
              match.status === "playing" && match.state &&
              (match.gameSlug === "connect4"
                ? (match.state as { currentPlayerIndex: number }).currentPlayerIndex === 0
                : true)
                ? "border-cyan-glow/20 bg-cyan-glow/5"
                : match.winnerId === match.players[0].agentId
                  ? "border-emerald-glow/20 bg-emerald-glow/5"
                  : "border-white/5 bg-white/[0.02]"
            }`}>
              <div className="text-2xl font-bold mb-1">{match.players[0].agentName}</div>
              <div className="flex items-center justify-end gap-3 text-sm">
                <span className="font-mono text-cyan-glow">{match.players[0].elo} ELO</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-500 capitalize">{match.players[0].difficulty}</span>
              </div>
              {match.players[0].winStreak > 0 && (
                <div className="mt-2 text-xs font-semibold text-amber-500">
                  {match.players[0].winStreak} win streak &#x1F525;
                </div>
              )}
            </div>

            {/* Board (center) */}
            <div className="flex flex-col items-center gap-4">
              {/* Status */}
              <div className="text-center">
                {match.status === "playing" ? (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-red-500" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    <span className="text-sm text-zinc-400 font-mono">
                      Turn {match.turnNumber}
                    </span>
                  </div>
                ) : (
                  <MatchResultBadge match={match} />
                )}
              </div>

              {/* Board render */}
              {!!match.state && match.gameSlug === "connect4" && (
                <Connect4LiveBoard state={match.state as { board: number[][]; lastMove: { row: number; col: number } | null }} />
              )}
              {!!match.state && match.gameSlug === "chess" && (
                <ChessLiveBoard state={match.state as { fen: string; lastMove: { from: string; to: string } | null }} />
              )}

              {/* VS label */}
              <div className="text-xs font-mono text-zinc-700">
                {match.gameSlug.toUpperCase()} — Match #{(arenaState?.totalMatchesPlayed || 0) + (match.status === "playing" ? 1 : 0)}
              </div>
            </div>

            {/* Player B (right) */}
            <div className={`rounded-2xl border p-6 transition-all ${
              match.status === "playing" && match.state &&
              (match.gameSlug === "connect4"
                ? (match.state as { currentPlayerIndex: number }).currentPlayerIndex === 1
                : true)
                ? "border-purple-glow/20 bg-purple-glow/5"
                : match.winnerId === match.players[1].agentId
                  ? "border-emerald-glow/20 bg-emerald-glow/5"
                  : "border-white/5 bg-white/[0.02]"
            }`}>
              <div className="text-2xl font-bold mb-1">{match.players[1].agentName}</div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-mono text-purple-glow">{match.players[1].elo} ELO</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-500 capitalize">{match.players[1].difficulty}</span>
              </div>
              {match.players[1].winStreak > 0 && (
                <div className="mt-2 text-xs font-semibold text-amber-500">
                  {match.players[1].winStreak} win streak &#x1F525;
                </div>
              )}
            </div>
          </div>
        )}

        {/* Win Streaks */}
        {arenaState && Object.keys(arenaState.winStreaks).some((k) => arenaState.winStreaks[k] > 0) && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Current Streaks</h2>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(arenaState.winStreaks)
                .filter(([, streak]) => streak > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([agentId, streak]) => {
                  const agent = arenaState.currentMatch?.players.find((p) => p.agentId === agentId)
                    || arenaState.recentMatches[0]?.players.find((p) => p.agentId === agentId);
                  return (
                    <div key={agentId} className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2">
                      <span className="font-semibold text-sm">{agent?.agentName || agentId.slice(0, 8)}</span>
                      <span className="ml-2 text-amber-500 font-mono text-sm">{streak}W</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Recent Matches */}
        {arenaState && arenaState.recentMatches.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Recent Matches</h2>
            <div className="space-y-2">
              {arenaState.recentMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-600 w-16">
                      {m.gameSlug}
                    </span>
                    <span className={`font-medium ${m.winnerId === m.players[0].agentId ? "text-emerald-glow" : "text-zinc-400"}`}>
                      {m.players[0].agentName}
                    </span>
                    <span className="text-zinc-700 text-xs">vs</span>
                    <span className={`font-medium ${m.winnerId === m.players[1].agentId ? "text-emerald-glow" : "text-zinc-400"}`}>
                      {m.players[1].agentName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="font-mono">{m.turnNumber} turns</span>
                    <MatchResultBadge match={m} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
