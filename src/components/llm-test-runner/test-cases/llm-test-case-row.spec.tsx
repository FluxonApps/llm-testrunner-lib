import { describe, it, expect } from '@jest/globals';
import { computeTestStatus } from './llm-test-case-row';
import type { TestCase } from '../../../types/llm-test-runner';
import type {
  EvaluationResult,
  FieldEvaluationResult,
} from '../../../lib/evaluation/types';

function makeTestCase(partial: {
  isRunning?: boolean;
  evaluationResult?: Partial<EvaluationResult>;
}): TestCase {
  return partial as unknown as TestCase;
}

function fieldResult(passed: boolean, error?: string): FieldEvaluationResult {
  return { passed, error } as unknown as FieldEvaluationResult;
}

describe('computeTestStatus', () => {
  it('returns "running" when the test case is in flight', () => {
    const status = computeTestStatus(makeTestCase({ isRunning: true }));
    expect(status).toEqual({ kind: 'running', label: 'Running' });
  });

  it('returns "not-run" when there is no evaluation result', () => {
    const status = computeTestStatus(makeTestCase({}));
    expect(status).toEqual({ kind: 'not-run', label: 'Not tested' });
  });

  it('returns "passed" for a single-field result that passed', () => {
    const status = computeTestStatus(
      makeTestCase({ evaluationResult: { passed: true } }),
    );
    expect(status).toEqual({ kind: 'passed', label: 'Passed' });
  });

  it('returns "failed" for a single-field result that failed', () => {
    const status = computeTestStatus(
      makeTestCase({ evaluationResult: { passed: false } }),
    );
    expect(status).toEqual({ kind: 'failed', label: 'Failed' });
  });

  it('returns "passed" when every field result passed cleanly', () => {
    const status = computeTestStatus(
      makeTestCase({
        evaluationResult: {
          passed: true,
          fieldResults: [fieldResult(true), fieldResult(true)],
        },
      }),
    );
    expect(status).toEqual({ kind: 'passed', label: 'Passed' });
  });

  it('returns "failed" when no field result passed', () => {
    const status = computeTestStatus(
      makeTestCase({
        evaluationResult: {
          passed: false,
          fieldResults: [fieldResult(false), fieldResult(false)],
        },
      }),
    );
    expect(status).toEqual({ kind: 'failed', label: 'Failed' });
  });

  it('returns "partial" with a "X of Y tests passed" label when some pass and some fail', () => {
    const status = computeTestStatus(
      makeTestCase({
        evaluationResult: {
          passed: false,
          fieldResults: [
            fieldResult(true),
            fieldResult(false),
            fieldResult(true),
          ],
        },
      }),
    );
    expect(status).toEqual({
      kind: 'partial',
      label: '2 of 3 tests passed',
    });
  });

  it('treats a passed field with an error as not-passed (does not inflate partial count)', () => {
    const status = computeTestStatus(
      makeTestCase({
        evaluationResult: {
          passed: false,
          fieldResults: [
            fieldResult(true),
            fieldResult(true, 'boom'),
            fieldResult(false),
          ],
        },
      }),
    );
    // Only one field really passes — the "passed but errored" one should not
    // be counted toward the partial total.
    expect(status).toEqual({
      kind: 'partial',
      label: '1 of 3 tests passed',
    });
  });
});
