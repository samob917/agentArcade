"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/context/auth-context";
import { MatchmakingQueue } from "@/components/matchmaking-queue";

const DIFFICULTIES = [
  { value: "random", label: "Random", elo: "~400", desc: "Picks random legal moves" },
  { value: "easy", label: "Easy", elo: "~800", desc: "Basic material awareness" },
  { value: "medium", label: "Medium", elo: "~1200", desc: "Positional evaluation" },
  { value: "hard", label: "Hard", elo: "~1800", desc: "Deeper search + tactics" },
];

export default function ChessLobby() {
  return (
    <AuthGuard>
      <ChessLobbyInner />
    </AuthGuard>
  );
}

function ChessLobbyInner() {
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
      const res = await fetch("/api/games/chess/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "ai"
            ? { playerName: playerName || "Player", mode: "ai", difficulty }
            : {
                playerName: playerName || "White",
                player2Name: player2Name || "Black",
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
      router.push(`/games/chess/${data.matchId}`);
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-4xl mb-4">♟</div>
          <h1 className="text-4xl font-bold mb-3">Chess</h1>
          <p className="text-zinc-500">
            The ultimate test of strategic thinking. Centuries of theory meet AI
            innovation.
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
              <MatchmakingQueue gameSlug="chess" gamePath="/games/chess" />
            ) : mode === "ai" ? (
              <>
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Your Name (White)</label>
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
                  <label className="text-xs text-zinc-500 block mb-2">White</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Name..."
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Black</label>
                  <input
                    type="text"
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                    placeholder="Name..."
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500/30 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              onClick={createMatch}
              disabled={isCreating}
              className="w-full rounded-xl bg-gradient-to-r from-white to-zinc-400 px-6 py-3.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Start Game"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
