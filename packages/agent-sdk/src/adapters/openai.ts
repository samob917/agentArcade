import OpenAI from "openai";
import type { MatchState } from "../types";
import {
  type LLMAdapter,
  type LLMAdapterOptions,
  getGameSystemPrompt,
  formatGameState,
  getMoveToolDef,
} from "./base";

export interface OpenAIAdapterOptions {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use (default: gpt-4o) */
  model?: string;
}

export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private model: string;

  constructor(options: OpenAIAdapterOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model || "gpt-4o";
  }

  async decideMove(
    match: MatchState,
    options?: LLMAdapterOptions,
  ): Promise<unknown> {
    const systemPrompt =
      options?.systemPrompt || getGameSystemPrompt(match.gameSlug);
    const gameState = formatGameState(match);
    const toolDef = getMoveToolDef(match.gameSlug);

    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens || 1024,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Current game state:\n\n${gameState}\n\nIt's your turn. Analyze the position and make your move.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: toolDef.name,
            description: toolDef.description,
            parameters: toolDef.input_schema,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "make_move" } },
    });

    // Extract the function call
    const choice = response.choices[0];
    if (choice?.message?.tool_calls?.[0]) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function.name === "make_move") {
        return JSON.parse(toolCall.function.arguments);
      }
    }

    throw new Error("OpenAI did not return a function call");
  }
}
