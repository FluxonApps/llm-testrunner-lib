import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, EvaluationResult } from '../lib/evaluation/types';
import { EvaluationApproach } from '../lib/evaluation/constants';

export async function evaluateSemantic(
  actualResponse: string,
  expectedOutcome: string,
  threshold?: number,
): Promise<EvaluationResult> {
  const { performSemanticEvaluation } = await import(
    '../lib/evaluation/evaluators/semantic/index'
  );
  const request: EvaluationRequest = {
    testCaseId: randomUUID(),
    question: '',
    actualResponse,
    expectedOutcome,
    evaluationParameters: {
      approach: EvaluationApproach.SEMANTIC,
      ...(threshold !== undefined ? { threshold } : {}),
    },
  };
  return performSemanticEvaluation(request);
}
