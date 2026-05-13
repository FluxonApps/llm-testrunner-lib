import { GoogleGenAI } from '@google/genai';

import type { LlmAdapter } from '../adapters';

export const enum GeminiModels {
  Gemini3Pro__Preview = 'gemini-3-pro-preview',
  Gemini3ProImage__Preview = 'gemini-3-pro-image-preview',
  Gemini3Flash__Preview = 'gemini-3-flash-preview',
}

export interface GeminiInvokeInput {
  /** The user prompt for this turn. */
  prompt: string;
  /** Optional system instructions, sent via Gemini's first-class
   * `systemInstruction` config (NOT concatenated into the user prompt).
   * Used by the judge wiring to keep system + user separated. */
  system?: string;
}

export class GeminiAdapter implements LlmAdapter {
  private readonly sdk;

  constructor(key: string) {
    this.sdk = new GoogleGenAI({
      apiKey: key,
    });
  }

  /**
   * Generate content from Gemini.
   *
   * Accepts either a plain prompt string (single-turn call) or a
   * structured input with explicit system instructions. Structured input
   * lets Gemini treat the system prompt as a first-class directive
   * rather than concatenated user text.
   */
  async invoke(input: string | GeminiInvokeInput) {
    const params: GeminiInvokeInput =
      typeof input === 'string' ? { prompt: input } : input;

    const response = await this.sdk.models.generateContent({
      model: GeminiModels.Gemini3Flash__Preview,
      contents: params.prompt,
      config: params.system
        ? { systemInstruction: params.system }
        : undefined,
    });

    return response.text;
  }
}
