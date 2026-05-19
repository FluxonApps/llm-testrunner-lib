import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, EvaluationResult } from '../ui/lib/evaluation/types';
import { EvaluationApproach } from '../ui/lib/evaluation/constants';
import { performEvaluation } from '../ui/lib/evaluation/evaluators/exact/exact';

export async function evaluateExact(
  actualResponse: string,
  expectedOutcome: string,
): Promise<EvaluationResult> {
  const request: EvaluationRequest = {
    testCaseId: randomUUID(),
    question: '',
    actualResponse,
    expectedOutcome,
    evaluationParameters: { approach: EvaluationApproach.EXACT },
  };
  return performEvaluation(request);
}
