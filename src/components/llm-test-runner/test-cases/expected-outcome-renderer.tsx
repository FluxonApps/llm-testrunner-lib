import { h, FunctionalComponent } from '@stencil/core';
import {
  ExpectedOutcomeField,
  type EvaluationSource,
  type ExpectedOutcomeMode,
} from '../../../types/llm-test-runner';
import { ChipsConfig, FormFieldType, SelectConfig, TextAreaConfig } from '../../../lib/form/schema';
import {
  EvaluationApproach,
  getDefaultPassScoreForApproach,
} from '../../../lib/evaluation/constants';
import { getAllowedApproachesForFieldType } from '../../../lib/evaluation/field-evaluation-approach';
import { ExpectedOutcomeChange } from '../../../lib/test-cases/test-case-mutations';
import { ChevronDownIcon, InfoIcon } from '../../../lib/ui/icons/icons';
import { Tooltip } from '../../../lib/ui/tooltip';
import { isPrimaryExpectedOutcomeMissing } from '../../../lib/test-cases/test-case-validation';

const MANDATORY_FIELD_MESSAGE = 'This field is mandatory';

export type ExpectedOutcomeChangeDetail = {
  testCaseId: string;
} & ExpectedOutcomeChange;

interface ExpectedOutcomeRendererProps {
  testCaseId: string;
  fields: ExpectedOutcomeField[];
  dynamicResolutionSupported?: boolean;
  extractorIds?: string[];
  isPrimaryFieldTouched: boolean;
  onPrimaryFieldTouch: () => void;
  onExpectedOutcomeChange: (
    e: CustomEvent<ExpectedOutcomeChangeDetail>,
  ) => void;
}

const EVALUATION_APPROACH_HELP =
  "How this value is compared against the model's response.";

