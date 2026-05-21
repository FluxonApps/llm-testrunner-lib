import {
  TestCase,
  type ExpectedOutcomeField,
  type EvaluationSource,
  type ExpectedOutcomeMode,
  type Criterion,
} from '../../types/llm-test-runner';
import { EvaluationApproach } from '../evaluation/constants';
import { normalizeEvaluationParametersForField } from '../evaluation/field-evaluation-approach';

function isChipsInputField(
  field: ExpectedOutcomeField,
): field is Extract<ExpectedOutcomeField, { type: 'chips-input' }> {
  return field.type === 'chips-input';
}

function isTextareaField(
  field: ExpectedOutcomeField,
): field is Extract<ExpectedOutcomeField, { type: 'textarea' }> {
  return field.type === 'textarea';
}

function isDynamicTextareaField(
  field: ExpectedOutcomeField,
): field is Extract<ExpectedOutcomeField, { type: 'textarea' }> {
  return isTextareaField(field) && field.outcomeMode === 'dynamic';
}


export type ExpectedOutcomeChange =
  | {
      index: number;
      operation: 'set-value';
      value: string;
    }
  | {
      index: number;
      operation: 'add-chip';
      value: string;
    }
  | {
      index: number;
      operation: 'remove-chip';
      value: string;
    }
  | {
      index: number;
      operation: 'set-evaluation-approach';
      value: EvaluationApproach;
    }
  | {
      index: number;
      operation: 'set-evaluation-threshold';
      value: number | undefined;
    }
  | {
      index: number;
      operation: 'set-outcome-mode';
      value: ExpectedOutcomeMode;
    }
  | {
      index: number;
      operation: 'set-resolution-query';
      value: string;
    }
  | {
      index: number;
      operation: 'set-evaluation-source-type';
      value: EvaluationSource['type'];
      fallbackExtractorId?: string;
    }
  | {
      index: number;
      operation: 'set-evaluation-source-extractor';
      value: string;
    }
  | {
      index: number;
      operation: 'set-evaluation-criteria';
      value: Criterion[] | undefined; // clears the criteria override, evaluator falls back to its default correctness criterion.
    };

export function applyExpectedOutcomeChange(
  testCase: TestCase,
  change: ExpectedOutcomeChange,
): TestCase {
  const { index } = change;
  const expectedOutcome = [...(testCase.expectedOutcome || [])];
  const target = expectedOutcome[index];

  if (!target) {
    return testCase;
  }

  const commit = (updatedField: ExpectedOutcomeField): TestCase => {
    expectedOutcome[index] = updatedField;
    return { ...testCase, expectedOutcome };
  };

  switch (change.operation) {
    case 'set-value': {
      if (isChipsInputField(target)) {
        return testCase;
      }
      if (isDynamicTextareaField(target)) {
        return testCase;
      }
      return commit({
        ...target,
        value: change.value,
      });
    }
    case 'add-chip': {
      if (!isChipsInputField(target)) {
        return testCase;
      }
      return commit({
        ...target,
        value: [...target.value, change.value],
      });
    }
    case 'remove-chip': {
      if (!isChipsInputField(target)) {
        return testCase;
      }
      return commit({
        ...target,
        value: target.value.filter(chip => chip !== change.value),
      });
    }
    case 'set-evaluation-approach':
      return updateExpectedOutcomeFieldApproach(testCase, index, change.value);
    case 'set-evaluation-threshold':
      return updateExpectedOutcomeFieldThreshold(testCase, index, change.value);
    case 'set-outcome-mode': {
      if (!isTextareaField(target)) {
        return testCase;
      }
      const mode = change.value;
      if (mode === 'static') {
        const { resolutionQuery: _, ...rest } = target;
        return commit({
          ...rest,
          outcomeMode: 'static',
          value: '',
        });
      } else {
        return commit({
          ...target,
          outcomeMode: 'dynamic',
          value: '',
        });
      }
    }
    case 'set-resolution-query': {
      if (!isDynamicTextareaField(target)) {
        return testCase;
      }
      return commit({
        ...target,
        resolutionQuery: change.value,
      });
    }
    case 'set-evaluation-source-type': {
      if (change.value === 'text') {
        return commit({
          ...target,
          evaluationSource: { type: 'text' },
        });
      }

      const extractorId =
        target.evaluationSource?.type === 'custom'
          ? target.evaluationSource.extractorId
          : (change.fallbackExtractorId ?? '');
      return commit({
        ...target,
        evaluationSource: {
          type: 'custom',
          extractorId,
        },
      });
    }
    case 'set-evaluation-source-extractor': {
      return commit({
        ...target,
        evaluationSource: {
          type: 'custom',
          extractorId: change.value,
        },
      });
    }
    case 'set-evaluation-criteria':
      return updateExpectedOutcomeFieldCriteria(testCase, index, change.value);
  }
}

/**
 * Updates the evaluation approach for a specific expected outcome field.
 * Select fields always use exact matching.
 */
export function updateExpectedOutcomeFieldApproach(
  testCase: TestCase,
  fieldIndex: number,
  approach: EvaluationApproach,
): TestCase {
  const expectedOutcome = [...(testCase.expectedOutcome || [])];
  const target = expectedOutcome[fieldIndex];

  if (!target) {
    return testCase;
  }

  const currentEvaluationParameters = target.evaluationParameters;
  expectedOutcome[fieldIndex] = {
    ...target,
    evaluationParameters: normalizeEvaluationParametersForField(target.type, {
      ...currentEvaluationParameters,
      approach,
    }),
  };

  return {
    ...testCase,
    expectedOutcome,
  };
}

export function updateExpectedOutcomeFieldThreshold(
  testCase: TestCase,
  fieldIndex: number,
  threshold: number | undefined,
): TestCase {
  const expectedOutcome = [...(testCase.expectedOutcome || [])];
  const target = expectedOutcome[fieldIndex];

  if (!target) {
    return testCase;
  }

  const currentApproach = target.evaluationParameters?.approach;
  if (!currentApproach) {
    return testCase;
  }

  // Drop any existing threshold so we can rebuild deterministically below.
  const { threshold: _previousThreshold, ...restParams } =
    target.evaluationParameters ?? { approach: currentApproach };

  const evaluationParameters =
    threshold === undefined
      ? { ...restParams, approach: currentApproach }
      : { ...restParams, approach: currentApproach, threshold };

  expectedOutcome[fieldIndex] = {
    ...target,
    evaluationParameters,
  };

  return {
    ...testCase,
    expectedOutcome,
  };
}
export function updateExpectedOutcomeFieldCriteria(testCase: TestCase, fieldIndex: number, criteria: Criterion[] | undefined): TestCase {
  const expectedOutcome = [...(testCase.expectedOutcome || [])];
  const target = expectedOutcome[fieldIndex];

  if (!target) {
    return testCase;
  }
  const currentApproach = target.evaluationParameters?.approach;
  if (!currentApproach) {
    return testCase;
  }
  const { criteria: _drop, ...restParams } =
       target.evaluationParameters ?? { approach: currentApproach };
  const evaluationParameters = criteria
    ? { ...restParams, approach: currentApproach, criteria }
    : { ...restParams, approach: currentApproach };
  
  expectedOutcome[fieldIndex] = {
    ...target,
    evaluationParameters,
  };
  return {
    ...testCase,
    expectedOutcome,
  };
}