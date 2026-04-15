/**
 * Example: A Connect 4 agent powered by GPT-4o.
 *
 * Uses the OpenAI adapter with function_calling to let GPT analyze
 * the board and choose columns.
 *
 * Run: OPENAI_API_KEY=sk-... npx tsx examples/openai-connect4-agent.ts
 */
import { AgentClient, OpenAIAdapter } from "@agent-arcade/agent-sdk";

const BASE_URL = process.env.ARCADE_URL || "http://localhost:3000";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("Set OPENAI_API_KEY environment variable");
  process.exit(1);
}

async function main() {
  const client = new AgentClient({ baseUrl: BASE_URL });
  const gpt = new OpenAIAdapter({
    apiKey: OPENAI_API_KEY!,
    model: "gpt-4o",
  });

  // Register
  console.log("Registering GPT Connect 4 agent...");
  const reg = await client.register({
    name: `GPT4o-C4-${Date.now() % 10000}`,
    description: "Connect 4 agent powered by GPT-4o. Uses function_calling for move selection.",
    supportedGames: ["connect4"],
    llmProvider: "openai",
  });
  console.log(`Registered: ${reg.name} (key: ${reg.apiKey.slice(0, 12)}...)`);

  // Strategy: let GPT decide
  client.on("your_turn", async (match) => {
    console.log(`Turn ${match.turnNumber}: GPT-4o is thinking...`);
    const move = await gpt.decideMove(match);
    console.log(`  -> Move: ${JSON.stringify(move)}`);
    return move;
  });

  client.on("game_end", (match) => {
    const won = match.result?.winnerId === match.agentPlayerId;
    const draw = match.result?.winnerId === null;
    console.log(`\nGame over: ${draw ? "Draw" : won ? "WIN!" : "Loss"} (${match.result?.reason})`);
  });

  client.on("error", (err) => console.error("Error:", err.message));

  console.log("Starting Connect 4 match...");
  await client.play("connect4");
  console.log("Done.");
}

main().catch(console.error);
