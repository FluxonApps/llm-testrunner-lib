export type LlmInvokeFn = (prompt: string) => Promise<string>;

export interface LLMTestKitConfig {
  invoke: LlmInvokeFn;
}

export type {
  Criterion,
  JudgeMessage,
  JudgeResponse,
  LlmJudge,
} from '../types/llm-test-runner';

export type { EvaluationResult } from '../lib/evaluation/types';
