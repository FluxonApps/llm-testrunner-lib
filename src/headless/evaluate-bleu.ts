import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, EvaluationResult } from '../lib/evaluation/types';
import { EvaluationApproach } from '../lib/evaluation/constants';
import { performBleuEvaluation } from '../lib/evaluation/evaluators/bleu/bleu-evaluator';

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
