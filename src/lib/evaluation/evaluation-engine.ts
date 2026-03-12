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
      const settledResults = await Promise.allSettled(
        request.fields.map(async field => {
          const fieldRequest: EvaluationRequest = {
            testCaseId: request.testCaseId,
            question: request.question,
            actualResponse: request.actualResponse,
            expectedOutcome: field.expectedValue,
            evaluationParameters: field.evaluationParameters,
          };
          const result = await this.evaluateField(fieldRequest);

          const fieldResult: FieldEvaluationResult = {
            index: field.index,
            label: field.label,
            type: field.type,
            expectedValue: field.expectedValue,
            passed: result.passed,
            keywordMatches: result.keywordMatches,
            evaluationParameters: result.evaluationParameters!,
            evaluationApproachResult: result.evaluationApproachResult,
          };
          return fieldResult;
        }),
      );

      const fieldResults: FieldEvaluationResult[] = settledResults.map(
        (settledResult, index) => {
          const field = request.fields[index];
          if (settledResult.status === 'fulfilled') {
            return settledResult.value;
          }

          return {
            index: field.index,
            label: field.label,
            type: field.type,
            expectedValue: field.expectedValue,
            passed: false,
            keywordMatches: [],
            evaluationParameters: field.evaluationParameters,
            evaluationApproachResult: {
              score: 0,
              approachUsed: field.evaluationParameters.approach,
            },
            error: this.getSafeErrorMessage(settledResult.reason),
          };
        },
      );

      const keywordMatches = fieldResults.flatMap(field => field.keywordMatches);
      const passed = fieldResults.every(field => field.passed && !field.error);

      callback({
        testCaseId: request.testCaseId,
        passed,
        keywordMatches,
        fieldResults,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Evaluation failed:', error);

      const errorResult: EvaluationResult = {
        testCaseId: request.testCaseId,
        passed: false,
        keywordMatches: [],
        fieldResults: [],
        error: this.getSafeErrorMessage(error),
        timestamp: new Date().toISOString(),
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

  private getSafeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Field evaluation failed.';
  }
}
