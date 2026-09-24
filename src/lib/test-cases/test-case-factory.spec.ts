import { describe, it, expect } from '@jest/globals';
import { createTestCase, createTestCaseFromInput } from './test-case-factory';
import type { TestCaseInput } from '../../types/llm-test-runner';

const minimalInput: TestCaseInput = {
  question: 'What is the capital of India?',
  expectedOutcome: [{ type: 'text', label: 'Answer', value: 'New Delhi' }],
};

describe('createTestCase', () => {
  it('does not set metadata by default', () => {
    const testCase = createTestCase();
    expect(testCase.metadata).toBeUndefined();
  });
});

describe('createTestCaseFromInput metadata', () => {
  it('preserves metadata passed in the input', () => {
    const testCase = createTestCaseFromInput({
      ...minimalInput,
      metadata: { category: 'geography' },
    });
    expect(testCase.metadata).toEqual({ category: 'geography' });
  });

  it('leaves metadata unset when the input omits it', () => {
    const testCase = createTestCaseFromInput(minimalInput);
    expect(testCase.metadata).toBeUndefined();
  });
});
