import { SemanticEvaluator } from './SemanticEvaluator';
import { EvaluationRequest, MatchResult } from '../../types';

const semanticEvaluator = new SemanticEvaluator();

export async function performSemanticEvaluation(
  request: EvaluationRequest,
): Promise<MatchResult> {
  await semanticEvaluator.initialize();
  return semanticEvaluator.performEvaluation(request);
}
