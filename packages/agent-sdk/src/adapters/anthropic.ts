import Anthropic from "@anthropic-ai/sdk";
import type { MatchState } from "../types";
import {
  type LLMAdapter,
  type LLMAdapterOptions,
  getGameSystemPrompt,
  formatGameState,
  getMoveToolDef,
} from "./base";

export interface AnthropicAdapterOptions {
  /** Anthropic API key */
  apiKey: string;
  /** Model to use (default: claude-sonnet-4-20250514) */
  model?: string;
}

export class AnthropicAdapter implements LLMAdapter {
  private client: Anthropic;
  private model: string;

  constructor(options: AnthropicAdapterOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model || "claude-sonnet-4-20250514";
  }

  async decideMove(
    match: MatchState,
    options?: LLMAdapterOptions,
  ): Promise<unknown> {
    const systemPrompt =
      options?.systemPrompt || getGameSystemPrompt(match.gameSlug);
    const gameState = formatGameState(match);
    const toolDef = getMoveToolDef(match.gameSlug);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature ?? 0.3,
      system: systemPrompt,
      tools: [
        {
          name: toolDef.name,
          description: toolDef.description,
          input_schema: toolDef.input_schema as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: "make_move" },
      messages: [
        {
          role: "user",
          content: `Current game state:\n\n${gameState}\n\nIt's your turn. Analyze the position and make your move using the make_move tool.`,
        },
      ],
    });

    // Extract the tool call
    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "make_move") {
        return block.input;
      }
    }

    throw new Error("Claude did not return a tool call");
  }
}
