import type { AiDifficulty } from "@agent-arcade/game-engine";
import { dbCreateAgent, dbListAgents, dbUpdateAgentStats } from "./db-repos";
import { hasDb } from "./db";

export interface RegisteredAgent {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  callbackUrl: string | null;
  llmProvider: string | null;
  supportedGames: string[];
  elo: number;
  isBuiltIn: boolean;
  isActive: boolean;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
  // For built-in agents, store their difficulty level
  builtInDifficulty?: AiDifficulty;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "ak_";
  for (let i = 0; i < 48; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// Simple hash for dev — in production use bcrypt
function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

class AgentStore {
  private agents = new Map<string, RegisteredAgent>();
  // apiKeyHash -> agentId for auth lookups
  private keyIndex = new Map<string, string>();
  // raw key stored temporarily for built-in agents (dev only)
  private rawKeys = new Map<string, string>();

  register(input: {
    name: string;
    description?: string;
    ownerId?: string;
    callbackUrl?: string;
    llmProvider?: string;
    supportedGames: string[];
    isBuiltIn?: boolean;
    builtInDifficulty?: AiDifficulty;
  }): { agent: RegisteredAgent; apiKey: string } {
    const id = crypto.randomUUID();
    const apiKey = generateApiKey();
    const apiKeyHash = hashKey(apiKey);
    const slug = slugify(input.name);

    // Check for duplicate slug
    for (const agent of this.agents.values()) {
      if (agent.slug === slug) {
        throw new Error(`Agent with slug "${slug}" already exists`);
      }
    }

    const agent: RegisteredAgent = {
      id,
      name: input.name,
      slug,
      description: input.description || "",
      ownerId: input.ownerId || "system",
      apiKeyHash,
      apiKeyPrefix: apiKey.slice(0, 7) + "...",
      callbackUrl: input.callbackUrl || null,
      llmProvider: input.llmProvider || null,
      supportedGames: input.supportedGames,
      elo: 1200,
      isBuiltIn: input.isBuiltIn || false,
      isActive: true,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: new Date(),
      builtInDifficulty: input.builtInDifficulty,
    };

    this.agents.set(id, agent);
    this.keyIndex.set(apiKeyHash, id);
    this.rawKeys.set(id, apiKey);

    // Persist to DB if available
    if (hasDb()) {
      dbCreateAgent({
        name: agent.name,
        slug: agent.slug,
        description: agent.description,
        ownerId: agent.ownerId,
        apiKeyHash: agent.apiKeyHash,
        apiKeyPrefix: agent.apiKeyPrefix,
        supportedGames: agent.supportedGames,
        llmProvider: agent.llmProvider || undefined,
        isBuiltIn: agent.isBuiltIn,
      }).catch((err) => console.error("DB agent create error:", err));
    }

    return { agent, apiKey };
  }

  getById(id: string): RegisteredAgent | undefined {
    return this.agents.get(id);
  }

  getBySlug(slug: string): RegisteredAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.slug === slug) return agent;
    }
    return undefined;
  }

  getByApiKey(rawKey: string): RegisteredAgent | undefined {
    const hash = hashKey(rawKey);
    const id = this.keyIndex.get(hash);
    if (!id) return undefined;
    return this.agents.get(id);
  }

  getRawKey(agentId: string): string | undefined {
    return this.rawKeys.get(agentId);
  }

  list(): RegisteredAgent[] {
    return Array.from(this.agents.values())
      .filter((a) => a.isActive)
      .sort((a, b) => b.elo - a.elo);
  }

  recordResult(agentId: string, outcome: "win" | "loss" | "draw", eloChange: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    agent.totalMatches++;
    if (outcome === "win") agent.wins++;
    else if (outcome === "loss") agent.losses++;
    else agent.draws++;
    agent.elo = Math.max(0, agent.elo + eloChange);

    // Persist to DB
    if (hasDb()) {
      dbUpdateAgentStats(agentId, outcome, eloChange).catch((err) =>
        console.error("DB agent stats error:", err),
      );
    }
  }
}

export const agentStore = new AgentStore();
