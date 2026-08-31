import { h, FunctionalComponent } from '@stencil/core';
import { TestCase } from '../../../types/llm-test-runner';
import { LLMTestCaseRow, ChatHistoryRowChangeDetail } from './llm-test-case-row';
import { ExpectedOutcomeChangeDetail } from './expected-outcome-renderer';
import { PlusIcon } from '../../../lib/ui/icons/icons';

export interface LLMTestCasesProps {
  testCases: TestCase[];
  dynamicResolutionSupported?: boolean;
  extractorIds?: string[];
  onRun: (testCase: TestCase) => void;
  onDelete: (id: string) => void;
  onAddTestCase: () => void;
  touchedPrimaryFieldIds: Set<string>;
  onPrimaryFieldTouch: (testCaseId: string) => void;
  handleTestCaseChange: (
    e: CustomEvent<{ testCaseId: string; key: string; value: string }>,
  ) => void;
  onExpectedOutcomeChange: (
    e: CustomEvent<ExpectedOutcomeChangeDetail>,
  ) => void;
  onChatHistoryChange: (e: CustomEvent<ChatHistoryRowChangeDetail>) => void;
}

export const LLMTestCases: FunctionalComponent<LLMTestCasesProps> = ({
  testCases,
  dynamicResolutionSupported = false,
  extractorIds = [],
  onRun,
  onDelete,
  onAddTestCase,
  touchedPrimaryFieldIds,
  onPrimaryFieldTouch,
  handleTestCaseChange,
  onExpectedOutcomeChange,
  onChatHistoryChange,
}) => {
  return (
    <div class="test-cases">
      {testCases.map(testCase => (
        <LLMTestCaseRow
          testCase={testCase}
          dynamicResolutionSupported={dynamicResolutionSupported}
          extractorIds={extractorIds}
          onRun={onRun}
          onDelete={onDelete}
          isPrimaryFieldTouched={touchedPrimaryFieldIds.has(testCase.id)}
          onPrimaryFieldTouch={() => onPrimaryFieldTouch(testCase.id)}
          handleTestCaseChange={handleTestCaseChange}
          onExpectedOutcomeChange={onExpectedOutcomeChange}
          onChatHistoryChange={onChatHistoryChange}
        />
      ))}
      <button type="button" class="test-cases__add-card" onClick={onAddTestCase}>
        <span class="test-cases__add-card-icon">
          <PlusIcon />
        </span>
        <span class="test-cases__add-card-label">Add question</span>
      </button>
    </div>
  );
};
