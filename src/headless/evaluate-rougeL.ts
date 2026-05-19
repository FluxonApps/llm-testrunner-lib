import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, MatchResult } from '../common/evaluation/types';
import { EvaluationApproach } from '../common/evaluation/constants';
import { performRougeLEvaluation } from '../common/evaluation/evaluators/rougeL-evaluator';

export async function evaluateRougeL(
  actualResponse: string,
  expectedOutcome: string,
  threshold?: number,
): Promise<MatchResult> {
  const request: EvaluationRequest = {
    testCaseId: randomUUID(),
    question: '',
    actualResponse,
    expectedOutcome,
    evaluationParameters: {
      approach: EvaluationApproach.ROUGE_L,
      ...(threshold !== undefined ? { threshold } : {}),
    },
  };
  return performRougeLEvaluation(request);
}
