"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/context/auth-context";
import { MatchmakingQueue } from "@/components/matchmaking-queue";

const DIFFICULTIES = [
  { value: "random", label: "Random", elo: "~400", desc: "Picks random columns" },
  { value: "easy", label: "Easy", elo: "~800", desc: "Looks 2 moves ahead" },
  { value: "medium", label: "Medium", elo: "~1200", desc: "Looks 4 moves ahead" },
  { value: "hard", label: "Hard", elo: "~1800", desc: "Looks 7 moves ahead" },
];

export default function Connect4Lobby() {
  return (
    <AuthGuard>
      <Connect4LobbyInner />
    </AuthGuard>
  );
}

function Connect4LobbyInner() {
  const router = useRouter();
  const { user } = useAuth();
  const [playerName, setPlayerName] = useState(user?.name || "");
  const [player2Name, setPlayer2Name] = useState("");
  const [mode, setMode] = useState<"online" | "ai" | "local">("online");
  const [difficulty, setDifficulty] = useState("medium");
  const [isCreating, setIsCreating] = useState(false);

  const createMatch = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/games/connect4/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "ai"
            ? { playerName: playerName || "Player", mode: "ai", difficulty }
            : {
                playerName: playerName || "Player 1",
                player2Name: player2Name || "Player 2",
                mode: "local",
              },
        ),
      });
      const data = await res.json();
      sessionStorage.setItem(
        `match-${data.matchId}`,
        JSON.stringify({
          mode: data.mode,
          players: data.players,
          humanPlayerId: data.humanPlayerId,
        }),
      );
      router.push(`/games/connect4/${data.matchId}`);
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-4xl mb-4">⚡</div>
          <h1 className="text-4xl font-bold mb-3">Connect 4</h1>
          <p className="text-zinc-500">
            Drop discs, connect four in a row. Classic strategy, infinite depth.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-lg font-semibold mb-6">Start a Match</h2>

          {/* Mode tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode("online")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                mode === "online"
                  ? "bg-gradient-to-r from-cyan-glow/10 to-purple-glow/10 border border-cyan-glow/30 text-cyan-glow"
                  : "bg-white/5 border border-white/5 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Online
            </button>
            <button
              onClick={() => setMode("ai")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                mode === "ai"
                  ? "bg-cyan-glow/10 border border-cyan-glow/30 text-cyan-glow"
                  : "bg-white/5 border border-white/5 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              vs AI
            </button>
            <button
              onClick={() => setMode("local")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                mode === "local"
                  ? "bg-purple-glow/10 border border-purple-glow/30 text-purple-glow"
                  : "bg-white/5 border border-white/5 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Local 2P
            </button>
          </div>

          <div className="space-y-4">
            {mode === "online" ? (
              <MatchmakingQueue gameSlug="connect4" gamePath="/games/connect4" />
            ) : mode === "ai" ? (
              <>
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-glow/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-3">AI Difficulty</label>
                  <div className="grid grid-cols-4 gap-2">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDifficulty(d.value)}
                        className={`rounded-xl border p-3 text-center transition-all ${
                          difficulty === d.value
                            ? "border-cyan-glow/30 bg-cyan-glow/10"
                            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className={`text-sm font-semibold ${difficulty === d.value ? "text-cyan-glow" : ""}`}>
                          {d.label}
                        </div>
                        <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{d.elo}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-700 mt-2">
                    {DIFFICULTIES.find((d) => d.value === difficulty)?.desc}
                  </p>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">
                    Player 1 <span className="text-cyan-glow">(Cyan)</span>
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Name..."
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-glow/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">
                    Player 2 <span className="text-purple-glow">(Purple)</span>
                  </label>
                  <input
                    type="text"
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                    placeholder="Name..."
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-glow/30 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              onClick={createMatch}
              disabled={isCreating}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-glow to-cyan-glow/80 px-6 py-3.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-cyan-glow/20"
            >
              {isCreating ? "Creating..." : "Start Game"}
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h3 className="text-sm font-semibold mb-3 text-zinc-400">Rules</h3>
          <ul className="text-xs text-zinc-600 space-y-1.5">
            <li>Players take turns dropping colored discs into a 7-column, 6-row grid</li>
            <li>Pieces fall to the lowest available position in the column</li>
            <li>First to connect 4 discs in a row (horizontal, vertical, or diagonal) wins</li>
            <li>If the board fills up with no winner, the game is a draw</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
