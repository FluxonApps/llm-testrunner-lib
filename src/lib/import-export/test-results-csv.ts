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
    'Evaluation Approach',
    'Evaluation Score',
  ];
  csvRows.push(headers.join(','));

  // Add data rows
  testCases.forEach(testCase => {
    const expectedOutcome = serializeExpectedOutcome(
      testCase.expectedOutcome || [],
      ' | ',
    );

    const evaluationApproach = testCase.evaluationParameters?.approach || '';
    const score = testCase.evaluationResult?.evaluationApproachResult?.score;
    const evaluationScore = score !== undefined ? score.toString() : '';
    
    let generatedKeywords = '';
    let keywordsMatch = '';

    if (testCase.evaluationResult) {
      const foundKeywords = testCase.evaluationResult.keywordMatches
        .filter(match => match.found)
        .map(match => match.keyword);

      generatedKeywords = foundKeywords.join('; ');

      // Calculate match percentages
      const keywordMatchCount = testCase.evaluationResult.keywordMatches.filter(
        m => m.found,
      ).length;
      const totalKeywords = testCase.evaluationResult.keywordMatches.length;

      keywordsMatch =
        totalKeywords > 0 ? `${keywordMatchCount}/${totalKeywords}` : 'N/A';
    }

    const responseTime = testCase.responseTime
      ? (testCase.responseTime / 1000).toFixed(3)
      : 'N/A';

    const row = [
      escapeCsvField(testCase.question),
      escapeCsvField(expectedOutcome),
      escapeCsvField(generatedKeywords),
      keywordsMatch,
      responseTime,
      escapeCsvField(evaluationApproach),
      escapeCsvField(evaluationScore),
    ];

    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

