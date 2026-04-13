import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { RoomManager } from "./rooms.js";
import { RedisClient } from "./redis.js";
import type { ClientMessage, ServerMessage } from "@agent-arcade/shared";

const PORT = Number(process.env.WS_PORT) || 3001;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", rooms: rooms.getRoomCount() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });
const rooms = new RoomManager();
const redis = new RedisClient(REDIS_URL);

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const token = url.searchParams.get("token");
  const playerId = url.searchParams.get("playerId");

  // For now, simple auth — just use playerId param
  // TODO: verify API key / JWT token
  const connId = playerId || crypto.randomUUID();

  console.log(`[WS] Connected: ${connId}`);
  send(ws, { type: "connected", playerId: connId });

  ws.on("message", (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    switch (msg.type) {
      case "join_match":
        rooms.addPlayer(msg.matchId, connId, ws);
        console.log(`[WS] ${connId} joined match ${msg.matchId}`);
        break;

      case "spectate":
        rooms.addSpectator(msg.matchId, ws);
        console.log(`[WS] Spectator joined match ${msg.matchId}`);
        break;

      case "move":
        // Moves go through the REST API, not WebSocket
        // The REST API publishes to Redis, and we broadcast from there
        send(ws, {
          type: "error",
          message: "Submit moves via REST API /api/matches/{id}/moves",
        });
        break;

      case "ping":
        send(ws, { type: "pong" });
        break;

      default:
        send(ws, { type: "error", message: `Unknown message type` });
    }
  });

  ws.on("close", () => {
    rooms.removeConnection(connId, ws);
    console.log(`[WS] Disconnected: ${connId}`);
  });

  ws.on("error", (err) => {
    console.error(`[WS] Error from ${connId}:`, err.message);
  });
});

// Subscribe to Redis for match updates
redis.subscribe("match:*", (channel, message) => {
  // channel format: match:{matchId}:update
  const parts = channel.split(":");
  const matchId = parts[1];

  try {
    const data = JSON.parse(message);
    const room = rooms.getRoom(matchId);
    if (!room) return;

    // Broadcast state update to all players
    for (const [pid, playerWs] of room.players) {
      send(playerWs, {
        type: "state_update",
        matchId,
        state: data.visibleStates?.[pid] ?? data.state,
        turnNumber: data.turnNumber,
        activePlayers: data.activePlayers,
      });
    }

    // Broadcast to spectators (with optional delay)
    const spectatorState = data.visibleStates?.spectator ?? data.state;
    const spectatorMsg: ServerMessage = {
      type: "state_update",
      matchId,
      state: spectatorState,
      turnNumber: data.turnNumber,
      activePlayers: data.activePlayers,
    };

    if (room.spectatorDelayMs > 0) {
      setTimeout(() => {
        for (const spectatorWs of room.spectators) {
          send(spectatorWs, spectatorMsg);
        }
      }, room.spectatorDelayMs);
    } else {
      for (const spectatorWs of room.spectators) {
        send(spectatorWs, spectatorMsg);
      }
    }

    // Handle game end
    if (data.result) {
      const endMsg: ServerMessage = {
        type: "game_end",
        matchId,
        result: data.result,
      };
      for (const [, playerWs] of room.players) {
        send(playerWs, endMsg);
      }
      for (const spectatorWs of room.spectators) {
        send(spectatorWs, endMsg);
      }
      // Clean up room after a delay
      setTimeout(() => rooms.removeRoom(matchId), 30_000);
    }
  } catch (err) {
    console.error(`[WS] Error processing Redis message:`, err);
  }
});

server.listen(PORT, () => {
  console.log(`[WS] WebSocket server running on ws://localhost:${PORT}`);
  console.log(`[WS] Health check: http://localhost:${PORT}/health`);
});
