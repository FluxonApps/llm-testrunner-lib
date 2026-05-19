import { describe, expect, it } from '@jest/globals';
import { createGeminiInvoke, LLMTestKit } from '..';

describe('toRouge1Match', () => {
  it('asserts the model response after a live invoke', async () => {
    const kit = new LLMTestKit({
      invoke: createGeminiInvoke({ apiKey: process.env.GEMINI_API_KEY! }),
    });
    const llmResponse = await kit.invoke(
      'What is the capital of Telangana, India? Reply in one short sentence and include the city name.',
    );

    await expect(llmResponse).toRouge1Match('Hyderabad');
  });
});
