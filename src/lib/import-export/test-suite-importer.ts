import { TestCase } from '../../types/llm-test-runner';
import { createTestCaseFromInput } from '../test-cases/test-case-factory';
import { validateTestCaseInputArray } from '../../types/test-case';

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
    validateTestCaseInputArray(parsed);

    const testCases = parsed.map((item, index) => {
      try {
        return createTestCaseFromInput(item);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        throw new Error(`Invalid test case at index ${index}: ${message}`);
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

