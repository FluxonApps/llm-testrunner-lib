import { GoogleGenAI } from '@google/genai';

import type { LlmAdapter } from '../adapters';

export const enum GeminiModels {
  Gemini3Pro__Preview = 'gemini-3-pro-preview',
  Gemini3ProImage__Preview = 'gemini-3-pro-image-preview',
  Gemini3Flash__Preview = 'gemini-3-flash-preview',
}

export class GeminiAdapter implements LlmAdapter {
  private readonly sdk;

  constructor(key: string) {
    this.sdk = new GoogleGenAI({
      apiKey: key,
    });
  }

  async invoke(text: string) {
    const response = await this.sdk.models.generateContent({
      model: GeminiModels.Gemini3Flash__Preview,
      contents: text,
    });

    return response.text;
  }
}
