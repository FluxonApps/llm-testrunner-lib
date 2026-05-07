import { LLMEvaluationEngine } from './evaluation-engine';
import {
  EvaluationResult,
  FieldEvaluationInput,
  EvaluationRequestV2,
  FieldEvaluationResult,
} from './types';
import {
  TestCase,
  ExpectedOutcomeField,
  EvaluationSourceExtractors,
  LlmJudge,
} from '../../types/llm-test-runner';
import { normalizeEvaluationParametersForField } from './field-evaluation-approach';
import { resolveActualValue } from './actual-value-resolver';
import { clampThreshold } from './threshold-clamp';

/**
 * Service for evaluating test case responses
 */
export class EvaluationService {
  private engine: LLMEvaluationEngine;

  constructor() {
    this.engine = new LLMEvaluationEngine();
  }

  /**
   * Evaluates a test case response
   * @param testCase - The test case to evaluate
   * @param onResult - Callback to handle the evaluation result
   */
  async evaluateTestCase(
    testCase: TestCase,
    onResult: (result: EvaluationResult) => void,
    extractors?: EvaluationSourceExtractors,
    llmJudge?: LlmJudge,
  ): Promise<void> {
    const fields: FieldEvaluationInput[] = [];
    const failedFields: FieldEvaluationResult[] = [];
    // Per-field non-fatal warnings (e.g. "used default threshold because
    // the configured value was out of range"). Attached to the per-field
    // result after the engine returns. Mirrors the `error` channel in
    // shape — same UI rendering path on the other side.
    const warnings = new Map<number, string>();

    for (const [index, field] of (testCase.expectedOutcome || []).entries()) {
      if (field.type === 'textarea' && field.outcomeMode === 'dynamic') {
        continue;
      }

      const normalized = normalizeEvaluationParametersForField(
        field.type,
        field.evaluationParameters,
      );
      const { params: evaluationParameters, warning } =
        clampThreshold(normalized);
      if (warning) {
        warnings.set(index, warning);
      }

      const expectedValue = getFieldExpectedValue(field);
      const resolvedActualValue = await resolveActualValue(
        field,
        testCase.output,
        extractors,
      );

      if (resolvedActualValue.success) {
        fields.push({
          index,
          label: field.label,
          type: field.type,
          expectedValue,
          actualResponse: resolvedActualValue.value,
          evaluationParameters,
        });
      } else {
        failedFields.push({
          index,
          label: field.label,
          type: field.type,
          expectedValue,
          passed: false,
          keywordMatches: [],
          evaluationParameters,
          evaluationApproachResult: {
            score: 0,
            approachUsed: evaluationParameters.approach,
          },
          error:
            'error' in resolvedActualValue
              ? resolvedActualValue.error
              : 'Failed to resolve actual value.',
          ...(warnings.has(index) ? { warning: warnings.get(index) } : {}),
        });
      }
    }

    if (fields.length === 0) {
      if (failedFields.length === 0) {
        console.warn('⚠️ No evaluable fields for test case:', testCase.id);
        return;
      }

      onResult({
        testCaseId: testCase.id,
        passed: false,
        keywordMatches: [],
        fieldResults: failedFields,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Derive chatHistory from the test case so the llm-judge evaluator can
    // pass it into the judge prompt. Treat disabled / empty values as
    // undefined so the prompt's CHAT_HISTORY block is omitted entirely.
    const chatHistory =
      testCase.chatHistory?.enabled && testCase.chatHistory.value
        ? testCase.chatHistory.value
        : undefined;

    const evaluationRequest: EvaluationRequestV2 = {
      testCaseId: testCase.id,
      question: testCase.question,
      fields,
      llmJudge,
      chatHistory,
    };

    await this.engine.evaluateResponse(evaluationRequest, (result: EvaluationResult) => {
      const evaluatedResults = (result.fieldResults || []).map(field => {
        const warning = warnings.get(field.index);
        return warning ? { ...field, warning } : field;
      });
      const combinedResults = [...evaluatedResults, ...failedFields].sort(
        (a, b) => a.index - b.index,
      );
      onResult({
        ...result,
        passed: combinedResults.every(field => field.passed && !field.error),
        fieldResults: combinedResults,
      });
    });
  }
}

function getFieldExpectedValue(field: ExpectedOutcomeField): string {
  if (field.type === 'chips-input') {
    return field.value.join(', ');
  }
  return field.value;
}
