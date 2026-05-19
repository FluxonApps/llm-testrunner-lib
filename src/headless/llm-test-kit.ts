import type { LLMTestKitConfig } from './types';

export class LLMTestKit {
  constructor(private readonly config: LLMTestKitConfig) {}

  async invoke(prompt: string): Promise<string> {
    return this.config.invoke(prompt);
  }
}
