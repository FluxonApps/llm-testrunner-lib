import { h, FunctionalComponent } from '@stencil/core';
import { TestCase } from '../../../types/llm-test-runner';
import { ResponseOutput } from './output/response-output';
import { EvaluationSummary } from './evaluation/evaluation-summary';
import { RowActions } from './actions/row-actions';
import { FormFieldType, TextAreaConfig } from '../../../lib/form/schema';
import {
  ExpectedOutcomeChangeDetail,
  ExpectedOutcomeRenderer,
} from './expected-outcome-renderer';

export interface LLMTestCaseRowProps {
  testCase: TestCase;
  onRun: (testCase: TestCase) => void;
  onDelete: (id: string) => void;
  handleTestCaseChange: (
    e: CustomEvent<{ testCaseId: string; key: string; value: string }>,
  ) => void;
  onExpectedOutcomeChange: (
    e: CustomEvent<ExpectedOutcomeChangeDetail>,
  ) => void;
}

export const LLMTestCaseRow: FunctionalComponent<LLMTestCaseRowProps> = ({
  testCase,
  onRun,
  onDelete,
  handleTestCaseChange,
  onExpectedOutcomeChange,
}) => {
  const questionConfig: TextAreaConfig = {
    name: 'question',
    fieldType: FormFieldType.TEXT_AREA,
    type: 'text',
    label: 'Question',
    placeholder: 'Enter your question here...',
    required: true,
    rows: 3,
  };
  return (
    <div class="test-case-row" key={testCase.id}>
      <div class="test-case-row__input-column">
        <app-textarea
          config={questionConfig}
          value={testCase.question}
          onValueChange={(e) =>
            handleTestCaseChange({
              detail: {
                testCaseId: testCase.id,
                key: 'question',
                value: e.detail.value,
              },
            } as CustomEvent<{ testCaseId: string; key: string; value: string }>)
          }
        />
        <ExpectedOutcomeRenderer
          testCaseId={testCase.id}
          fields={testCase.expectedOutcome || []}
          onExpectedOutcomeChange={onExpectedOutcomeChange}
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
