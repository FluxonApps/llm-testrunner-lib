import { TestCase } from '../../types/llm-test-runner';
import { serializeExpectedOutcome } from '../expected-outcome-serializer';

/**
 * Escapes a CSV field by wrapping it in quotes if it contains special characters
 * @param field - The field to escape
 * @returns Escaped field string
 */
export function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Exports test results to a CSV string
 * @param testCases - Array of test cases with results to export
 * @returns CSV string representation of the test results
 */
export function exportTestResultsToCsv(testCases: TestCase[]): string {
  const csvRows: string[] = [];

  // Add header row
  const headers = [
    'Question',
    'Expected Keywords',
    'Generated Keywords',
    'Keywords Match',
    'Response Time (s)',
    'Field Label',
    'Field Strategy',
    'Field Passed',
    'Field Score',
    'Field Matches',
  ];
  csvRows.push(headers.join(','));

  // Add data rows (one row per field evaluation)
  testCases.forEach(testCase => {
    const responseTime = testCase.responseTime
      ? (testCase.responseTime / 1000).toFixed(3)
      : 'N/A';

    const fieldResults = testCase.evaluationResult?.fieldResults || [];

    if (fieldResults.length === 0) {
      const expectedOutcome = serializeExpectedOutcome(
        testCase.expectedOutcome || [],
        ' | ',
      );
      csvRows.push(
        [
          escapeCsvField(testCase.question),
          escapeCsvField(expectedOutcome),
          '',
          '',
          responseTime,
          '',
          '',
          '',
          '',
          '',
        ].join(','),
      );
    } else {
      fieldResults.forEach(fieldResult => {
        const matchedCount = fieldResult.keywordMatches.filter(match => match.found).length;
        const totalMatches = fieldResult.keywordMatches.length;
        const fieldMatches =
          totalMatches > 0 ? `${matchedCount}/${totalMatches}` : 'N/A';
        const expectedKeywords = fieldResult.expectedValue;
        const generatedKeywords = fieldResult.keywordMatches
          .filter(match => match.found)
          .map(match => match.keyword)
          .join('; ');

        csvRows.push(
          [
            escapeCsvField(testCase.question),
            escapeCsvField(expectedKeywords),
            escapeCsvField(generatedKeywords),
            fieldMatches,
            responseTime,
            escapeCsvField(fieldResult.label),
            escapeCsvField(fieldResult.evaluationParameters.approach),
            fieldResult.passed ? 'true' : 'false',
            escapeCsvField(fieldResult.evaluationApproachResult.score.toFixed(2)),
            fieldMatches,
          ].join(','),
        );
      });
    }

    // Empty separator row between test cases
    csvRows.push('');
  });

  return csvRows.join('\n');
}

