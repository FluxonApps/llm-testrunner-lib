import { h, FunctionalComponent } from '@stencil/core';
import { TestCase } from '../../../types/llm-test-runner';
import { EvaluationApproach } from '../../../lib/evaluation/constants';
import { LLMTestCaseRow } from './llm-test-case-row';
import { Button } from '../../../lib/ui/button/index';

export interface LLMTestCasesProps {
  testCases: TestCase[];
  onRun: (testCase: TestCase) => void;
  onDelete: (id: string) => void;
  onUpdateApproach: (testCase: TestCase, approach: EvaluationApproach) => void;
  onAddTestCase: () => void;
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

export const LLMTestCases: FunctionalComponent<LLMTestCasesProps> = ({
  testCases,
  onRun,
  onDelete,
  onUpdateApproach,
  onAddTestCase,
  handleTestCaseChange,
  addChip,
  removeChip,
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
          onRun={onRun}
          onDelete={onDelete}
          onUpdateApproach={onUpdateApproach}
          handleTestCaseChange={handleTestCaseChange}
          addChip={addChip}
          removeChip={removeChip}
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
