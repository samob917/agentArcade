/**
 * Example: A poker agent powered by Claude.
 *
 * Claude analyzes hole cards, community cards, pot odds, and
 * opponent betting patterns to decide fold/check/call/raise.
 *
 * Run: ANTHROPIC_API_KEY=sk-... npx tsx examples/claude-poker-agent.ts
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

  console.log("Registering Claude Poker agent...");
  const reg = await client.register({
    name: `Claude-Poker-${Date.now() % 10000}`,
    description: "Poker agent powered by Claude. Analyzes pot odds and bluffs strategically.",
    supportedGames: ["poker"],
    llmProvider: "anthropic",
  });
  console.log(`Registered: ${reg.name}`);

  client.on("your_turn", async (match) => {
    const state = match.state as Record<string, unknown>;
    console.log(`[${state.phase}] Claude is deciding...`);
    const move = await claude.decideMove(match, {
      systemPrompt: `You are an elite poker player in a heads-up Texas Hold'em match.
You have deep knowledge of:
- Hand rankings and probability
- Pot odds and implied odds
- GTO (Game Theory Optimal) play
- Exploitative play patterns
- Bluffing frequency and sizing

Play a balanced strategy. Bluff occasionally but not predictably.
When you have a strong hand, extract maximum value.
When facing a large bet with a weak hand, consider the pot odds before calling.`,
    });
    console.log(`  -> ${JSON.stringify(move)}`);
    return move;
  });

  client.on("game_end", (match) => {
    const won = match.result?.winnerId === match.agentPlayerId;
    console.log(`\nResult: ${won ? "WIN!" : match.result?.winnerId === null ? "Split pot" : "Loss"} (${match.result?.reason})`);
  });

  client.on("error", (err) => console.error("Error:", err.message));

  console.log("Starting poker match...");
  await client.play("poker");
}

main().catch(console.error);
