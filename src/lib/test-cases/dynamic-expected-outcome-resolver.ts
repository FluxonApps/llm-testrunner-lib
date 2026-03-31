import {
  ExpectedOutcomeField,
  TestCase,
  TextareaExpectedOutcomeField,
} from '../../types/llm-test-runner';

export type ResolveExpectedOutcomeFn = (
  resolutionQuery: string,
  context: { testCase: TestCase; fieldIndex: number },
) => Promise<string>;

type ResolvedDynamicValue = { index: number; value: string };

function isDynamicTextareaField(
  field: ExpectedOutcomeField,
): field is TextareaExpectedOutcomeField {
  return field.type === 'textarea' && field.outcomeMode === 'dynamic';
}

function applyResolvedDynamicValues(
  testCase: TestCase,
  resolvedValues: ResolvedDynamicValue[],
): TestCase {
  if (resolvedValues.length === 0) {
    return testCase;
  }

  const expectedOutcome = [...(testCase.expectedOutcome || [])];
  for (const resolved of resolvedValues) {
    const field = expectedOutcome[resolved.index];
    if (!field || !isDynamicTextareaField(field)) {
      continue;
    }
    expectedOutcome[resolved.index] = {
      ...field,
      value: resolved.value,
    };
  }

  return {
    ...testCase,
    expectedOutcome,
  };
}

export async function resolveDynamicExpectedOutcomes(
  testCase: TestCase,
  resolver?: ResolveExpectedOutcomeFn,
): Promise<TestCase> {
  if (!resolver) {
    return testCase;
  }

  const dynamicFields = (testCase.expectedOutcome || []).flatMap((field, index) => {
    if (!isDynamicTextareaField(field)) {
      return [];
    }
    return [{ field, index }];
  });

  if (dynamicFields.length === 0) {
    return testCase;
  }

  const resolvedValues = await Promise.all(
    dynamicFields.map(async ({ field, index }) => ({
      index,
      value: await resolver(
        field.resolutionQuery || '',
        { testCase, fieldIndex: index },
      ),
    })),
  );

  return applyResolvedDynamicValues(testCase, resolvedValues);
}

export async function resolveDynamicExpectedOutcomesForRun(
  baseTestCase: TestCase,
  resolveExpectedOutcome?: ResolveExpectedOutcomeFn,
): Promise<TestCase> {
  return resolveDynamicExpectedOutcomes(baseTestCase, resolveExpectedOutcome);
}
