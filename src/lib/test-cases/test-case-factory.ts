import { v4 as uuidv4 } from 'uuid';
import {
  ExpectedOutcomeField,
  ExpectedOutcomeSchema,
  ExpectedOutcomeSchemaField,
  TestCase,
  TestCaseInput,
} from '../../types/llm-test-runner';
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

/**
 * Creates a runtime test case from validated input data.
 * The input is expected to already satisfy `TestCaseInput` (legacy string or v2 shape),
 * and this function only performs normalization/defaulting (including legacy migration).
 *
 * @param data - Validated test case input
 * @returns A normalized TestCase object with runtime defaults applied
 */
export function createTestCaseFromInput(data: TestCaseInput): TestCase {
  let expectedOutcome: ExpectedOutcomeField[];
  if (typeof data.expectedOutcome === 'string') {
    expectedOutcome = migrateLegacyExpectedOutcomeString(data.expectedOutcome);
  } else {
    expectedOutcome = data.expectedOutcome;
  }

  return { ...data, expectedOutcome };
}
