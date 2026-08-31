import { ExpectedOutcomeField, TestCase } from '../../types/llm-test-runner';

/**
 * Whether the first (primary) expected-outcome field is missing a value it
 * needs — a dynamic-mode textarea is resolved at run time (or fails with a
 * clear runtime error if no resolver is configured), so it's exempt here
 * regardless of whether dynamic resolution is wired up. Only the primary
 * field gates Run, matching the "This field is mandatory" treatment shown
 * only on that field in the design.
 */
export function isPrimaryExpectedOutcomeMissing(
  fields: ExpectedOutcomeField[] | undefined,
): boolean {
  const primary = (fields || [])[0];
  if (!primary) return false;

  if (primary.type === 'textarea') {
    if (primary.outcomeMode === 'dynamic') return false;
    return !primary.value?.trim();
  }

  if (primary.type === 'chips-input') {
    return !primary.value || primary.value.length === 0;
  }

  return false;
}

export function isTestCaseRunnable(testCase: TestCase): boolean {
  return (
    !!testCase.question.trim() &&
    !isPrimaryExpectedOutcomeMissing(testCase.expectedOutcome)
  );
}
