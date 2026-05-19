import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, MatchResult } from '../common/evaluation/types';
import { EvaluationApproach } from '../common/evaluation/constants';
import { performRouge1Evaluation } from '../common/evaluation/evaluators/rouge1-evaluator';

export async function evaluateRouge1(
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
      approach: EvaluationApproach.ROUGE_1,
      ...(threshold !== undefined ? { threshold } : {}),
    },
  };
  return performRouge1Evaluation(request);
}
