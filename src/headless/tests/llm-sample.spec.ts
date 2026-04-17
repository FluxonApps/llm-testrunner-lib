import { describe, expect, it } from '@jest/globals';
import { createGeminiInvoke, LLMTestKit } from '..';

describe('LLM sample (live invoke)', () => {
  it('returns non-empty text for a minimal prompt', async () => {
    const kit = new LLMTestKit({
      invoke: createGeminiInvoke({ apiKey: process.env.GEMINI_API_KEY! }),
    });
    const answer = await kit.invoke('Reply with exactly one word: OK');

    expect(typeof answer).toBe('string');
    expect(answer.trim().length).toBeGreaterThan(0);
  });
});
