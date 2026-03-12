import { TestCase } from '../../types/llm-test-runner';
import { EvaluationApproach } from '../evaluation/constants';
import { normalizeEvaluationParametersForField } from '../evaluation/field-evaluation-approach';

/**
 * Updates the evaluation approach for a specific expected outcome field.
 * Select fields always use exact matching.
 */
export function updateExpectedOutcomeFieldApproach(
  testCase: TestCase,
  fieldIndex: number,
  approach: EvaluationApproach,
): TestCase {
  const expectedOutcome = [...(testCase.expectedOutcome || [])];
  const target = expectedOutcome[fieldIndex];

  if (!target) {
    return testCase;
  }

  const currentEvaluationParameters = target.evaluationParameters;
  expectedOutcome[fieldIndex] = {
    ...target,
    evaluationParameters: normalizeEvaluationParametersForField(target.type, {
      ...currentEvaluationParameters,
      approach,
    }),
  };

  return {
    ...testCase,
    expectedOutcome,
  };
}
