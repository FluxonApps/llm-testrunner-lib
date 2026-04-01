import { h, FunctionalComponent } from '@stencil/core';
import { TestCase } from '../../../types/llm-test-runner';
import { LLMTestCaseRow } from './llm-test-case-row';
import { Button } from '../../../lib/ui/button/index';
import { ExpectedOutcomeChangeDetail } from './expected-outcome-renderer';

export interface LLMTestCasesProps {
  testCases: TestCase[];
  dynamicResolutionSupported?: boolean;
  onRun: (testCase: TestCase) => void;
  onDelete: (id: string) => void;
  onAddTestCase: () => void;
  handleTestCaseChange: (
    e: CustomEvent<{ testCaseId: string; key: string; value: string }>,
  ) => void;
  onExpectedOutcomeChange: (
    e: CustomEvent<ExpectedOutcomeChangeDetail>,
  ) => void;
}

export const LLMTestCases: FunctionalComponent<LLMTestCasesProps> = ({
  testCases,
  dynamicResolutionSupported = false,
  onRun,
  onDelete,
  onAddTestCase,
  handleTestCaseChange,
  onExpectedOutcomeChange,
}) => {
  return (
    <div class="test-cases">
      <div class="test-cases__column-headers">
        <div class="test-cases__column-header">Input</div>
        <div class="test-cases__column-header">Output</div>
        <div class="test-cases__column-header">Evaluation</div>
        <div class="test-cases__column-header">Actions</div>
      </div>

      {testCases.map(testCase => (
        <LLMTestCaseRow
          testCase={testCase}
          dynamicResolutionSupported={dynamicResolutionSupported}
          onRun={onRun}
          onDelete={onDelete}
          handleTestCaseChange={handleTestCaseChange}
          onExpectedOutcomeChange={onExpectedOutcomeChange}
        />
      ))}

      <div class="test-cases__add-section">
        <Button variant="outline" size="md" onClick={onAddTestCase}>
          + Add Question
        </Button>
      </div>
    </div>
  );
};