export const ExpectedOutcomeRenderer: FunctionalComponent<ExpectedOutcomeRendererProps> = ({
  testCaseId,
  fields,
  dynamicResolutionSupported = false,
  extractorIds = [],
  isPrimaryFieldTouched,
  onPrimaryFieldTouch,
  onExpectedOutcomeChange,
}) => {
  const hasExtractorOptions = extractorIds.length > 0;
  const firstExtractorId = extractorIds[0];

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
    ariaLabel: 'Evaluation approach',
    compact: true,
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

  const buildEvaluationSourceConfig = (index: number): SelectConfig => ({
    name: `expectedOutcomeEvaluationSource-${index}`,
    fieldType: FormFieldType.SELECT,
    label: 'Evaluation Source',
    placeholder: 'Select evaluation source',
    required: true,
    optionList: ['text', 'custom'],
    defaultValue: 'text',
  });

  const buildExtractorConfig = (index: number): SelectConfig => ({
    name: `expectedOutcomeEvaluationSourceExtractor-${index}`,
    fieldType: FormFieldType.SELECT,
    label: 'Extractor',
    placeholder: 'Select extractor',
    required: true,
    optionList: extractorIds,
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

  const renderThresholdInput = (
    field: ExpectedOutcomeField,
    index: number,
  ) => {
    const approach = field.evaluationParameters?.approach;

    if (!approach || approach === EvaluationApproach.EXACT) {
      return null;
    }

    const defaultThreshold = getDefaultPassScoreForApproach(approach);
    return (
      <threshold-input
        inputId={`expectedOutcomeThreshold-${index}`}
        label="Threshold"
        compact
        value={field.evaluationParameters?.threshold}
        defaultValue={defaultThreshold}
        onThresholdChange={(e) =>
          emit({
            testCaseId,
            index,
            operation: 'set-evaluation-threshold',
            value: e.detail.value,
          })
        }
      />
    );
  };

  const renderEvaluationSourceSelector = (
    field: ExpectedOutcomeField,
    index: number,
  ) => {
    if (!hasExtractorOptions) {
      return null;
    }

    const sourceType = field.evaluationSource?.type || 'text';

    return (
      <div>
        <app-select
          config={buildEvaluationSourceConfig(index)}
          value={sourceType}
          onValueChange={(e) =>
            emit({
              testCaseId,
              index,
              operation: 'set-evaluation-source-type',
              value: e.detail.value as EvaluationSource['type'],
              fallbackExtractorId: firstExtractorId,
            })
          }
        />
        {sourceType === 'custom' && (
          <app-select
            config={buildExtractorConfig(index)}
            value={field.evaluationSource?.type === 'custom'
              ? field.evaluationSource.extractorId
              : ''}
            onValueChange={(e) =>
              emit({
                testCaseId,
                index,
                operation: 'set-evaluation-source-extractor',
                value: e.detail.value,
              })
            }
          />
        )}
      </div>
    );
  };

  const renderCriteriaInput = (
    field: ExpectedOutcomeField,
    index: number,
    hideLabel: boolean,
  ) => {
    if (field.evaluationParameters?.approach !== EvaluationApproach.LLM_JUDGE) {
      return null;
    }
    return (
      <criteria-input
        criteria={field.evaluationParameters?.criteria}
        hideLabel={hideLabel}
        onCriteriaChange={(e) =>
          emit({
            testCaseId,
            index,
            operation: 'set-evaluation-criteria',
            value: e.detail.value,
          })
        }
      />
    );
  };

  const renderAdvancedOptions = (field: ExpectedOutcomeField, index: number) => {
    const sourceSelector = renderEvaluationSourceSelector(field, index);
    // Name the disclosure for what it holds when criteria is the only thing
    // behind it, instead of a redundant "More options" -> "LLM Judge Criteria" double label.
    const criteriaOnly = !sourceSelector;
    const criteriaInput = renderCriteriaInput(field, index, criteriaOnly);
    if (!sourceSelector && !criteriaInput) return null;

    return (
      <details class="expected-outcome-renderer__options">
        <summary class="expected-outcome-renderer__options-summary">
          {criteriaOnly ? 'LLM Judge Criteria (JSON)' : 'More options'}
        </summary>
        <div class="expected-outcome-renderer__options-content">
          {sourceSelector}
          {criteriaInput}
        </div>
      </details>
    );
  };

  const renderFieldBody = (
    field: ExpectedOutcomeField,
    index: number,
    isPrimary: boolean,
  ) => {
    if (field.type === 'textarea') {
      const isDynamic =
        dynamicResolutionSupported && field.outcomeMode === 'dynamic';
      const isMissing =
        isPrimary &&
        isPrimaryFieldTouched &&
        isPrimaryExpectedOutcomeMissing([field]);
      const config: TextAreaConfig = {
        name: `expectedOutcome-${index}`,
        fieldType: FormFieldType.TEXT_AREA,
        placeholder: isDynamic ? 'Resolved on run' : field.placeholder,
        required: !isDynamic,
        readOnly: isDynamic,
        invalid: isMissing,
        helpText: isDynamic
          ? 'Filled automatically when the test is run'
          : undefined,
        rows: field.rows || 3,
        // The copy button renders in the card header instead of here, since
        // the header already carries the field's label.
        is_copyable: false,
      };
      return (
        <div class="expected-outcome-renderer__card-body">
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
            // focusout bubbles + is composed (unlike blur), so this fires despite
            // app-textarea's own shadow root.
            onFocusout={isPrimary ? onPrimaryFieldTouch : undefined}
          />
          {isMissing && (
            <p class="expected-outcome-renderer__mandatory-message">
              {MANDATORY_FIELD_MESSAGE}
            </p>
          )}
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
          {dynamicResolutionSupported && field.outcomeMode === 'dynamic' && (
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
        </div>
      );
    }

    if (field.type === 'chips-input') {
      const isMissing =
        isPrimary &&
        isPrimaryFieldTouched &&
        isPrimaryExpectedOutcomeMissing([field]);
      const config: ChipsConfig = {
        name: `expectedOutcome-${index}`,
        fieldType: FormFieldType.CHIPS,
        placeholder: field.placeholder,
        required: true,
      };

      return (
        <div class="expected-outcome-renderer__card-body">
          <div
            class={{
              'expected-outcome-renderer__chips-wrap': true,
              'expected-outcome-renderer__chips-wrap--invalid': isMissing,
            }}
            onFocusout={isPrimary ? onPrimaryFieldTouch : undefined}
          >
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
          </div>
          {isMissing && (
            <p class="expected-outcome-renderer__mandatory-message">
              {MANDATORY_FIELD_MESSAGE}
            </p>
          )}
        </div>
      );
    }

    if (field.type === 'select') {
      const config: SelectConfig = {
        name: `expectedOutcome-${index}`,
        fieldType: FormFieldType.SELECT,
        placeholder: field.placeholder,
        required: true,
        optionList: field.options,
      };

      return (
        <div class="expected-outcome-renderer__card-body">
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
        </div>
      );
    }

    return (
      <div class="expected-outcome-renderer__card-body">
        <input
          class="expected-outcome-renderer__text-input"
          type="text"
          value={field.value}
          placeholder={field.placeholder}
          aria-label={field.label}
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
    );
  };

  const renderFieldSections = (
    field: ExpectedOutcomeField,
    index: number,
    isPrimary: boolean,
  ) => {
    const isDynamic =
      dynamicResolutionSupported && field.type === 'textarea' && field.outcomeMode === 'dynamic';

    return [
      <div class="expected-outcome-renderer__card-header">
        <span class="expected-outcome-renderer__card-title">
          {field.label}
        </span>
        {!isDynamic && (
          <div class="expected-outcome-renderer__card-controls">
            {field.type === 'textarea' && (
              <copy-button value={field.value} label={`Copy ${field.label}`} />
            )}
            <Tooltip content={EVALUATION_APPROACH_HELP} class="expected-outcome-renderer__info-icon">
              <InfoIcon />
            </Tooltip>
            {renderEvaluationSelector(field, index)}
            {renderThresholdInput(field, index)}
          </div>
        )}
      </div>,
      renderFieldBody(field, index, isPrimary),
      !isDynamic && renderAdvancedOptions(field, index),
    ];
  };

  // Only the primary field gates Run — see isPrimaryExpectedOutcomeMissing.
  const renderPrimarySection = (field: ExpectedOutcomeField, index: number) => (
    <div class="expected-outcome-renderer__primary">
      {renderFieldSections(field, index, true)}
    </div>
  );

  const renderSecondaryCard = (field: ExpectedOutcomeField, index: number) => (
    <div class="expected-outcome-renderer__card" key={`${field.label}-${index}`}>
      {renderFieldSections(field, index, false)}
    </div>
  );

  const [primaryField, ...secondaryFields] = fields || [];

  return (
    <div class="expected-outcome-renderer">
      {primaryField && (
        <div class="expected-outcome-renderer__outer-card">
          {renderPrimarySection(primaryField, 0)}

          {secondaryFields.length > 0 && (
            <details class="expected-outcome-renderer__more-options">
              <summary class="expected-outcome-renderer__more-options-summary">
                <ChevronDownIcon class="expected-outcome-renderer__more-options-chevron" />
                More Options
              </summary>
              <div class="expected-outcome-renderer__more-options-content">
                {secondaryFields.map((field, i) => renderSecondaryCard(field, i + 1))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
