import { randomUUID } from 'node:crypto';

import type { EvaluationRequest, MatchResult } from '../common/evaluation/types';
import { EvaluationApproach } from '../common/evaluation/constants';

export async function evaluateSemantic(
  actualResponse: string,
  expectedOutcome: string,
  threshold?: number,
): Promise<MatchResult> {
  const { performSemanticEvaluation } = await import(
    '../common/evaluation/evaluators/semantic/index'
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
