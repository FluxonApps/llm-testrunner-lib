import {
  EvaluationRequest,
  EvaluationResult,
  EvaluationCallback,
  FieldEvaluationResult,
  EvaluationRequestV2,
} from './types';
import { performEvaluation } from './evaluators/exact/exact';
import { EvaluationApproach } from './constants';
import { performRouge1Evaluation } from './evaluators/rouge1-evaluator';
import { performSemanticEvaluation } from './evaluators/semantic/index';
import { performRougeLEvaluation } from './evaluators/rougeL-evaluator';
import { performBleuEvaluation } from './evaluators/bleu/bleu-evaluator';

export class LLMEvaluationEngine {
  async evaluateResponse(
    request: EvaluationRequestV2,
    callback: EvaluationCallback,
  ): Promise<void> {
    try {

      const fieldResults: FieldEvaluationResult[] = [];
      for (const field of request.fields) {
        const fieldRequest: EvaluationRequest = {
          testCaseId: request.testCaseId,
          question: request.question,
          actualResponse: request.actualResponse,
          expectedOutcome: field.expectedValue,
          evaluationParameters: field.evaluationParameters,
        };
        const result = await this.evaluateField(fieldRequest);
        fieldResults.push({
          index: field.index,
          label: field.label,
          type: field.type,
          expectedValue: field.expectedValue,
          passed: result.passed,
          keywordMatches: result.keywordMatches,
          evaluationParameters: result.evaluationParameters!,
          evaluationApproachResult: result.evaluationApproachResult,
        });
      }

      const keywordMatches = fieldResults.flatMap(field => field.keywordMatches);
      const passed = fieldResults.every(field => field.passed);
      const totalScore = fieldResults.reduce(
        (sum, field) => sum + field.evaluationApproachResult.score,
        0,
      );
      const aggregateScore =
        fieldResults.length > 0 ? totalScore / fieldResults.length : 0;

      callback({
        testCaseId: request.testCaseId,
        passed,
        keywordMatches,
        fieldResults,
        timestamp: new Date().toISOString(),
        evaluationParameters: fieldResults[0]?.evaluationParameters,
        evaluationApproachResult: {
          score: aggregateScore,
          approachUsed:
            fieldResults[0]?.evaluationApproachResult.approachUsed ??
            EvaluationApproach.EXACT,
        },
      });
    } catch (error) {
      console.error('Evaluation failed:', error);

      const errorResult: EvaluationResult = {
        testCaseId: request.testCaseId,
        passed: false,
        keywordMatches: [],
        fieldResults: [],
        timestamp: new Date().toISOString(),
        evaluationApproachResult: {
          score: 0,
          approachUsed: EvaluationApproach.EXACT,
        },
      };

      callback(errorResult);
    }
  }

  private async evaluateField(request: EvaluationRequest): Promise<EvaluationResult> {
    const approach: EvaluationApproach = request.evaluationParameters.approach;
    switch (approach) {
      case EvaluationApproach.BLEU:
        return performBleuEvaluation(request);
      case EvaluationApproach.EXACT:
        return performEvaluation(request);
      case EvaluationApproach.ROUGE_1:
        return performRouge1Evaluation(request);
      case EvaluationApproach.ROUGE_L:
        return performRougeLEvaluation(request);
      case EvaluationApproach.SEMANTIC:
        return performSemanticEvaluation(request);
      default:
        console.warn(
          `Unknown matching approach: ${request.evaluationParameters.approach}, falling back to exact matching`,
        );
        return performEvaluation(request);
    }
  }
}
