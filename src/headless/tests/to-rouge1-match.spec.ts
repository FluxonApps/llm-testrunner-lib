import { beforeAll, describe, expect, it } from '@jest/globals';
import { installLlmMatchers, LLMTestKit } from '..';

describe('toRouge1Match', () => {
  beforeAll(() => {
    installLlmMatchers(expect);
  });

  it('asserts the model response after a mocked invoke', async () => {
    const kit = new LLMTestKit({
      invoke: async (_prompt) =>
        'The capital of Telangana is Hyderabad.',
    });
    const llmResponse = await kit.invoke(
      'What is the capital of Telangana, India? Reply in one short sentence and include the city name.',
    );

    await expect(llmResponse).toRouge1Match('Hyderabad');
  });
});
