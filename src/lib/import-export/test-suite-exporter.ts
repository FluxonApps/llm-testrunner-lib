import { ExpectedOutcomeField, TestCase } from '../../types/llm-test-runner';

export interface TestSuiteExportData {
  id: string;
  question: string;
  expectedOutcome: ExpectedOutcomeField[];
}

/**
 * Formats test cases as a JSON string suitable for saving as a test suite
 * @param testCases - Array of test cases to format
 * @returns JSON string representation of the test suite
 */
export function formatTestSuiteAsJson(testCases: TestCase[]): string {
  const exportData: TestSuiteExportData[] = testCases.map(testCase => ({
    id: testCase.id,
    question: testCase.question,
    expectedOutcome: testCase.expectedOutcome,
  }));

  return JSON.stringify(exportData, null, 2);
}
