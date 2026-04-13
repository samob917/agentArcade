import { matchStore } from "./match-store";
import { ensureGamesRegistered } from "./register-games";

export interface QueueEntry {
  id: string;
  userId: string;
  userName: string;
  gameSlug: string;
  joinedAt: number;
}

export interface OnlineMatch {
  matchId: string;
  gameSlug: string;
  players: {
    userId: string;
    userName: string;
    playerId: string; // in-game player ID
    seat: number;
  }[];
  status: "waiting" | "in_progress" | "completed";
  createdAt: number;
}

class Matchmaking {
  /** gameSlug -> queue of waiting players */
  private queues = new Map<string, QueueEntry[]>();
  /** matchId -> online match metadata */
  private onlineMatches = new Map<string, OnlineMatch>();
  /** queueEntryId -> matchId (once matched) */
  private matchResults = new Map<string, string>();

  /**
   * Join the matchmaking queue. Returns a queue entry ID.
   * Poll getQueueStatus() to check if matched.
   */
  joinQueue(userId: string, userName: string, gameSlug: string): QueueEntry {
    ensureGamesRegistered();

    // Check if already in queue
    const queue = this.queues.get(gameSlug) || [];
    const existing = queue.find((e) => e.userId === userId);
    if (existing) return existing;

    const entry: QueueEntry = {
      id: crypto.randomUUID(),
      userId,
      userName,
      gameSlug,
      joinedAt: Date.now(),
    };

    queue.push(entry);
    this.queues.set(gameSlug, queue);

    // Try to match immediately
    this.tryMatch(gameSlug);

    return entry;
  }

  /**
   * Leave the queue.
   */
  leaveQueue(entryId: string): void {
    for (const [slug, queue] of this.queues.entries()) {
      const idx = queue.findIndex((e) => e.id === entryId);
      if (idx >= 0) {
        queue.splice(idx, 1);
        this.queues.set(slug, queue);
        return;
      }
    }
  }

  /**
   * Check queue status. Returns matchId if matched, null if still waiting.
   */
  getQueueStatus(entryId: string): {
    status: "waiting" | "matched";
    matchId?: string;
    position?: number;
    onlineMatch?: OnlineMatch;
  } {
    // Check if already matched
    const matchId = this.matchResults.get(entryId);
    if (matchId) {
      const onlineMatch = this.onlineMatches.get(matchId);
      return { status: "matched", matchId, onlineMatch };
    }

    // Still in queue — find position
    for (const queue of this.queues.values()) {
      const idx = queue.findIndex((e) => e.id === entryId);
      if (idx >= 0) {
        return { status: "waiting", position: idx + 1 };
      }
    }

    // Entry not found — might have been cleaned up
    return { status: "waiting", position: 0 };
  }

  /**
   * Get an online match by matchId.
   */
  getOnlineMatch(matchId: string): OnlineMatch | undefined {
    return this.onlineMatches.get(matchId);
  }

  /**
   * Get queue size for a game.
   */
  getQueueSize(gameSlug: string): number {
    return (this.queues.get(gameSlug) || []).length;
  }

  private tryMatch(gameSlug: string): void {
    const queue = this.queues.get(gameSlug);
    if (!queue || queue.length < 2) return;

    // Match first two players
    const player1 = queue.shift()!;
    const player2 = queue.shift()!;
    this.queues.set(gameSlug, queue);

    // Create the actual game match
    const p1Id = crypto.randomUUID();
    const p2Id = crypto.randomUUID();

    const gamePlayers = [
      { id: p1Id, seat: 0, isHuman: true, displayName: player1.userName },
      { id: p2Id, seat: 1, isHuman: true, displayName: player2.userName },
    ];

    const match = matchStore.create(gameSlug, gamePlayers);

    const onlineMatch: OnlineMatch = {
      matchId: match.id,
      gameSlug,
      players: [
        { userId: player1.userId, userName: player1.userName, playerId: p1Id, seat: 0 },
        { userId: player2.userId, userName: player2.userName, playerId: p2Id, seat: 1 },
      ],
      status: "in_progress",
      createdAt: Date.now(),
    };

    this.onlineMatches.set(match.id, onlineMatch);
    this.matchResults.set(player1.id, match.id);
    this.matchResults.set(player2.id, match.id);
  }
}

export const matchmaking = new Matchmaking();
