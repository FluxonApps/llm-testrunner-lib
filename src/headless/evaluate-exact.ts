import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, EvaluationResult } from '../common/evaluation/types';
import { EvaluationApproach } from '../common/evaluation/constants';
import { performEvaluation } from '../common/evaluation/evaluators/exact/exact';

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
