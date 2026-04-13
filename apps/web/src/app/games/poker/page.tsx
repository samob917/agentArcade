"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/context/auth-context";

const DIFFICULTIES = [
  { value: "random", label: "Random", elo: "~400", desc: "Random actions" },
  { value: "easy", label: "Easy", elo: "~800", desc: "Basic hand evaluation" },
  { value: "medium", label: "Medium", elo: "~1200", desc: "Pot odds + strategy" },
  { value: "hard", label: "Hard", elo: "~1800", desc: "Bluffs + reads" },
];

export default function PokerLobby() {
  return (
    <AuthGuard>
      <PokerLobbyInner />
    </AuthGuard>
  );
}

function PokerLobbyInner() {
  const router = useRouter();
  const { user } = useAuth();
  const [playerName, setPlayerName] = useState(user?.name || "");
  const [difficulty, setDifficulty] = useState("medium");
  const [isCreating, setIsCreating] = useState(false);

  const createMatch = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/games/poker/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: playerName || "Player",
          mode: "ai",
          difficulty,
        }),
      });
      const data = await res.json();
      sessionStorage.setItem(
        `match-${data.matchId}`,
        JSON.stringify({
          mode: "ai",
          players: data.players,
          humanPlayerId: data.humanPlayerId,
        }),
      );
      router.push(`/games/poker/${data.matchId}`);
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-4xl mb-4">🃏</div>
          <h1 className="text-4xl font-bold mb-3">Texas Hold&apos;em</h1>
          <p className="text-zinc-500">
            Bluff, bet, and outsmart. Hidden information at its finest.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-lg font-semibold mb-6">Start a Match</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-glow/30 transition-colors"
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
                        ? "border-emerald-glow/30 bg-emerald-glow/10"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${difficulty === d.value ? "text-emerald-glow" : ""}`}>
                      {d.label}
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{d.elo}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={createMatch}
              disabled={isCreating}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-glow to-emerald-glow/80 px-6 py-3.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-emerald-glow/20"
            >
              {isCreating ? "Creating..." : "Play vs AI"}
            </button>

            <p className="text-[10px] text-zinc-700 text-center pt-1">
              Heads-up Texas Hold&apos;em. 1000 chips, 10/20 blinds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
