"use client";

import { useState, useCallback } from "react";

interface HumanCaptchaProps {
  onVerified: (token: string) => void;
}

interface ChallengeData {
  challengeId: string;
  grid: string[];
  instruction: string;
  hint: string;
  gridSize: number;
}

export function HumanCaptcha({ onVerified }: HumanCaptchaProps) {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<"idle" | "loading" | "solving" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const loadChallenge = useCallback(async () => {
    setStatus("loading");
    setError(null);
    setSelected(new Set());

    try {
      const res = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "human" }),
      });
      const data = await res.json();
      setChallenge(data);
      setStatus("solving");
    } catch {
      setError("Failed to load challenge");
      setStatus("error");
    }
  }, []);

  const toggleCell = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const submitAnswer = async () => {
    if (!challenge) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/challenge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          answer: Array.from(selected),
          type: "human",
        }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        onVerified(data.token);
      } else {
        setError(data.error || "Try again");
        setStatus("error");
        // Auto reload challenge after error
        setTimeout(loadChallenge, 1500);
      }
    } catch {
      setError("Verification failed");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="text-center py-4">
        <div className="text-2xl mb-2">&#x2705;</div>
        <div className="text-emerald-glow text-sm font-semibold">Human verified!</div>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <button
        onClick={loadChallenge}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-3"
      >
        <div className="h-6 w-6 rounded border-2 border-zinc-500" />
        <span className="text-zinc-400">I am a human (click to prove it)</span>
      </button>
    );
  }

  if (!challenge || status === "loading") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-zinc-500 text-sm animate-pulse">Loading challenge...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-glow/20 bg-[#0a0a15] overflow-hidden">
      {/* Header */}
      <div className="bg-cyan-glow/10 px-4 py-3 border-b border-cyan-glow/20">
        <div className="text-xs font-semibold text-cyan-glow uppercase tracking-wider">
          Prove You Are Human
        </div>
        <div className="text-sm text-zinc-300 mt-1">{challenge.instruction}</div>
      </div>

      {/* Grid */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {challenge.grid.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => toggleCell(idx)}
              className={`h-16 rounded-lg text-2xl flex items-center justify-center transition-all ${
                selected.has(idx)
                  ? "bg-cyan-glow/20 border-2 border-cyan-glow ring-1 ring-cyan-glow/50"
                  : "bg-white/5 border-2 border-transparent hover:bg-white/10"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-xs text-red-500 text-center mb-3">{error}</div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={loadChallenge}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            New challenge
          </button>
          <button
            onClick={submitAnswer}
            disabled={selected.size === 0}
            className="rounded-lg bg-cyan-glow/20 border border-cyan-glow/30 px-5 py-2 text-sm font-medium text-cyan-glow hover:bg-cyan-glow/30 transition-all disabled:opacity-30"
          >
            Verify
          </button>
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-white/5 text-[10px] text-zinc-700 text-center">
        {challenge.hint}
      </div>
    </div>
  );
}
