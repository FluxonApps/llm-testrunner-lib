import { LLMEvaluationEngine } from './evaluation-engine';
import type {
  EvaluationRequest,
  EvaluationResult,
  KeywordMatch,
  EvaluationCallback,
} from './types';

export { LLMEvaluationEngine };
export type {
  EvaluationRequest,
  EvaluationResult,
  KeywordMatch,
  EvaluationCallback,
};

export async function evaluateLLMResponse(
  request: EvaluationRequest,
  callback: EvaluationCallback,
): Promise<void> {
  const engine = new LLMEvaluationEngine();
  await engine.evaluateResponse(request, callback);
}
