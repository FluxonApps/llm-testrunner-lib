import { h, FunctionalComponent } from '@stencil/core';
import {
  ExpectedOutcomeField,
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
  onExpectedOutcomeChange: (
    e: CustomEvent<ExpectedOutcomeChangeDetail>,
  ) => void;
}

export const ExpectedOutcomeRenderer: FunctionalComponent<ExpectedOutcomeRendererProps> = ({
  testCaseId,
  fields,
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
          const config: TextAreaConfig = {
            name: `expectedOutcome-${index}`,
            fieldType: FormFieldType.TEXT_AREA,
            label: field.label,
            placeholder: field.placeholder,
            required: field.required,
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
            required: field.required,
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
            required: field.required,
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
