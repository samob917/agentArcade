import type { WebSocket } from "ws";

export interface Room {
  matchId: string;
  players: Map<string, WebSocket>;
  spectators: Set<WebSocket>;
  spectatorDelayMs: number;
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  getRoom(matchId: string): Room | undefined {
    return this.rooms.get(matchId);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  private ensureRoom(matchId: string): Room {
    let room = this.rooms.get(matchId);
    if (!room) {
      room = {
        matchId,
        players: new Map(),
        spectators: new Set(),
        spectatorDelayMs: 0,
      };
      this.rooms.set(matchId, room);
    }
    return room;
  }

  addPlayer(matchId: string, playerId: string, ws: WebSocket): void {
    const room = this.ensureRoom(matchId);
    room.players.set(playerId, ws);
  }

  addSpectator(matchId: string, ws: WebSocket): void {
    const room = this.ensureRoom(matchId);
    room.spectators.add(ws);
  }

  setSpectatorDelay(matchId: string, delayMs: number): void {
    const room = this.rooms.get(matchId);
    if (room) {
      room.spectatorDelayMs = delayMs;
    }
  }

  removeConnection(playerId: string, ws: WebSocket): void {
    for (const room of this.rooms.values()) {
      if (room.players.get(playerId) === ws) {
        room.players.delete(playerId);
      }
      room.spectators.delete(ws);

      // Clean up empty rooms
      if (room.players.size === 0 && room.spectators.size === 0) {
        this.rooms.delete(room.matchId);
      }
    }
  }

  removeRoom(matchId: string): void {
    this.rooms.delete(matchId);
  }
}
