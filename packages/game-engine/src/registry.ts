import type { GameDefinition } from "./types";

/**
 * Registry of all available games. New games register themselves here.
 * Adding a game: implement GameDefinition, then call gameRegistry.register(myGame).
 */
class GameRegistry {
  private games = new Map<string, GameDefinition>();

  register(game: GameDefinition): void {
    if (this.games.has(game.slug)) {
      throw new Error(`Game "${game.slug}" is already registered`);
    }
    this.games.set(game.slug, game);
  }

  get(slug: string): GameDefinition | undefined {
    return this.games.get(slug);
  }

  getOrThrow(slug: string): GameDefinition {
    const game = this.games.get(slug);
    if (!game) {
      throw new Error(`Game "${slug}" is not registered`);
    }
    return game;
  }

  list(): GameDefinition[] {
    return Array.from(this.games.values());
  }

  has(slug: string): boolean {
    return this.games.has(slug);
  }
}

export const gameRegistry = new GameRegistry();
