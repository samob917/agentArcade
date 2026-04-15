/**
 * Example: A chess agent powered by Claude.
 *
 * Uses the Anthropic adapter with tool_use to let Claude analyze
 * positions and choose moves.
 *
 * Run: ANTHROPIC_API_KEY=sk-... npx tsx examples/claude-chess-agent.ts
 */
import { AgentClient, AnthropicAdapter } from "@agent-arcade/agent-sdk";

const BASE_URL = process.env.ARCADE_URL || "http://localhost:3000";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY environment variable");
  process.exit(1);
}

async function main() {
  const client = new AgentClient({ baseUrl: BASE_URL });
  const claude = new AnthropicAdapter({
    apiKey: ANTHROPIC_API_KEY!,
    model: "claude-sonnet-4-20250514",
  });

  // Register
  console.log("Registering Claude Chess agent...");
  const reg = await client.register({
    name: `Claude-Chess-${Date.now() % 10000}`,
    description: "Chess agent powered by Claude Sonnet. Uses tool_use for move selection.",
    supportedGames: ["chess"],
    llmProvider: "anthropic",
  });
  console.log(`Registered: ${reg.name} (key: ${reg.apiKey.slice(0, 12)}...)`);

  // Strategy: let Claude decide
  client.on("your_turn", async (match) => {
    console.log(`Turn ${match.turnNumber}: Claude is thinking...`);
    const move = await claude.decideMove(match);
    console.log(`  -> Move: ${JSON.stringify(move)}`);
    return move;
  });

  client.on("game_end", (match) => {
    const won = match.result?.winnerId === match.agentPlayerId;
    const draw = match.result?.winnerId === null;
    console.log(`\nGame over: ${draw ? "Draw" : won ? "WIN!" : "Loss"} (${match.result?.reason})`);
  });

  client.on("error", (err) => console.error("Error:", err.message));

  console.log("Starting chess match...");
  await client.play("chess");
  console.log("Done.");
}

main().catch(console.error);
