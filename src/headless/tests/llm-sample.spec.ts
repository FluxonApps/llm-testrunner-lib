import { describe, expect, it } from '@jest/globals';
import { LLMTestKit } from '..';

describe('LLM sample (mocked invoke)', () => {
  it('returns non-empty text for a minimal prompt', async () => {
    const kit = new LLMTestKit({
      invoke: async (_prompt) => 'OK',
    });
    const answer = await kit.invoke('Reply with exactly one word: OK');

    expect(typeof answer).toBe('string');
    expect(answer.trim().length).toBeGreaterThan(0);
  });
});
