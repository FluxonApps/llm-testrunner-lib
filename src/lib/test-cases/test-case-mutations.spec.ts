import { describe, it, expect } from '@jest/globals';
import { applyExpectedOutcomeChange } from './test-case-mutations';
import { EvaluationApproach } from '../evaluation/constants';
import type { TestCase } from '../../types/llm-test-runner';

function buildTestCase(
  approach: EvaluationApproach | undefined,
  threshold?: number,
): TestCase {
  return {
    id: 'tc-1',
    question: 'What is the capital of France?',
    expectedOutcome: [
      {
        type: 'textarea',
        label: 'Expected Outcome',
        value: 'Paris',
        outcomeMode: 'static',
        evaluationParameters: approach
          ? { approach, ...(threshold !== undefined ? { threshold } : {}) }
          : undefined,
      },
    ],
    chatHistory: { enabled: false, value: '' },
    isRunning: false,
  };
}

describe('applyExpectedOutcomeChange — set-evaluation-threshold', () => {
  it('sets the threshold while preserving the existing approach', () => {
    const before = buildTestCase(EvaluationApproach.ROUGE_1);

    const after = applyExpectedOutcomeChange(before, {
      index: 0,
      operation: 'set-evaluation-threshold',
      value: 0.85,
    });

    const params = after.expectedOutcome[0].evaluationParameters;
    expect(params).toEqual({
      approach: EvaluationApproach.ROUGE_1,
      threshold: 0.85,
    });
  });

  it('overwrites an existing threshold', () => {
    const before = buildTestCase(EvaluationApproach.SEMANTIC, 0.5);

    const after = applyExpectedOutcomeChange(before, {
      index: 0,
      operation: 'set-evaluation-threshold',
      value: 0.9,
    });

    expect(
      after.expectedOutcome[0].evaluationParameters?.threshold,
    ).toBe(0.9);
  });

  it('clears the threshold when the value is undefined and drops the key entirely', () => {
    const before = buildTestCase(EvaluationApproach.BLEU, 0.4);

    const after = applyExpectedOutcomeChange(before, {
      index: 0,
      operation: 'set-evaluation-threshold',
      value: undefined,
    });

    const params = after.expectedOutcome[0].evaluationParameters;
    expect(params).toEqual({ approach: EvaluationApproach.BLEU });
    // Make sure we didn't just leave `threshold: undefined` — that would
    // leak into serialised JSON and confuse downstream consumers.
    expect(params && 'threshold' in params).toBe(false);
  });

  it('does nothing when the field has no evaluation approach yet', () => {
    const before = buildTestCase(undefined);

    const after = applyExpectedOutcomeChange(before, {
      index: 0,
      operation: 'set-evaluation-threshold',
      value: 0.7,
    });

    // Same instance returned (no-op for orphaned threshold).
    expect(after).toBe(before);
  });

  it('returns the original test case for an out-of-range index', () => {
    const before = buildTestCase(EvaluationApproach.ROUGE_L, 0.6);

    const after = applyExpectedOutcomeChange(before, {
      index: 99,
      operation: 'set-evaluation-threshold',
      value: 0.3,
    });

    expect(after).toBe(before);
  });
});
