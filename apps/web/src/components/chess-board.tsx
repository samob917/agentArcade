"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface ChessState {
  fen: string;
  pgn: string;
  players: { white: string; black: string };
  moveHistory: string[];
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
}

interface GameResult {
  winnerId: string | null;
  reason: string;
  scores: Record<string, number>;
}

interface ChessBoardProps {
  matchId: string;
  localMode: boolean;
  playerId?: string;
  players: { id: string; seat: number; displayName: string; isHuman: boolean }[];
  initialState: ChessState;
  initialActivePlayers: string[];
}

// Use filled (black) unicode glyphs for all pieces — we color them with CSS
const PIECE_GLYPH: Record<string, string> = {
  K: "\u265A", Q: "\u265B", R: "\u265C", B: "\u265D", N: "\u265E", P: "\u265F",
  k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F",
};

function isWhitePiece(piece: string): boolean {
  return piece === piece.toUpperCase();
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

function fenToBoard(fen: string): (string | null)[][] {
  const rows = fen.split(" ")[0].split("/");
  return rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
}

function getTurnFromFen(fen: string): "w" | "b" {
  return fen.split(" ")[1] as "w" | "b";
}

export function ChessBoard({
  matchId,
  localMode,
  playerId,
  players,
  initialState,
  initialActivePlayers,
}: ChessBoardProps) {
  const [state, setState] = useState<ChessState>(initialState);
  const [activePlayers, setActivePlayers] = useState<string[]>(initialActivePlayers);
  const [result, setResult] = useState<GameResult | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In local mode, current player is whoever's turn it is
  const currentPlayerId = localMode ? activePlayers[0] : playerId;
  const turn = getTurnFromFen(state.fen);
  const currentColor = turn === "w" ? "white" : "black";

  // Poll for opponent moves in online mode
  const isOnline = !localMode && playerId;
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
      } catch { /* ignore */ }
    }, 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOnline, matchId, playerId, result]);

  const board = fenToBoard(state.fen);

  // Don't flip board in local mode — always show white at bottom
  const flipped = !localMode && state.players.black === playerId;
  const displayRanks = flipped ? [...RANKS].reverse() : RANKS;
  const displayFiles = flipped ? [...FILES].reverse() : FILES;

  const submitMove = useCallback(
    async (from: string, to: string, promotion?: string) => {
      if (isSubmitting || result || !currentPlayerId) return;
      setIsSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/matches/${matchId}/moves`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: currentPlayerId, move: { from, to, promotion } }),
        });

        const data = await res.json();

        if (!data.success) {
          setError(data.error || "Invalid move");
          return;
        }

        setState(data.state);
        setActivePlayers(data.activePlayers);
        setSelectedSquare(null);

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

  const handleSquareClick = (file: string, rank: string) => {
    if (result) return;
    const square = `${file}${rank}`;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }
      // Check if this is a pawn promotion
      const fromRank = selectedSquare[1];
      const rowIdx = RANKS.indexOf(fromRank);
      const colIdx = FILES.indexOf(selectedSquare[0]);
      const piece = board[rowIdx]?.[colIdx];
      const isPromotion =
        (piece === "P" && rank === "8") || (piece === "p" && rank === "1");

      submitMove(selectedSquare, square, isPromotion ? "q" : undefined);
      return;
    }

    // Select a piece belonging to current player
    const rowIdx = RANKS.indexOf(rank);
    const colIdx = FILES.indexOf(file);
    const piece = board[rowIdx]?.[colIdx];
    if (piece) {
      if (
        (currentColor === "white" && isWhitePiece(piece)) ||
        (currentColor === "black" && !isWhitePiece(piece))
      ) {
        setSelectedSquare(square);
      }
    }
  };

  const getWinnerName = () => {
    if (!result || !result.winnerId) return null;
    return players.find((p) => p.id === result.winnerId)?.displayName || "Unknown";
  };

  const currentPlayerName =
    players.find((p) => p.id === currentPlayerId)?.displayName || currentColor;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Player indicators */}
      <div className="flex items-center gap-8 w-full max-w-lg justify-between">
        {(["white", "black"] as const).map((color) => {
          const pid = state.players[color];
          const player = players.find((p) => p.id === pid);
          const isActive = activePlayers.includes(pid) && !result;

          return (
            <div
              key={color}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                isActive
                  ? color === "white"
                    ? "border-white/30 bg-white/10"
                    : "border-zinc-500/30 bg-zinc-800/50"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div
                className={`text-2xl leading-none ${isActive ? "animate-pulse-live" : ""} ${
                  color === "white"
                    ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    : "text-zinc-900 drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]"
                }`}
                style={
                  color === "white"
                    ? { WebkitTextStroke: "0.5px rgba(0,0,0,0.3)" }
                    : { WebkitTextStroke: "0.5px rgba(255,255,255,0.15)" }
                }
              >
                ♚
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {player?.displayName || color}
                </div>
                <div className={`text-[10px] capitalize ${
                  isActive
                    ? color === "white" ? "text-white/70" : "text-zinc-400"
                    : "text-zinc-600"
                }`}>
                  {color}{isActive ? " — your turn" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div className="text-sm font-medium">
        {result ? (
          result.winnerId ? (
            <span className="text-emerald-glow">
              {getWinnerName()} wins by {result.reason}!
            </span>
          ) : (
            <span className="text-zinc-400">Draw — {result.reason}</span>
          )
        ) : state.isCheck ? (
          <span className="text-red-500">Check! {currentPlayerName} to move</span>
        ) : (
          <span className="text-cyan-glow">
            {selectedSquare
              ? `${currentPlayerName}: move from ${selectedSquare}`
              : `${currentPlayerName}'s turn — select a piece`}
          </span>
        )}
      </div>

      {/* Board */}
      <div className="relative rounded-2xl border border-white/10 bg-[#0a0a15] p-2">
        <div className="grid grid-cols-8 gap-0">
          {displayRanks.map((rank, rowDisplay) =>
            displayFiles.map((file, colDisplay) => {
              const boardRow = RANKS.indexOf(rank);
              const boardCol = FILES.indexOf(file);
              const piece = board[boardRow]?.[boardCol];
              const square = `${file}${rank}`;
              const isLight = (boardRow + boardCol) % 2 === 0;
              const isSelected = selectedSquare === square;
              const isLastMoveSquare =
                state.lastMove &&
                (state.lastMove.from === square || state.lastMove.to === square);

              return (
                <button
                  key={`${rowDisplay}-${colDisplay}`}
                  className={`h-14 w-14 flex items-center justify-center transition-all relative ${
                    isSelected
                      ? "bg-cyan-glow/40 ring-2 ring-cyan-glow"
                      : isLastMoveSquare
                        ? isLight
                          ? "bg-amber-400/25"
                          : "bg-amber-500/20"
                        : isLight
                          ? "bg-[#b8a07a]"
                          : "bg-[#7a5c3a]"
                  } cursor-pointer hover:brightness-110`}
                  onClick={() => handleSquareClick(file, rank)}
                  disabled={!!result}
                >
                  {piece && (
                    <span
                      className={`select-none text-3xl ${
                        isWhitePiece(piece)
                          ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                          : "text-zinc-900 drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]"
                      }`}
                      style={
                        isWhitePiece(piece)
                          ? { WebkitTextStroke: "0.5px rgba(0,0,0,0.3)" }
                          : { WebkitTextStroke: "0.5px rgba(255,255,255,0.15)" }
                      }
                    >
                      {PIECE_GLYPH[piece]}
                    </span>
                  )}
                  {colDisplay === 0 && (
                    <span className="absolute top-0.5 left-1 text-[9px] text-zinc-600 font-mono">
                      {rank}
                    </span>
                  )}
                  {rowDisplay === 7 && (
                    <span className="absolute bottom-0.5 right-1 text-[9px] text-zinc-600 font-mono">
                      {file}
                    </span>
                  )}
                </button>
              );
            }),
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
      <div className="w-full max-w-lg">
        <div className="text-xs text-zinc-600 font-mono bg-white/[0.02] rounded-xl border border-white/5 p-3 max-h-32 overflow-y-auto">
          {state.pgn || "No moves yet"}
        </div>
      </div>

      {/* Play again */}
      {result && (
        <a
          href="/games/chess"
          className="rounded-xl bg-gradient-to-r from-white to-zinc-400 px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
        >
          Play Again
        </a>
      )}
    </div>
  );
}
