import { TestCase } from '../../../types/llm-test-runner';
import { computeTestStatus } from './llm-test-case-row';

export type StatusFilter = 'all' | 'not-tested' | 'failed' | 'passed';

export interface SummaryStats {
  total: number;
  passed: number;
  failed: number;
  notRun: number;
  passRate: number;
}

/** failed includes 'partial'; notRun includes the transient running/evaluating states. */
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
      notRun += 1;
    }
  }

  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  return { total, passed, failed, notRun, passRate };
}

/** Buckets match computeSummaryStats: 'not-tested' covers 'not-run' + 'running',
 * 'failed' covers 'failed' + 'partial'. */
export function filterTestCasesByStatus(
  testCases: TestCase[],
  filter: StatusFilter,
): TestCase[] {
  if (filter === 'all') return testCases;

  return testCases.filter(testCase => {
    const { kind } = computeTestStatus(testCase);
    if (filter === 'not-tested') return kind === 'not-run' || kind === 'running';
    if (filter === 'failed') return kind === 'failed' || kind === 'partial';
    return kind === 'passed';
  });
}

export function filterTestCasesByQuery(
  testCases: TestCase[],
  query: string,
): TestCase[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return testCases;

  return testCases.filter(testCase =>
    testCase.question.toLowerCase().includes(trimmed),
  );
}
