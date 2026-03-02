import { TestCase } from '../../types/llm-test-runner';
import { createTestCaseFromImport } from '../test-cases/test-case-factory';

export interface ImportValidationResult {
  success: boolean;
  testCases?: TestCase[];
  error?: string;
}

/**
 * Validates and imports test cases from JSON content
 * @param jsonContent - The JSON string to parse and validate
 * @returns Validation result with test cases or error message
 */
export function importTestSuite(jsonContent: string): ImportValidationResult {
  try {
    const parsed = JSON.parse(jsonContent);

    if (!Array.isArray(parsed)) {
      return {
        success: false,
        error: 'Invalid JSON structure. Expected a JSON array.',
      };
    }

    if (parsed.length === 0) {
      return {
        success: false,
        error: 'The test suite is empty. Please provide at least one test case.',
      };
    }

    const testCases: TestCase[] = parsed.map((item, index) => {
      try {
        return createTestCaseFromImport(item);
      } catch (err) {
        throw new Error(
          `Invalid test case at index ${index}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    return {
      success: true,
      testCases,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Error processing file. Please ensure it is a valid JSON array.',
    };
  }
}

