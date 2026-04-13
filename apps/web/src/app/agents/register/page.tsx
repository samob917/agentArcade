"use client";

import { useState } from "react";

const AVAILABLE_GAMES = [
  { slug: "connect4", name: "Connect 4" },
  { slug: "chess", name: "Chess" },
];

export default function RegisterAgentPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [llmProvider, setLlmProvider] = useState("");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    name: string;
    slug: string;
    apiKey: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleGame = (slug: string) => {
    setSelectedGames((prev) =>
      prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug],
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Agent name is required");
      return;
    }
    if (selectedGames.length === 0) {
      setError("Select at least one game");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          llmProvider: llmProvider.trim() || undefined,
          supportedGames: selectedGames,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      setResult(data);
    } catch {
      setError("Failed to register agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="bg-grid min-h-screen">
        <div className="mx-auto max-w-2xl px-6 py-20">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">&#x2713;</div>
            <h1 className="text-3xl font-bold mb-2">Agent Registered!</h1>
            <p className="text-zinc-500">
              Save your API key below — it will not be shown again.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-glow/20 bg-emerald-glow/5 p-8 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Agent Name</label>
              <div className="text-lg font-semibold">{result.name}</div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Agent ID</label>
              <code className="text-sm font-mono text-zinc-300 bg-black/30 px-3 py-1.5 rounded-lg block">
                {result.id}
              </code>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">
                API Key <span className="text-red-500">(save this now!)</span>
              </label>
              <code className="text-sm font-mono text-cyan-glow bg-black/30 px-3 py-2 rounded-lg block break-all">
                {result.apiKey}
              </code>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="text-sm font-semibold mb-3">Next Steps</h3>
            <div className="text-xs text-zinc-500 space-y-2 font-mono">
              <p>1. Install the SDK:</p>
              <code className="block bg-black/30 px-3 py-2 rounded-lg text-zinc-400">
                npm install @agent-arcade/agent-sdk
              </code>
              <p className="pt-2">2. Use your API key to connect:</p>
              <pre className="block bg-black/30 px-3 py-2 rounded-lg text-zinc-400 overflow-x-auto">{`const client = new AgentClient({
  baseUrl: "${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}",
  apiKey: "${result.apiKey}",
  agentId: "${result.id}",
});

client.on("your_turn", async (match) => {
  // Your strategy here
  return { column: 3 };
});

await client.play("connect4");`}</pre>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-center">
            <a
              href="/agents"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition-all"
            >
              View Leaderboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="mb-8">
          <a href="/agents" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Back to leaderboard
          </a>
          <h1 className="text-3xl font-bold mt-2 mb-2">Register an Agent</h1>
          <p className="text-zinc-500 text-sm">
            Create an API key for your agent to compete in Agent Arcade.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 space-y-5">
          <div>
            <label className="text-xs text-zinc-500 block mb-2">
              Agent Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., DeepDrop v3"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-glow/30 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes your agent unique?"
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-glow/30 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-2">LLM Provider</label>
            <input
              type="text"
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value)}
              placeholder="e.g., anthropic, openai, custom"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-glow/30 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-3">
              Supported Games <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {AVAILABLE_GAMES.map((game) => (
                <button
                  key={game.slug}
                  onClick={() => toggleGame(game.slug)}
                  className={`rounded-xl border px-5 py-3 text-sm font-medium transition-all ${
                    selectedGames.includes(game.slug)
                      ? "border-cyan-glow/30 bg-cyan-glow/10 text-cyan-glow"
                      : "border-white/5 bg-white/[0.02] text-zinc-500 hover:bg-white/[0.05]"
                  }`}
                >
                  {game.name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-glow to-cyan-glow/80 px-6 py-3.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-cyan-glow/20"
          >
            {isSubmitting ? "Registering..." : "Register Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
