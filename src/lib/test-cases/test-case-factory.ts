import { v4 as uuidv4 } from 'uuid';
import {
  ExpectedOutcomeField,
  ExpectedOutcomeSchema,
  ExpectedOutcomeSchemaField,
  TestCase,
} from '../../types/llm-test-runner';
import {
  validateExpectedOutcomeArray as validateExpectedOutcomeArrayFromSchema,
  validateExpectedOutcomeSchema as validateExpectedOutcomeSchemaFromSchema,
} from '../../types/expected-outcome';
import { EvaluationApproach } from '../evaluation/constants';

export const DEFAULT_EXPECTED_OUTCOME_SCHEMA: ExpectedOutcomeSchema = [
  {
    type: 'textarea',
    label: 'Expected Outcome',
    placeholder: 'Enter expected outcome...',
    rows: 2,
  },
];

/**
 * Creates a new test case with default values
 * @returns A new TestCase object with a unique ID
 */
export function createTestCase(
  expectedOutcomeSchema: ExpectedOutcomeSchema = DEFAULT_EXPECTED_OUTCOME_SCHEMA,
): TestCase {
  validateExpectedOutcomeSchema(expectedOutcomeSchema);
  return {
    id: uuidv4(),
    question: '',
    expectedOutcome: createExpectedOutcomeFromSchema(expectedOutcomeSchema),
    evaluationParameters: {
      approach: EvaluationApproach.EXACT,
    },
    isRunning: false,
  };
}

function isValidApproach(value: unknown): value is EvaluationApproach {
  return typeof value === 'string' && Object.values(EvaluationApproach).includes(value as EvaluationApproach);
}

export function validateExpectedOutcomeSchema(
  schema: unknown,
): asserts schema is ExpectedOutcomeSchema {
  validateExpectedOutcomeSchemaFromSchema(schema);
}

function createExpectedOutcomeFieldFromSchema(
  schemaField: ExpectedOutcomeSchemaField,
): ExpectedOutcomeField {
  switch (schemaField.type) {
    case 'text':
      return {
        type: 'text',
        label: schemaField.label,
        required: schemaField.required,
        placeholder: schemaField.placeholder,
        value: '',
      };

    case 'textarea':
      return {
        type: 'textarea',
        label: schemaField.label,
        required: schemaField.required,
        placeholder: schemaField.placeholder,
        rows: schemaField.rows,
        value: '',
      };

    case 'chips-input':
      return {
        type: 'chips-input',
        label: schemaField.label,
        required: schemaField.required,
        placeholder: schemaField.placeholder,
        value: [],
      };

    case 'select':
      return {
        type: 'select',
        label: schemaField.label,
        required: schemaField.required,
        placeholder: schemaField.placeholder,
        value: '',
        options: schemaField.options,
      };

    default: {
      const _exhaustiveCheck: never = schemaField;
      return _exhaustiveCheck;
    }
  }
}

export function createExpectedOutcomeFromSchema(
  expectedOutcomeSchema: ExpectedOutcomeSchema,
): ExpectedOutcomeField[] {
  validateExpectedOutcomeSchema(expectedOutcomeSchema);
  return expectedOutcomeSchema.map(createExpectedOutcomeFieldFromSchema);
}

export function migrateLegacyExpectedOutcomeString(
  value: string,
): ExpectedOutcomeField[] {
  return [
    {
      type: 'textarea',
      label: 'Expected Outcome',
      value,
    },
  ];
}

export function validateExpectedOutcomeArray(
  expectedOutcome: unknown,
): asserts expectedOutcome is ExpectedOutcomeField[] {
  validateExpectedOutcomeArrayFromSchema(expectedOutcome);
}

/**
 * Creates a test case from imported data with defaults
 * @param data - Partial test case data from import
 * @returns A new TestCase object with defaults applied
 */
export function createTestCaseFromImport(data: unknown): TestCase {
  if (!data || typeof data !== 'object') {
    return createTestCase();
  }
  const dataRecord = data as Record<string, unknown>;

  const evaluationParameters =
    dataRecord.evaluationParameters && typeof dataRecord.evaluationParameters === 'object'
      ? (dataRecord.evaluationParameters as Record<string, unknown>)
    : undefined;

  const approach =
    evaluationParameters && isValidApproach(evaluationParameters.approach)
      ? evaluationParameters.approach
      : EvaluationApproach.EXACT;

  const threshold =
    evaluationParameters && typeof evaluationParameters.threshold === 'number'
      ? evaluationParameters.threshold
      : 0.6;

  let expectedOutcome: ExpectedOutcomeField[];
  if (typeof dataRecord.expectedOutcome === 'string') {
    expectedOutcome = migrateLegacyExpectedOutcomeString(dataRecord.expectedOutcome);
  } else {
    validateExpectedOutcomeArray(dataRecord.expectedOutcome);
    expectedOutcome = dataRecord.expectedOutcome;
  }

  return {
    id: uuidv4(),
    question: typeof dataRecord.question === 'string' ? dataRecord.question : '',
    expectedOutcome,

    evaluationParameters: {
      approach,
      threshold,
    },
    isRunning: false,
  };
}
