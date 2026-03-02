import {
  EvaluationRequest,
  EvaluationResult,
  EvaluationCallback,
} from './types';
import { performEvaluation } from './evaluators/exact/exact';
import { EvaluationApproach } from './constants';
import { performRouge1Evaluation } from './evaluators/rouge1-evaluator';
import { performSemanticEvaluation } from './evaluators/semantic/index';
import { performRougeLEvaluation } from './evaluators/rougeL-evaluator';
import { performBleuEvaluation } from './evaluators/bleu/bleu-evaluator';

export class LLMEvaluationEngine {
  async evaluateResponse(
    request: EvaluationRequest,
    callback: EvaluationCallback,
  ): Promise<void> {
    try {
      const approach: EvaluationApproach =
        request.evaluationParameters.approach;
      switch (approach) {
        case EvaluationApproach.BLEU: {
          const bleuResult = performBleuEvaluation(request);
          callback(bleuResult);
          break;
        }

        case EvaluationApproach.EXACT: {
          const exactResult = await performEvaluation(request);
          callback(exactResult);
          break;
        }

        case EvaluationApproach.ROUGE_1: {
          const rougeResult = await performRouge1Evaluation(request);
          callback(rougeResult);
          break;
        }

        case EvaluationApproach.ROUGE_L: {
          const rougeLResult = await performRougeLEvaluation(request);
          callback(rougeLResult);
          break;
        }

        case EvaluationApproach.SEMANTIC: {
          const semanticResult = await performSemanticEvaluation(request);
          callback(semanticResult);
          break;
        }

        default: {
          console.warn(
            `Unknown matching approach: ${request.evaluationParameters.approach}, falling back to exact matching`,
          );
          const fallbackResult = await performEvaluation(request);
          callback(fallbackResult);
        }
      }
    } catch (error) {
      console.error('Evaluation failed:', error);

      const errorResult: EvaluationResult = {
        testCaseId: request.testCaseId,
        passed: false,
        keywordMatches: [],
        timestamp: new Date().toISOString(),
        evaluationParameters: request.evaluationParameters,
        evaluationApproachResult: {
          score: 0,
          approachUsed: EvaluationApproach.EXACT,
        },
      };

      callback(errorResult);
    }
  }
}
