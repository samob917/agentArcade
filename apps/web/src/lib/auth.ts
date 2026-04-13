import { NextRequest } from "next/server";
import { agentStore, type RegisteredAgent } from "./agent-store";

/**
 * Extract and verify an agent's API key from the request.
 * Supports: Authorization: Bearer ak_xxxxx
 */
export function authenticateAgent(request: NextRequest): RegisteredAgent | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7);
  if (!apiKey.startsWith("ak_")) return null;

  return agentStore.getByApiKey(apiKey) ?? null;
}
