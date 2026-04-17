import { GeminiAdapter } from '../services/models/gemini';

import type { LlmInvokeFn } from './types';

const DEFAULT_MODEL = 'gemini-3-flash-preview';

export interface GeminiInvokeOptions {
  apiKey: string;
  model?: string;
}

export function createGeminiInvoke(options: GeminiInvokeOptions): LlmInvokeFn {
  const adapter = new GeminiAdapter(
    options.apiKey,
    options.model ?? DEFAULT_MODEL,
  );

  return async (prompt: string) => {
    const text = await adapter.invoke(prompt);
    if (text == null || String(text).trim() === '') {
      throw new Error('createGeminiInvoke: empty response from model');
    }
    return String(text);
  };
}
