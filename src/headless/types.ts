export type LlmInvokeFn = (prompt: string) => Promise<string>;

export interface LLMTestKitConfig {
  invoke: LlmInvokeFn;
}
