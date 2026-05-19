import { ExpectedOutcomeField } from '../types/llm-test-runner';

export function serializeExpectedOutcome(
  expectedOutcome: ExpectedOutcomeField[],
  joinWith: string = '\n',
): string {
  return (expectedOutcome || [])
    .map(field => {
      if (field.type === 'chips-input') {
        return field.value.join(', ');
      }
      return field.value;
    })
    .join(joinWith)
    .trim();
}
