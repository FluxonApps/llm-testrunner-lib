import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, EvaluationResult } from '../lib/evaluation/types';
import { EvaluationApproach } from '../lib/evaluation/constants';
import { performLlmJudgeEvaluation } from '../lib/evaluation/evaluators/llm-judge/llm-judge-evaluator';
import { criteriaArraySchema } from '../schemas/expected-outcome';
import type { Criterion, LlmJudge } from '../types/llm-test-runner';

export interface EvaluateLlmJudgeInput {
  actualResponse: string;
  question: string;
  expectedOutcome: string;
  llmJudge: LlmJudge;
  criteria?: Criterion[];
  threshold?: number;
}

export async function evaluateLlmJudge(
  input: EvaluateLlmJudgeInput,
): Promise<EvaluationResult> {
  const { actualResponse, question, expectedOutcome, llmJudge, criteria, threshold } =
    input;

  if (criteria !== undefined) {
    const parsed = criteriaArraySchema.safeParse(criteria);
    if (!parsed.success) {
      throw new Error(
        `evaluateLlmJudge: invalid criteria — ${parsed.error.issues[0].message}`,
      );
    }
  }

  const request: EvaluationRequest = {
    testCaseId: randomUUID(),
    question,
    actualResponse,
    expectedOutcome,
    llmJudge,
    evaluationParameters: {
      approach: EvaluationApproach.LLM_JUDGE,
      ...(threshold !== undefined ? { threshold } : {}),
      ...(criteria !== undefined ? { criteria } : {}),
    },
  };
  return performLlmJudgeEvaluation(request);
}
