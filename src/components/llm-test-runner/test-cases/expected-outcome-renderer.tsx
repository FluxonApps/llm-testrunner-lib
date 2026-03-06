import { h, FunctionalComponent } from '@stencil/core';
import {
  ExpectedOutcomeField,
} from '../../../types/llm-test-runner';
import { ChipsConfig, FormFieldType, SelectConfig, TextAreaConfig } from '../../../lib/form/schema';

export type ExpectedOutcomeOperation =
  | 'set-value'
  | 'add-chip'
  | 'remove-chip';

export interface ExpectedOutcomeChangeDetail {
  testCaseId: string;
  index: number;
  operation: ExpectedOutcomeOperation;
  value?: string;
}

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
            <app-textarea
              config={config}
              value={field.value}
              onValueChange={(e: CustomEvent<{ value: string }>) =>
                emit({
                  testCaseId,
                  index,
                  operation: 'set-value',
                  value: e.detail.value,
                })
              }
            />
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
            <app-chips
              config={config}
              value={field.value}
              onAddChip={(e: CustomEvent<{ value: string }>) =>
                emit({
                  testCaseId,
                  index,
                  operation: 'add-chip',
                  value: e.detail.value,
                })
              }
              onRemoveChip={(e: CustomEvent<{ value: string }>) =>
                emit({
                  testCaseId,
                  index,
                  operation: 'remove-chip',
                  value: e.detail.value,
                })
              }
            />
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
            <app-select
              config={config}
              value={field.value}
              onValueChange={(e: CustomEvent<{ value: any }>) =>
                emit({
                  testCaseId,
                  index,
                  operation: 'set-value',
                  value: String(e.detail.value),
                })
              }
            />
          );
        }

        return (
          <div class="expected-outcome-renderer__text">
            <label>{field.label}</label>
            <input
              type="text"
              value={field.value}
              placeholder={field.placeholder}
              onInput={(e: Event) =>
                emit({
                  testCaseId,
                  index,
                  operation: 'set-value',
                  value: (e.target as HTMLInputElement).value,
                })
              }
            />
          </div>
        );
      })}
    </div>
  );
};
