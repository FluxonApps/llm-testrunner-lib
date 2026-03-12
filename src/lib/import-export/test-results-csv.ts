import { TestCase } from '../../types/llm-test-runner';

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
  const maxFieldCount = testCases.reduce(
    (max, testCase) => Math.max(max, (testCase.expectedOutcome || []).length),
    0,
  );

  // Add header row
  const headers: string[] = [
    'Question',
    'Response Time (s)',
  ];
  for (let i = 1; i <= maxFieldCount; i++) {
    headers.push('Field Name');
    headers.push('Expected Keywords');
    headers.push('Generated Keywords');
    headers.push('Evaluation Strategy');
    headers.push('Passed Evaluation');
    headers.push('Keyword Match');
    if (i < maxFieldCount) {
      headers.push('');
    }
  }
  csvRows.push(headers.join(','));

  // Add data rows (one row per test case)
  testCases.forEach(testCase => {
    const responseTime = testCase.responseTime
      ? (testCase.responseTime / 1000).toFixed(3)
      : 'N/A';
    const row: string[] = [escapeCsvField(testCase.question), responseTime];

    for (let i = 0; i < maxFieldCount; i++) {
      const field = testCase.expectedOutcome?.[i];
      const fieldResult = testCase.evaluationResult?.fieldResults?.find(
        result => result.index === i,
      );

      const expectedKeywords =
        fieldResult?.expectedValue ??
        (field
          ? field.type === 'chips-input'
            ? field.value.join(', ')
            : field.value
          : '');
      const generatedKeywords = (fieldResult?.keywordMatches || [])
        .filter(match => match.found)
        .map(match => match.keyword)
        .join('; ');
      const matchedCount = (fieldResult?.keywordMatches || []).filter(
        match => match.found,
      ).length;
      const totalMatches = fieldResult?.keywordMatches?.length || 0;
      const keywordMatch = totalMatches > 0 ? `${matchedCount}/${totalMatches}` : '';

      row.push(escapeCsvField(field?.label || ''));
      row.push(escapeCsvField(expectedKeywords || ''));
      row.push(escapeCsvField(generatedKeywords));
      row.push(
        escapeCsvField(
          fieldResult?.evaluationParameters.approach ||
            field?.evaluationParameters?.approach ||
            '',
        ),
      );
      row.push(fieldResult ? (fieldResult.passed ? 'TRUE' : 'FALSE') : '');
      row.push(keywordMatch);

      if (i < maxFieldCount - 1) {
        row.push('');
      }
    }

    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

