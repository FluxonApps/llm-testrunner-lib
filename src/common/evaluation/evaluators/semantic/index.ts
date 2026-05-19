import { SemanticEvaluator } from './SemanticEvaluator';
import { EvaluationRequest, EvaluationResult } from '../../types';

const semanticEvaluator = new SemanticEvaluator();

export async function performSemanticEvaluation(
  request: EvaluationRequest,
): Promise<EvaluationResult> {
  await semanticEvaluator.initialize();
  return semanticEvaluator.performEvaluation(request);
}
