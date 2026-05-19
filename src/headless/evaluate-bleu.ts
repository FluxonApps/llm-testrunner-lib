import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, EvaluationResult } from '../common/evaluation/types';
import { EvaluationApproach } from '../common/evaluation/constants';
import { performBleuEvaluation } from '../common/evaluation/evaluators/bleu/bleu-evaluator';

export async function evaluateBleu(
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
      approach: EvaluationApproach.BLEU,
      ...(threshold !== undefined ? { threshold } : {}),
    },
  };
  return performBleuEvaluation(request);
}
