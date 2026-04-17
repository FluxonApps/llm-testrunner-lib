import { GoogleGenAI } from '@google/genai';

import type { LlmAdapter } from '../adapters';

export const enum GeminiModels {
  Gemini3Pro__Preview = 'gemini-3-pro-preview',
  Gemini3ProImage__Preview = 'gemini-3-pro-image-preview',
  Gemini3Flash__Preview = 'gemini-3-flash-preview',
}

export class GeminiAdapter implements LlmAdapter {
  private readonly sdk;
  private readonly modelId: string;

  constructor(
    key: string,
    modelId: string = GeminiModels.Gemini3Flash__Preview,
  ) {
    this.sdk = new GoogleGenAI({
      apiKey: key,
    });
    this.modelId = modelId;
  }

  async invoke(text: string) {
    const response = await this.sdk.models.generateContent({
      model: this.modelId,
      contents: text,
    });

    return response.text;
  }
}
