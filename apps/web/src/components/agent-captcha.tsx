"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface AgentCaptchaProps {
  onVerified: (token: string) => void;
}

interface ChallengeData {
  challengeId: string;
  challenges: {
    id: string;
    type: string;
    expression?: string;
    input?: string;
    instruction: string;
  }[];
  instruction: string;
  timeLimit: string;
  hint: string;
}

export function AgentCaptcha({ onVerified }: AgentCaptchaProps) {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "solving" | "error" | "success" | "timeout">("idle");
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const loadChallenge = useCallback(async () => {
    cleanup();
    setStatus("loading");
    setError(null);
    setAnswer("");
    setTimeLeft(10);

    try {
      const res = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "agent" }),
      });
      const data = await res.json();
      setChallenge(data);
      setStatus("solving");

      // Start countdown
      const start = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        const remaining = Math.max(0, 10 - elapsed);
        setTimeLeft(Math.ceil(remaining));
        if (remaining <= 0) {
          cleanup();
          setStatus("timeout");
        }
      }, 100);
    } catch {
      setError("Failed to load challenge");
      setStatus("error");
    }
  }, [cleanup]);

  const submitAnswer = async () => {
    if (!challenge || !answer.trim()) return;
    cleanup();
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/challenge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          answer: answer.trim(),
          type: "agent",
        }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        onVerified(data.token);
      } else {
        setError(data.error || "Incorrect");
        setStatus("error");
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
        <div className="text-purple-glow text-sm font-semibold">Agent verified!</div>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <button
        onClick={loadChallenge}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-3"
      >
        <div className="h-6 w-6 rounded border-2 border-zinc-500 flex items-center justify-center text-xs">
          &gt;_
        </div>
        <span className="text-zinc-400">I am an agent (click to prove it)</span>
      </button>
    );
  }

  if (status === "timeout") {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <div className="text-2xl mb-2">&#x23F0;</div>
        <div className="text-red-500 text-sm font-semibold mb-1">Time&apos;s up!</div>
        <div className="text-xs text-zinc-500 mb-4">
          A real agent would have solved this in milliseconds.
          Are you sure you&apos;re not human?
        </div>
        <button
          onClick={loadChallenge}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-400 hover:bg-white/10 transition-all"
        >
          Try again
        </button>
      </div>
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
    <div className="rounded-xl border border-purple-glow/20 bg-[#0a0a15] overflow-hidden">
      {/* Header with timer */}
      <div className="bg-purple-glow/10 px-4 py-3 border-b border-purple-glow/20 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-purple-glow uppercase tracking-wider">
            Prove You Are an Agent
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">{challenge.instruction}</div>
        </div>
        <div className={`text-lg font-mono font-bold ${timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-purple-glow"}`}>
          {timeLeft}s
        </div>
      </div>

      {/* Challenges */}
      <div className="p-4 space-y-3">
        {challenge.challenges.map((c) => (
          <div key={c.id} className="rounded-lg bg-black/40 border border-white/5 p-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
              {c.instruction}
            </div>
            <code className="text-sm font-mono text-cyan-glow break-all">
              {c.expression || c.input}
            </code>
          </div>
        ))}

        <div>
          <label className="text-[10px] text-zinc-600 block mb-1">Your answer (math:reverse)</label>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
            placeholder="e.g., 123456:abcdefgh"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm font-mono text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-purple-glow/30"
            autoFocus
          />
        </div>

        {error && (
          <div className="text-xs text-red-500">{error}</div>
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
            disabled={!answer.trim()}
            className="rounded-lg bg-purple-glow/20 border border-purple-glow/30 px-5 py-2 text-sm font-medium text-purple-glow hover:bg-purple-glow/30 transition-all disabled:opacity-30"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-white/5 text-[10px] text-zinc-700 text-center">
        {challenge.hint}
      </div>
    </div>
  );
}
