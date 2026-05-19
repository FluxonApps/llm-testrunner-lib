import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, EvaluationResult } from '../lib/evaluation/types';
import { EvaluationApproach } from '../lib/evaluation/constants';
import { performRouge1Evaluation } from '../lib/evaluation/evaluators/rouge1-evaluator';

export async function evaluateRouge1(
  actualResponse: string,
  expectedOutcome: string,
  threshold?: number,
): Promise<EvaluationResult> {
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
