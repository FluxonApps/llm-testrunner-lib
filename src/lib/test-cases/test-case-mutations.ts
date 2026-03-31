import {
  TestCase,
  type ExpectedOutcomeMode,
} from '../../types/llm-test-runner';
import { EvaluationApproach } from '../evaluation/constants';
import { normalizeEvaluationParametersForField } from '../evaluation/field-evaluation-approach';

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
      operation: 'set-outcome-mode';
      value: ExpectedOutcomeMode;
    }
  | {
      index: number;
      operation: 'set-resolution-query';
      value: string;
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

  switch (change.operation) {
    case 'set-value': {
      if (target.type === 'chips-input') {
        return testCase;
      }
      if (target.type === 'textarea' && target.outcomeMode === 'dynamic') {
        return testCase;
      }
      expectedOutcome[index] = {
        ...target,
        value: change.value,
      };
      return { ...testCase, expectedOutcome };
    }
    case 'add-chip': {
      if (target.type !== 'chips-input') {
        return testCase;
      }
      expectedOutcome[index] = {
        ...target,
        value: [...target.value, change.value],
      };
      return { ...testCase, expectedOutcome };
    }
    case 'remove-chip': {
      if (target.type !== 'chips-input') {
        return testCase;
      }
      expectedOutcome[index] = {
        ...target,
        value: target.value.filter(chip => chip !== change.value),
      };
      return { ...testCase, expectedOutcome };
    }
    case 'set-evaluation-approach':
      return updateExpectedOutcomeFieldApproach(testCase, index, change.value);
    case 'set-outcome-mode': {
      if (target.type !== 'textarea') {
        return testCase;
      }
      const mode = change.value;
      if (mode === 'static') {
        const { resolutionQuery: _removed, ...rest } = target;
        expectedOutcome[index] = {
          ...rest,
          outcomeMode: 'static',
          value: '',
        };
      } else {
        expectedOutcome[index] = {
          ...target,
          outcomeMode: 'dynamic',
          value: '',
        };
      }
      return { ...testCase, expectedOutcome };
    }
    case 'set-resolution-query': {
      if (target.type !== 'textarea' || target.outcomeMode !== 'dynamic') {
        return testCase;
      }
      expectedOutcome[index] = {
        ...target,
        resolutionQuery: change.value,
      };
      return { ...testCase, expectedOutcome };
    }
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
