import { TestCase } from '../../../types/llm-test-runner';
import { computeTestStatus } from './llm-test-case-row';

export type StatusFilter = 'all' | 'not-tested' | 'failed' | 'passed';

/**
 * Buckets match the ones computeSummaryStats already uses: 'not-tested'
 * covers both 'not-run' and the transient 'running' state, 'failed'
 * covers both 'failed' and 'partial'.
 */
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

/** Case-insensitive substring match on the question text. */
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
