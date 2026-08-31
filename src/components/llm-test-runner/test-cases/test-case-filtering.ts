import { TestCase } from '../../../types/llm-test-runner';
import { computeTestStatus } from './llm-test-case-row';

export type StatusFilter = 'all' | 'not-tested' | 'failed' | 'passed';

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
