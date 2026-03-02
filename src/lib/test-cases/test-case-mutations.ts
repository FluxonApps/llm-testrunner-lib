import { TestCase } from '../../types/llm-test-runner';
import { EvaluationApproach } from '../evaluation/constants';

/**
 * Updates the evaluation approach for a test case
 * @param testCase - The test case to update
 * @param approach - The new evaluation approach
 * @returns Updated test case with the new evaluation approach
 */
export function updateApproach(
  testCase: TestCase,
  approach: EvaluationApproach,
): TestCase {
  return {
    ...testCase,
    evaluationParameters: {
      ...testCase.evaluationParameters,
      approach: approach,
    },
  };
}
