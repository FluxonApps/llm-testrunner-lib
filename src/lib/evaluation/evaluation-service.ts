import { LLMEvaluationEngine } from './evaluation-engine';
import { EvaluationRequest, EvaluationResult } from './types';
import { TestCase } from '../../types/llm-test-runner';

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

    const evaluationRequest: EvaluationRequest = {
      testCaseId: testCase.id,
      question: testCase.question,
      expectedOutcome: testCase.expectedOutcome,
      actualResponse: testCase.output,
      evaluationParameters: testCase.evaluationParameters,
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
