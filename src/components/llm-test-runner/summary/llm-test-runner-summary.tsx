import { h, FunctionalComponent } from '@stencil/core';
import { TestCase } from '../../../types/llm-test-runner';
import { computeTestStatus } from '../test-cases/llm-test-case-row';

export interface SummaryStats {
  total: number;
  passed: number;
  failed: number;
  notRun: number;
  passRate: number;
}

/**
 * Aggregate per-test statuses into summary counts.
 *
 * Buckets:
 *  - passed  → fully passed
 *  - failed  → has results but didn't fully pass (includes 'partial')
 *  - notRun  → no completed evaluation yet (includes currently running)
 *
 * passRate is passed / total, rounded to nearest integer.
 */
export function computeSummaryStats(testCases: TestCase[]): SummaryStats {
  const total = testCases.length;
  let passed = 0;
  let failed = 0;
  let notRun = 0;

  for (const tc of testCases) {
    const { kind } = computeTestStatus(tc);
    if (kind === 'passed') {
      passed += 1;
    } else if (kind === 'failed' || kind === 'partial') {
      failed += 1;
    } else {
      // 'not-run' | 'running' | 'evaluating'
      notRun += 1;
    }
  }

  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  return { total, passed, failed, notRun, passRate };
}

export interface LLMTestRunnerSummaryProps {
  testCases: TestCase[];
}

export const LLMTestRunnerSummary: FunctionalComponent<
  LLMTestRunnerSummaryProps
> = ({ testCases }) => {
  const { total, passed, failed, notRun, passRate } =
    computeSummaryStats(testCases);
  const testNoun = total === 1 ? 'test' : 'tests';

  return (
    <div class="test-runner-summary" role="status" aria-label="Test suite summary">
      <div class="test-runner-summary__rate">
        <span class="test-runner-summary__rate-value" key={`rate-${passRate}`}>
          {passRate}%
        </span>
        <span class="test-runner-summary__rate-label">pass rate</span>
      </div>

      <div class="test-runner-summary__chips">
        <span class="test-runner-summary__chip test-runner-summary__chip--passed">
          <span class="test-runner-summary__chip-count" key={`passed-${passed}`}>
            {passed}
          </span>{' '}
          passed
        </span>
        <span class="test-runner-summary__chip test-runner-summary__chip--failed">
          <span class="test-runner-summary__chip-count" key={`failed-${failed}`}>
            {failed}
          </span>{' '}
          failed
        </span>
        <span class="test-runner-summary__chip test-runner-summary__chip--not-run">
          <span class="test-runner-summary__chip-count" key={`notrun-${notRun}`}>
            {notRun}
          </span>{' '}
          not run
        </span>
      </div>

      <div class="test-runner-summary__total">
        <span class="test-runner-summary__total-count" key={`total-${total}`}>
          {total}
        </span>{' '}
        {testNoun}
      </div>
    </div>
  );
};
