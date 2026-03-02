import { h, FunctionalComponent } from '@stencil/core';
import { TestCase } from '../../../types/llm-test-runner';
import {
  EvaluationApproach,
  EvaluationApproachValues,
} from '../../../lib/evaluation/constants';
import { ResponseOutput } from './output/response-output';
import { EvaluationSummary } from './evaluation/evaluation-summary';
import { RowActions } from './actions/row-actions';
import { FieldConfig, FormFieldType } from '../../../lib/form/schema';

export interface LLMTestCaseRowProps {
  testCase: TestCase;
  onRun: (testCase: TestCase) => void;
  onDelete: (id: string) => void;
  onUpdateApproach: (testCase: TestCase, approach: EvaluationApproach) => void;
  handleTestCaseChange: (
    e: CustomEvent<{ testCaseId: string; key: string; value: string }>,
  ) => void;
  addChip: (
    e: CustomEvent<{ testCaseId: string; key: string; value: string }>,
  ) => void;
  removeChip: (
    e: CustomEvent<{ testCaseId: string; key: string; index: number }>,
  ) => void;
}

const formFields: FieldConfig[] = [
  {
    name: 'question',
    fieldType: FormFieldType.TEXT_AREA,
    type: 'text',
    label: 'Question',
    placeholder: 'Enter your question here...',
    required: true,
    rows: 3,
  },
  {
    name: 'expectedOutcome',
    fieldType: FormFieldType.TEXT_AREA,
    type: 'text',
    label: 'Expected outcome',
    placeholder: 'Enter expected outcome...',
    required: false,
    rows: 2,
  },
  {
    name: 'EvaluationApproach',
    fieldType: FormFieldType.SELECT,
    label: 'Evaluation',
    placeholder: 'Select evaluation approach…',
    required: true,
    optionList: EvaluationApproachValues,
    defaultValue: EvaluationApproach.EXACT,
  },
];

export const LLMTestCaseRow: FunctionalComponent<LLMTestCaseRowProps> = ({
  testCase,
  onRun,
  onDelete,
  onUpdateApproach,
  handleTestCaseChange,
  addChip,
  removeChip,
}) => {
  return (
    <div class="test-case-row" key={testCase.id}>
      <div class="test-case-row__input-column">
        <form-builder
          fields={formFields}
          testCase={testCase}
          onUpdateApproach={onUpdateApproach}
          handleTestCaseChange={handleTestCaseChange}
          addChip={addChip}
          removeChip={removeChip}
        />
      </div>

      <ResponseOutput output={testCase.output} isRunning={testCase.isRunning} />

      <EvaluationSummary
        result={testCase.evaluationResult}
        isRunning={testCase.isRunning}
      />

      <RowActions
        isRunning={testCase.isRunning}
        canRun={!!testCase.question.trim()}
        onRun={() => onRun(testCase)}
        onDelete={() => onDelete(testCase.id)}
      />
    </div>
  );
};
