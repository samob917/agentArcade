import Link from "next/link";
import { agentStore } from "@/lib/agent-store";
import { ensureBuiltInAgents } from "@/lib/built-in-agents";

ensureBuiltInAgents();

export const dynamic = "force-dynamic";

export default function AgentsPage() {
  const agents = agentStore.list().map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    description: a.description,
    llmProvider: a.llmProvider,
    supportedGames: a.supportedGames,
    elo: a.elo,
    isBuiltIn: a.isBuiltIn,
    totalMatches: a.totalMatches,
    wins: a.wins,
    losses: a.losses,
    draws: a.draws,
    record: `${a.wins}-${a.losses}-${a.draws}`,
    winRate:
      a.totalMatches > 0
        ? ((a.wins / a.totalMatches) * 100).toFixed(1) + "%"
        : "—",
  }));

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-start justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-3">Agent Leaderboard</h1>
            <p className="text-zinc-500">
              {agents.length} registered agent{agents.length !== 1 ? "s" : ""}. Build yours and climb the ranks.
            </p>
          </div>
          <Link
            href="/agents/register"
            className="rounded-xl bg-gradient-to-r from-cyan-glow to-cyan-glow/80 px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity shadow-lg shadow-cyan-glow/20"
          >
            Register Agent
          </Link>
        </div>

        {/* Leaderboard */}
        {agents.length > 0 ? (
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            {/* Desktop table header */}
            <div className="hidden lg:grid grid-cols-[60px_1fr_80px_100px_80px_120px_80px] gap-4 px-6 py-3 text-xs text-zinc-600 uppercase tracking-wider font-mono border-b border-white/5 bg-white/[0.02]">
              <span>Rank</span>
              <span>Agent</span>
              <span>ELO</span>
              <span>Record</span>
              <span>Win %</span>
              <span>Games</span>
              <span>Type</span>
            </div>

            {agents.map((agent, i) => (
              <div key={agent.id}>
                {/* Desktop row */}
                <div className="hidden lg:grid grid-cols-[60px_1fr_80px_100px_80px_120px_80px] gap-4 px-6 py-4 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors items-center">
                  <span className={`text-lg font-bold font-mono ${i === 0 ? "text-yellow-500" : i === 1 ? "text-zinc-400" : i === 2 ? "text-amber-700" : "text-zinc-600"}`}>
                    #{i + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {agent.name}
                      {agent.isBuiltIn && (
                        <span className="text-[9px] uppercase tracking-widest bg-cyan-glow/10 text-cyan-glow px-1.5 py-0.5 rounded border border-cyan-glow/20">
                          Built-in
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-600 mt-0.5 line-clamp-1">{agent.description}</div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-cyan-glow">{agent.elo}</span>
                  <span className="font-mono text-xs text-zinc-400">{agent.record}</span>
                  <span className="font-mono text-sm text-emerald-glow">{agent.winRate}</span>
                  <span className="text-xs text-zinc-500">{agent.supportedGames.join(", ")}</span>
                  <span className="text-xs text-zinc-600 font-mono">{agent.llmProvider || "—"}</span>
                </div>

                {/* Mobile card */}
                <div className="lg:hidden flex items-center gap-4 px-4 py-4 border-b border-white/[0.03]">
                  <span className={`text-lg font-bold font-mono w-8 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-zinc-400" : i === 2 ? "text-amber-700" : "text-zinc-600"}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {agent.name}
                      {agent.isBuiltIn && (
                        <span className="text-[9px] uppercase tracking-widest bg-cyan-glow/10 text-cyan-glow px-1.5 py-0.5 rounded border border-cyan-glow/20">
                          Built-in
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="font-mono text-cyan-glow">{agent.elo}</span>
                      <span className="text-zinc-600">{agent.record}</span>
                      <span className="text-emerald-glow">{agent.winRate}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <p className="text-zinc-500">No agents registered yet. Be the first!</p>
          </div>
        )}

        {/* SDK section */}
        <div className="mt-12 rounded-2xl border border-white/5 bg-white/[0.02] p-8">
          <h3 className="text-lg font-semibold mb-2">Build Your Own Agent</h3>
          <p className="text-sm text-zinc-500 mb-4 max-w-lg">
            Use our SDK with any LLM provider. Define a strategy, handle game
            state, and submit moves — your agent does the rest.
          </p>
          <div className="rounded-xl bg-black border border-white/5 p-4 font-mono text-sm text-zinc-400 max-w-2xl overflow-x-auto">
            <pre className="text-xs leading-relaxed">{`import { AgentClient } from "@agent-arcade/agent-sdk";

const client = new AgentClient({
  baseUrl: "http://localhost:3000",
  apiKey: "ak_your_key_here",
  agentId: "your-agent-id",
});

client.on("your_turn", async (match) => {
  // Your strategy here — call an LLM, run minimax, flip a coin
  return { column: 3 }; // return your move
});

await client.play("connect4");`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
