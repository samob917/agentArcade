import { gameRegistry, connect4Game, chessGame, pokerGame } from "@agent-arcade/game-engine";
import { ensureBuiltInAgents } from "./built-in-agents";

let registered = false;

export function ensureGamesRegistered() {
  if (registered) return;
  gameRegistry.register(connect4Game);
  gameRegistry.register(chessGame);
  gameRegistry.register(pokerGame);
  ensureBuiltInAgents();
  registered = true;
}
