import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, EvaluationResult } from '../ui/lib/evaluation/types';
import { EvaluationApproach } from '../ui/lib/evaluation/constants';
import { performRougeLEvaluation } from '../ui/lib/evaluation/evaluators/rougeL-evaluator';

export async function evaluateRougeL(
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
      approach: EvaluationApproach.ROUGE_L,
      ...(threshold !== undefined ? { threshold } : {}),
    },
  };
  return performRougeLEvaluation(request);
}
