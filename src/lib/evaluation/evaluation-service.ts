import { LLMEvaluationEngine } from './evaluation-engine';
import {
  EvaluationResult,
  FieldEvaluationInput,
  TestCaseEvaluationRequest,
} from './types';
import { TestCase, ExpectedOutcomeField } from '../../types/llm-test-runner';
import { normalizeEvaluationParametersForField } from './field-evaluation-approach';

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
  ): Promise<void> {
    if (!testCase.output) {
      console.warn('⚠️ No output to evaluate for test case:', testCase.id);
      return;
    }

    const fields: FieldEvaluationInput[] = (testCase.expectedOutcome || []).map(
      (field, index) => ({
        index,
        label: field.label,
        type: field.type,
        expectedValue: getFieldExpectedValue(field),
        evaluationParameters: normalizeEvaluationParametersForField(
          field.type,
          field.evaluationParameters,
        ),
      }),
    );

    const evaluationRequest: TestCaseEvaluationRequest = {
      testCaseId: testCase.id,
      question: testCase.question,
      actualResponse: testCase.output,
      fields,
    };

    await this.engine.evaluateResponse(
      evaluationRequest,
      (result: EvaluationResult) => {
        console.log('📊 Evaluation result received:', result);
        onResult(result);
      },
    );
  }
}

function getFieldExpectedValue(field: ExpectedOutcomeField): string {
  if (field.type === 'chips-input') {
    return field.value.join(', ');
  }
  return field.value;
}
