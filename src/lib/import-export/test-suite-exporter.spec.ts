import { describe, it, expect } from '@jest/globals';
import { formatTestSuiteAsJson } from './test-suite-exporter';
import { importTestSuite } from './test-suite-importer';
import type { TestCase } from '../../types/llm-test-runner';

const baseTestCase: TestCase = {
  id: 'tc-1',
  question: 'What is the capital of India?',
  expectedOutcome: [{ type: 'text', label: 'Answer', value: 'New Delhi' }],
  chatHistory: { enabled: false, value: '' },
};

describe('formatTestSuiteAsJson metadata', () => {
  it('includes metadata in the exported JSON when present', () => {
    const json = formatTestSuiteAsJson([
      { ...baseTestCase, metadata: { category: 'geography' } },
    ]);
    expect(JSON.parse(json)[0].metadata).toEqual({ category: 'geography' });
  });

  it('omits the metadata key entirely when absent', () => {
    const json = formatTestSuiteAsJson([baseTestCase]);
    expect(JSON.parse(json)[0]).not.toHaveProperty('metadata');
  });
});

describe('export -> import round trip with metadata', () => {
  it('preserves metadata through formatTestSuiteAsJson -> importTestSuite', () => {
    const json = formatTestSuiteAsJson([
      { ...baseTestCase, metadata: { category: 'geography', difficulty: 'easy' } },
    ]);
    const result = importTestSuite(json);

    expect(result.success).toBe(true);
    expect(result.testCases?.[0].metadata).toEqual({
      category: 'geography',
      difficulty: 'easy',
    });
  });
});
