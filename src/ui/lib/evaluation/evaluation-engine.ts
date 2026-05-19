import type {
  EvaluationRequest,
  EvaluationResult,
} from '../../../common/evaluation/types';
import { performEvaluation } from '../../../common/evaluation/evaluators/exact/exact';
import { EvaluationApproach } from '../../../common/evaluation/constants';
import { performRouge1Evaluation } from '../../../common/evaluation/evaluators/rouge1-evaluator';
import { performSemanticEvaluation } from '../../../common/evaluation/evaluators/semantic/index';
import { performRougeLEvaluation } from '../../../common/evaluation/evaluators/rougeL-evaluator';
import { performBleuEvaluation } from '../../../common/evaluation/evaluators/bleu/bleu-evaluator';
import type {
  EvaluationRequestV2,
  FieldEvaluationResult,
  TestCaseEvaluationCallback,
} from './multi-field-types';

export class LLMEvaluationEngine {
  async evaluateResponse(
    request: EvaluationRequestV2,
    callback: TestCaseEvaluationCallback,
  ): Promise<void> {
    const settledResults = await Promise.allSettled(
      request.fields.map(async field => {
        const fieldRequest: EvaluationRequest = {
          testCaseId: request.testCaseId,
          question: request.question,
          actualResponse: field.actualResponse,
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
