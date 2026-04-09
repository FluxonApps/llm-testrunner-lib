import { v4 as uuidv4 } from 'uuid';
import {
  ExpectedOutcomeField,
  ExpectedOutcomeSchema,
  ExpectedOutcomeSchemaField,
  TestCase,
  TestCaseInput,
} from '../../types/llm-test-runner';
import { EvaluationApproach } from '../evaluation/constants';
import { normalizeEvaluationParametersForField } from '../evaluation/field-evaluation-approach';

export const DEFAULT_EXPECTED_OUTCOME_SCHEMA: ExpectedOutcomeSchema = [
  {
    type: 'textarea',
    label: 'Expected Outcome',
    placeholder: 'Enter expected outcome...',
    rows: 2,
  },
];

function normalizeExpectedOutcomeField(
  field: ExpectedOutcomeField,
): ExpectedOutcomeField {
  return {
    ...field,
    evaluationSource: field.evaluationSource || { type: 'text' },
    evaluationParameters: normalizeEvaluationParametersForField(
      field.type,
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
    chatHistory: { enabled: false, value: '' },
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
        placeholder: schemaField.placeholder,
        evaluationSource: schemaField.evaluationSource || { type: 'text' },
        value: '',
        evaluationParameters: normalizeEvaluationParametersForField(
          schemaField.type,
          schemaField.evaluationParameters,
        ),
      };

    case 'textarea':
      return {
        type: 'textarea',
        label: schemaField.label,
        placeholder: schemaField.placeholder,
        evaluationSource: schemaField.evaluationSource || { type: 'text' },
        rows: schemaField.rows,
        value: '',
        evaluationParameters: normalizeEvaluationParametersForField(
          schemaField.type,
          schemaField.evaluationParameters,
        ),
      };

    case 'chips-input':
      return {
        type: 'chips-input',
        label: schemaField.label,
        placeholder: schemaField.placeholder,
        evaluationSource: schemaField.evaluationSource || { type: 'text' },
        value: [],
        evaluationParameters: normalizeEvaluationParametersForField(
          schemaField.type,
          schemaField.evaluationParameters,
        ),
      };

    case 'select':
      return {
        type: 'select',
        label: schemaField.label,
        placeholder: schemaField.placeholder,
        evaluationSource: schemaField.evaluationSource || { type: 'text' },
        value: schemaField.options[0],
        options: schemaField.options,
        evaluationParameters: normalizeEvaluationParametersForField(
          schemaField.type,
          schemaField.evaluationParameters,
        ) as { approach: EvaluationApproach.EXACT; threshold?: number },
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

/**
 * Creates a runtime test case from validated input data.
 * The input is expected to already satisfy `TestCaseInput`,
 * and this function only performs normalization/defaulting.
 *
 * @param data - Validated test case input
 * @returns A normalized TestCase object with runtime defaults applied
 */
export function createTestCaseFromInput(data: TestCaseInput): TestCase {
  return {
    ...data,
    chatHistory: data.chatHistory ?? { enabled: false, value: '' },
    expectedOutcome: data.expectedOutcome.map(normalizeExpectedOutcomeField),
  };
}
