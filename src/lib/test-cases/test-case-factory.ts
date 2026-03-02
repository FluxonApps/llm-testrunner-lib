import { v4 as uuidv4 } from 'uuid';
import { TestCase } from '../../types/llm-test-runner';
import { EvaluationApproach } from '../evaluation/constants';

/**
 * Creates a new test case with default values
 * @returns A new TestCase object with a unique ID
 */
export function createTestCase(): TestCase {
  return {
    id: uuidv4(),
    question: '',
    expectedOutcome: '',
    evaluationParameters: {
      approach: EvaluationApproach.EXACT,
    },
    isRunning: false,
  };
}

// Type guard to safely check if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Type guard for evaluation approach
function isValidApproach(value: unknown): value is EvaluationApproach {
  return (
    typeof value === 'string' &&
    ['exact', 'semantic', 'rouge-1', 'rouge-L'].includes(value)
  );
}

/**
 * Creates a test case from imported data with defaults
 * @param data - Partial test case data from import
 * @returns A new TestCase object with defaults applied
 */
export function createTestCaseFromImport(data: unknown): TestCase {
  if (!isRecord(data)) {
    return createTestCase();
  }

  const evaluationParameters = isRecord(data.evaluationParameters)
    ? data.evaluationParameters
    : undefined;

  const approach =
    evaluationParameters && isValidApproach(evaluationParameters.approach)
      ? evaluationParameters.approach
      : EvaluationApproach.EXACT;

  const threshold =
    evaluationParameters && typeof evaluationParameters.threshold === 'number'
      ? evaluationParameters.threshold
      : 0.6;

  return {
    id: uuidv4(),
    question: typeof data.question === 'string' ? data.question : '',
    expectedOutcome: typeof data.expectedOutcome === 'string' ? data.expectedOutcome : '',

    evaluationParameters: {
      approach,
      threshold,
    },
    isRunning: false,
  };
}
