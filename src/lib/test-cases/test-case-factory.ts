import { v4 as uuidv4 } from 'uuid';
import {
  ExpectedOutcomeField,
  ExpectedOutcomeSchema,
  ExpectedOutcomeSchemaField,
  TestCase,
  TestCaseInput,
  TextareaExpectedOutcomeField,
} from '../../types/llm-test-runner';
import { EvaluationApproach } from '../evaluation/constants';
import type { EvaluationParameters } from '../../types/evaluation';

export const DEFAULT_EXPECTED_OUTCOME_SCHEMA: ExpectedOutcomeSchema = [
  {
    type: 'textarea',
    label: 'Expected Outcome',
    placeholder: 'Enter expected outcome...',
    rows: 2,
  },
];

function createNonSelectFieldEvaluationParameters(
  fieldEvaluationParameters?: EvaluationParameters,
): EvaluationParameters {
  const approach =
    fieldEvaluationParameters?.approach ?? EvaluationApproach.EXACT;
  const threshold = fieldEvaluationParameters?.threshold;

  return threshold === undefined ? { approach } : { approach, threshold };
}

function createSelectFieldEvaluationParameters(
  fieldEvaluationParameters?: { approach: EvaluationApproach.EXACT; threshold?: number },
): { approach: EvaluationApproach.EXACT; threshold?: number } {
  return {
    approach: EvaluationApproach.EXACT,
    threshold: fieldEvaluationParameters?.threshold,
  };
}

function normalizeExpectedOutcomeField(
  field: ExpectedOutcomeField,
): ExpectedOutcomeField {
  if (field.type === 'select') {
    return {
      ...field,
      evaluationParameters: createSelectFieldEvaluationParameters(
        field.evaluationParameters,
      ),
    };
  }

  return {
    ...field,
    evaluationParameters: createNonSelectFieldEvaluationParameters(
      field.evaluationParameters,
    ),
  };
}

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
        evaluationParameters: createNonSelectFieldEvaluationParameters(
          schemaField.evaluationParameters,
        ),
      };

    case 'textarea':
      return {
        type: 'textarea',
        label: schemaField.label,
        required: schemaField.required,
        placeholder: schemaField.placeholder,
        rows: schemaField.rows,
        value: '',
        evaluationParameters: createNonSelectFieldEvaluationParameters(
          schemaField.evaluationParameters,
        ),
      };

    case 'chips-input':
      return {
        type: 'chips-input',
        label: schemaField.label,
        required: schemaField.required,
        placeholder: schemaField.placeholder,
        value: [],
        evaluationParameters: createNonSelectFieldEvaluationParameters(
          schemaField.evaluationParameters,
        ),
      };

    case 'select':
      return {
        type: 'select',
        label: schemaField.label,
        required: schemaField.required,
        placeholder: schemaField.placeholder,
        value: '',
        options: schemaField.options,
        evaluationParameters: createSelectFieldEvaluationParameters(
          schemaField.evaluationParameters,
        ),
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
): TextareaExpectedOutcomeField[] {
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

  return {
    ...data,
    expectedOutcome: expectedOutcome.map(normalizeExpectedOutcomeField),
  };
}
