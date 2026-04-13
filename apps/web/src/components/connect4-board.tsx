"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface Connect4State {
  board: number[][];
  players: [string, string];
  currentPlayerIndex: 0 | 1;
  moveHistory: number[];
  lastMove: { row: number; col: number } | null;
}

interface GameResult {
  winnerId: string | null;
  reason: string;
  scores: Record<string, number>;
}

interface Connect4BoardProps {
  matchId: string;
  /** Local hot-seat mode: both players play on the same screen */
  localMode: boolean;
  /** In local mode, only playerId is needed; in local mode both are in players */
  playerId?: string;
  players: { id: string; seat: number; displayName: string; isHuman: boolean }[];
  initialState: Connect4State;
  initialActivePlayers: string[];
}

const ROWS = 6;
const COLS = 7;

export function Connect4Board({
  matchId,
  localMode,
  playerId,
  players,
  initialState,
  initialActivePlayers,
}: Connect4BoardProps) {
  const [state, setState] = useState<Connect4State>(initialState);
  const [activePlayers, setActivePlayers] = useState<string[]>(initialActivePlayers);
  const [result, setResult] = useState<GameResult | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In local mode, the "current player" is whoever's turn it is
  // In online/AI mode, it's the authenticated player
  const currentPlayerId = localMode
    ? activePlayers[0]
    : playerId;

  const isOnline = !localMode && playerId;
  const isMyTurn = !localMode ? activePlayers.includes(playerId || "") : true;

  // Poll for opponent moves in online mode
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isOnline || result) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}?playerId=${playerId}`);
        const data = await res.json();
        if (data.state) setState(data.state);
        if (data.activePlayers) setActivePlayers(data.activePlayers);
        if (data.result) {
          setResult(data.result);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* ignore poll errors */ }
    }, 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOnline, matchId, playerId, result]);

  const currentPlayerIndex = state.players.indexOf(currentPlayerId || "");
  const currentColor = currentPlayerIndex === 0 ? "cyan" : "purple";

  const submitMove = useCallback(
    async (column: number) => {
      if (isSubmitting || result || !currentPlayerId) return;
      setIsSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/matches/${matchId}/moves`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: currentPlayerId, move: { column } }),
        });

        const data = await res.json();

        if (!data.success) {
          setError(data.error || "Invalid move");
          return;
        }

        setState(data.state);
        setActivePlayers(data.activePlayers);

        if (data.result) {
          setResult(data.result);
        }
      } catch {
        setError("Failed to submit move");
      } finally {
        setIsSubmitting(false);
      }
    },
    [matchId, currentPlayerId, isSubmitting, result],
  );

  const getDropRow = (col: number): number => {
    for (let row = ROWS - 1; row >= 0; row--) {
      if (state.board[row][col] === 0) return row;
    }
    return -1;
  };

  const getCellColor = (cell: number) => {
    if (cell === 0) return "bg-zinc-900/50";
    if (cell === 1) {
      return "bg-cyan-glow shadow-[0_0_12px_rgba(6,245,245,0.3)]";
    }
    return "bg-purple-glow shadow-[0_0_12px_rgba(168,85,247,0.3)]";
  };

  const isLastMove = (row: number, col: number) =>
    state.lastMove?.row === row && state.lastMove?.col === col;

  const getWinnerName = () => {
    if (!result || !result.winnerId) return null;
    return players.find((p) => p.id === result.winnerId)?.displayName || "Unknown";
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Player indicators */}
      <div className="flex items-center gap-8 w-full max-w-lg justify-between">
        {players.map((p, i) => {
          const color = i === 0 ? "cyan" : "purple";
          const isActive = activePlayers.includes(p.id) && !result;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                isActive
                  ? color === "cyan"
                    ? "border-cyan-glow/30 bg-cyan-glow/5"
                    : "border-purple-glow/30 bg-purple-glow/5"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full ${
                  color === "cyan" ? "bg-cyan-glow" : "bg-purple-glow"
                } ${isActive ? "animate-pulse-live" : ""}`}
              />
              <div>
                <div className="text-sm font-semibold">{p.displayName}</div>
                <div className="text-[10px] text-zinc-600">
                  {isActive ? "Your turn" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status bar */}
      <div className="text-sm font-medium">
        {result ? (
          result.winnerId ? (
            <span className="text-emerald-glow text-glow-cyan">
              {getWinnerName()} wins!
            </span>
          ) : (
            <span className="text-zinc-400">Draw!</span>
          )
        ) : (
          <span className={currentColor === "cyan" ? "text-cyan-glow" : "text-purple-glow"}>
            {players[currentPlayerIndex]?.displayName || "Player"}&apos;s turn — drop a disc
          </span>
        )}
      </div>

      {/* Board */}
      <div className="relative rounded-2xl border border-white/10 bg-[#0a0a15] p-3 glow-cyan">
        {/* Column hover indicators */}
        <div className="grid grid-cols-7 gap-2 mb-2 px-1">
          {Array.from({ length: COLS }).map((_, col) => {
            const canDrop = !result && getDropRow(col) >= 0;
            return (
              <div key={col} className="flex justify-center h-5">
                {hoveredCol === col && canDrop && (
                  <div
                    className={`h-4 w-4 rounded-full opacity-60 ${
                      currentColor === "cyan" ? "bg-cyan-glow" : "bg-purple-glow"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-2">
          {state.board.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <button
                key={`${rowIdx}-${colIdx}`}
                className={`h-14 w-14 rounded-full border transition-all duration-200 ${
                  cell === 0
                    ? !result && getDropRow(colIdx) >= 0
                      ? "border-white/10 hover:border-white/20 cursor-pointer"
                      : "border-white/5 cursor-default"
                    : "border-transparent"
                } ${getCellColor(cell)} ${
                  isLastMove(rowIdx, colIdx)
                    ? "ring-2 ring-white/30 ring-offset-1 ring-offset-[#0a0a15]"
                    : ""
                }`}
                onClick={() => submitMove(colIdx)}
                onMouseEnter={() => setHoveredCol(colIdx)}
                onMouseLeave={() => setHoveredCol(null)}
                disabled={isSubmitting || !!result}
              />
            )),
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Move history */}
      <div className="text-xs text-zinc-600 font-mono">
        Move {state.moveHistory.length} — Columns played:{" "}
        {state.moveHistory.join(", ") || "none"}
      </div>

      {/* Play again */}
      {result && (
        <a
          href="/games/connect4"
          className="rounded-xl bg-gradient-to-r from-cyan-glow to-purple-glow px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
        >
          Play Again
        </a>
      )}
    </div>
  );
}
