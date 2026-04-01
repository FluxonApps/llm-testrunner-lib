import { h, FunctionalComponent } from '@stencil/core';
import {
  ExpectedOutcomeField,
  type ExpectedOutcomeMode,
} from '../../../types/llm-test-runner';
import { ChipsConfig, FormFieldType, SelectConfig, TextAreaConfig } from '../../../lib/form/schema';
import {
  EvaluationApproach,
} from '../../../lib/evaluation/constants';
import { getAllowedApproachesForFieldType } from '../../../lib/evaluation/field-evaluation-approach';
import { ExpectedOutcomeChange } from '../../../lib/test-cases/test-case-mutations';

export type ExpectedOutcomeChangeDetail = {
  testCaseId: string;
} & ExpectedOutcomeChange;

interface ExpectedOutcomeRendererProps {
  testCaseId: string;
  fields: ExpectedOutcomeField[];
  dynamicResolutionSupported?: boolean;
  onExpectedOutcomeChange: (
    e: CustomEvent<ExpectedOutcomeChangeDetail>,
  ) => void;
}

export const ExpectedOutcomeRenderer: FunctionalComponent<ExpectedOutcomeRendererProps> = ({
  testCaseId,
  fields,
  dynamicResolutionSupported = false,
  onExpectedOutcomeChange,
}) => {
  const emit = (detail: ExpectedOutcomeChangeDetail) =>
    onExpectedOutcomeChange({
      detail,
    } as CustomEvent<ExpectedOutcomeChangeDetail>);

  const buildEvaluationConfig = (
    index: number,
    optionList: string[],
  ): SelectConfig => ({
    name: `expectedOutcomeEvaluation-${index}`,
    fieldType: FormFieldType.SELECT,
    label: 'Evaluation Approach',
    placeholder: 'Select evaluation approach…',
    required: true,
    optionList,
    defaultValue: EvaluationApproach.EXACT,
  });

  const buildOutcomeModeConfig = (index: number): SelectConfig => ({
    name: `expectedOutcomeMode-${index}`,
    fieldType: FormFieldType.SELECT,
    label: 'Outcome Mode',
    placeholder: 'Select outcome mode',
    required: true,
    optionList: ['static', 'dynamic'],
    defaultValue: 'static',
  });

  const buildResolutionQueryConfig = (index: number): TextAreaConfig => ({
    name: `expectedOutcomeResolutionQuery-${index}`,
    fieldType: FormFieldType.TEXT_AREA,
    label: 'Resolution Query',
    placeholder: 'Query used to resolve expected value',
    required: false,
    rows: 2,
  });

  const renderEvaluationSelector = (
    field: ExpectedOutcomeField,
    index: number,
  ) => {
    const optionList = getAllowedApproachesForFieldType(field.type);

    return (
      <app-select
        config={buildEvaluationConfig(index, optionList)}
        value={field.evaluationParameters?.approach}
        onValueChange={(e) =>
          emit({
            testCaseId,
            index,
            operation: 'set-evaluation-approach',
            value: e.detail.value as EvaluationApproach,
          })
        }
      />
    );
  };

  return (
    <div class="expected-outcome-renderer">
      {(fields || []).map((field, index) => {
        if (field.type === 'textarea') {
          const isDynamic =
            dynamicResolutionSupported && field.outcomeMode === 'dynamic';
          const config: TextAreaConfig = {
            name: `expectedOutcome-${index}`,
            fieldType: FormFieldType.TEXT_AREA,
            label: field.label,
            placeholder: isDynamic ? 'Resolved on run' : field.placeholder,
            required: !isDynamic,
            readOnly: isDynamic,
            helpText: isDynamic
              ? 'Filled automatically when the test is run'
              : undefined,
            rows: field.rows || 2,
          };
          return (
            <div class="expected-outcome-renderer__group">
              <app-textarea
                config={config}
                value={field.value}
                onValueChange={(e) =>
                  emit({
                    testCaseId,
                    index,
                    operation: 'set-value',
                    value: e.detail.value,
                  })
                }
              />
              {dynamicResolutionSupported && (
                <app-select
                  config={buildOutcomeModeConfig(index)}
                  value={field.outcomeMode || 'static'}
                  onValueChange={(e) =>
                    emit({
                      testCaseId,
                      index,
                      operation: 'set-outcome-mode',
                      value: e.detail.value as ExpectedOutcomeMode,
                    })
                  }
                />
              )}
              {dynamicResolutionSupported &&
                field.outcomeMode === 'dynamic' && (
                  <app-textarea
                    config={buildResolutionQueryConfig(index)}
                    value={field.resolutionQuery || ''}
                    onValueChange={(e) =>
                      emit({
                        testCaseId,
                        index,
                        operation: 'set-resolution-query',
                        value: e.detail.value,
                      })
                    }
                  />
                )}
              {renderEvaluationSelector(field, index)}
            </div>
          );
        }

        if (field.type === 'chips-input') {
          const config: ChipsConfig = {
            name: `expectedOutcome-${index}`,
            fieldType: FormFieldType.CHIPS,
            label: field.label,
            placeholder: field.placeholder,
            required: true,
          };

          return (
            <div class="expected-outcome-renderer__group">
              <app-chips
                config={config}
                value={field.value}
                onAddChip={(e) =>
                  emit({
                    testCaseId,
                    index,
                    operation: 'add-chip',
                    value: e.detail.value,
                  })
                }
                onRemoveChip={(e) =>
                  emit({
                    testCaseId,
                    index,
                    operation: 'remove-chip',
                    value: e.detail.value,
                  })
                }
              />
              {renderEvaluationSelector(field, index)}
            </div>
          );
        }

        if (field.type === 'select') {
          const config: SelectConfig = {
            name: `expectedOutcome-${index}`,
            fieldType: FormFieldType.SELECT,
            label: field.label,
            placeholder: field.placeholder,
            required: true,
            optionList: field.options,
          };

          return (
            <div class="expected-outcome-renderer__group">
              <app-select
                config={config}
                value={field.value}
                onValueChange={(e) =>
                  emit({
                    testCaseId,
                    index,
                    operation: 'set-value',
                    value: e.detail.value,
                  })
                }
              />
              {renderEvaluationSelector(field, index)}
            </div>
          );
        }

        return (
          <div class="expected-outcome-renderer__group">
            <div class="expected-outcome-renderer__text">
              <label>{field.label}</label>
              <input
                type="text"
                value={field.value}
                placeholder={field.placeholder}
                onInput={(e) =>
                  emit({
                    testCaseId,
                    index,
                    operation: 'set-value',
                    value: (e.target as HTMLInputElement).value,
                  })
                }
              />
            </div>
            {renderEvaluationSelector(field, index)}
          </div>
        );
      })}
    </div>
  );
};
