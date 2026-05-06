import { describe, it, expect } from '@jest/globals';
import { applyExpectedOutcomeChange } from './test-case-mutations';
import { EvaluationApproach } from '../evaluation/constants';
import type { Criterion, TestCase } from '../../types/llm-test-runner';

function buildTestCase(
  approach: EvaluationApproach | undefined,
  threshold?: number,
  criteria?: Criterion[],
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
          ? {
              approach,
              ...(threshold !== undefined ? { threshold } : {}),
              ...(criteria !== undefined ? { criteria } : {}),
            }
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

describe('applyExpectedOutcomeChange — set-evaluation-criteria', () => {
  const sampleCriteria: Criterion[] = [
    { id: 'correctness', description: 'Factually correct.' },
    { id: 'concision', description: 'Concise and on point.' },
  ];

  it('sets the criteria array while preserving the existing approach and threshold', () => {
    const before = buildTestCase(EvaluationApproach.LLM_JUDGE, 0.7);

    const after = applyExpectedOutcomeChange(before, {
      index: 0,
      operation: 'set-evaluation-criteria',
      value: sampleCriteria,
    });

    expect(after.expectedOutcome[0].evaluationParameters).toEqual({
      approach: EvaluationApproach.LLM_JUDGE,
      threshold: 0.7,
      criteria: sampleCriteria,
    });
  });

  it('overwrites existing criteria when called with a new array', () => {
    const before = buildTestCase(EvaluationApproach.LLM_JUDGE, undefined, [
      { id: 'old', description: 'Old criterion.' },
    ]);
    const newCriteria: Criterion[] = [
      { id: 'fresh', description: 'Fresh criterion.' },
    ];

    const after = applyExpectedOutcomeChange(before, {
      index: 0,
      operation: 'set-evaluation-criteria',
      value: newCriteria,
    });

    expect(
      after.expectedOutcome[0].evaluationParameters?.criteria,
    ).toEqual(newCriteria);
  });

  it('clears the criteria when value is undefined and drops the key entirely', () => {
    const before = buildTestCase(EvaluationApproach.LLM_JUDGE, undefined, [
      { id: 'correctness', description: 'Factually correct.' },
    ]);

    const after = applyExpectedOutcomeChange(before, {
      index: 0,
      operation: 'set-evaluation-criteria',
      value: undefined,
    });

    const params = after.expectedOutcome[0].evaluationParameters;
    expect(params).toEqual({ approach: EvaluationApproach.LLM_JUDGE });
    // Make sure we didn't just leave `criteria: undefined` — that would
    // leak into serialised JSON and confuse downstream consumers.
    expect(params && 'criteria' in params).toBe(false);
  });

  it('does nothing when the field has no evaluation approach yet', () => {
    const before = buildTestCase(undefined);

    const after = applyExpectedOutcomeChange(before, {
      index: 0,
      operation: 'set-evaluation-criteria',
      value: sampleCriteria,
    });

    // Same instance returned (no-op for orphaned criteria).
    expect(after).toBe(before);
  });

  it('returns the original test case for an out-of-range index', () => {
    const before = buildTestCase(EvaluationApproach.LLM_JUDGE);

    const after = applyExpectedOutcomeChange(before, {
      index: 99,
      operation: 'set-evaluation-criteria',
      value: sampleCriteria,
    });

    expect(after).toBe(before);
  });
});
