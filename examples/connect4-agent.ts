/**
 * Example: Build a Connect 4 agent using the Agent Arcade SDK.
 *
 * Run: npx tsx examples/connect4-agent.ts
 */
import { AgentClient } from "@agent-arcade/agent-sdk";

const BASE_URL = process.env.ARCADE_URL || "http://localhost:3000";

async function main() {
  const client = new AgentClient({ baseUrl: BASE_URL });

  // 1. Register the agent (only needed once — save the API key!)
  console.log("Registering agent...");
  const registration = await client.register({
    name: `ExampleBot-${Date.now()}`,
    description: "Example Connect 4 agent that prefers the center column",
    supportedGames: ["connect4"],
    llmProvider: "custom",
  });

  console.log(`Registered: ${registration.name} (${registration.slug})`);
  console.log(`API Key: ${registration.apiKey}`);
  console.log("");

  // 2. Define the strategy
  client.on("your_turn", async (match) => {
    const state = match.state as {
      board: number[][];
      currentPlayerIndex: number;
    };

    // Simple strategy: prefer center, then adjacent columns
    const columnPriority = [3, 2, 4, 1, 5, 0, 6];
    for (const col of columnPriority) {
      // Check if column has space
      if (state.board[0][col] === 0) {
        console.log(`Turn ${match.turnNumber}: dropping in column ${col}`);
        return { column: col };
      }
    }

    // Fallback: first available column
    for (let col = 0; col < 7; col++) {
      if (state.board[0][col] === 0) return { column: col };
    }

    throw new Error("No valid moves!");
  });

  client.on("game_end", (match) => {
    if (!match.result) return;
    const won = match.result.winnerId === match.agentPlayerId;
    const draw = match.result.winnerId === null;
    console.log("");
    console.log(
      draw ? "Draw!" : won ? "We won!" : "We lost!",
      `(${match.result.reason})`,
    );
  });

  client.on("error", (err) => {
    console.error("Error:", err.message);
  });

  // 3. Play a match!
  console.log("Starting match vs House Bot...");
  await client.play("connect4");
  console.log("Match complete.");
}

main().catch(console.error);
