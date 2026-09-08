import { describe, it, expect } from '@jest/globals';

import {
  validateTestCaseInput,
  validateTestCaseInputArray,
} from './test-case';

const minimalCase = {
  question: 'India, Karnataka',
  expectedOutcome: [
    { type: 'text' as const, label: 'Timezone', value: 'Asia/Kolkata' },
  ],
};

describe('validateTestCaseInput', () => {
  it('accepts the minimal { question, expectedOutcome } shape with no id', () => {
    expect(() => validateTestCaseInput(minimalCase)).not.toThrow();
  });

  it('accepts an explicit id too', () => {
    expect(() =>
      validateTestCaseInput({ ...minimalCase, id: 'abc' }),
    ).not.toThrow();
  });
});

describe('validateTestCaseInputArray', () => {
  it('accepts an array of minimal test cases with no id', () => {
    expect(() =>
      validateTestCaseInputArray([minimalCase, minimalCase]),
    ).not.toThrow();
  });

  it('reports "expected a JSON array" only when the root value is not an array', () => {
    expect(() => validateTestCaseInputArray({})).toThrow(
      'Invalid JSON structure. Expected a JSON array.',
    );
    expect(() => validateTestCaseInputArray('not an array')).toThrow(
      'Invalid JSON structure. Expected a JSON array.',
    );
  });

  it('does not use the array-shape message for a problem inside one element', () => {
    // A real array, but item 0 is missing `question` -- not an array-shape problem.
    expect(() =>
      validateTestCaseInputArray([{ expectedOutcome: minimalCase.expectedOutcome }]),
    ).toThrow(/index 0/);
  });
});
