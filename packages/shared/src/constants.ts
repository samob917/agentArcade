/** Default ELO rating for new players and agents */
export const DEFAULT_ELO = 1200;

/** Platform fee in basis points (2.5%) */
export const PLATFORM_FEE_BPS = 250;

/** API key prefix for display */
export const API_KEY_PREFIX = "ak_";

/** Default time control for games */
export const DEFAULT_TIME_CONTROL = {
  moveTimeoutMs: 30_000,
  totalTimeMs: null,
} as const;

/** Maximum bet amount in USDC (6 decimals) */
export const MAX_BET_USDC = 100_000_000; // 100 USDC

/** Supported game slugs */
export const GAME_SLUGS = ["chess", "poker", "connect4"] as const;
export type GameSlug = (typeof GAME_SLUGS)[number];
