import { h, FunctionalComponent } from '@stencil/core';
import { TestCase } from '../../../types/llm-test-runner';
import { LLMTestCaseRow, ChatHistoryRowChangeDetail } from './llm-test-case-row';
import { Button } from '../../../lib/ui/button/index';
import { PlusIcon } from '../../../lib/ui/icons/icons';
import { ExpectedOutcomeChangeDetail } from './expected-outcome-renderer';

export interface LLMTestCasesProps {
  testCases: TestCase[];
  dynamicResolutionSupported?: boolean;
  extractorIds?: string[];
  onRun: (testCase: TestCase) => void;
  onDelete: (id: string) => void;
  onAddTestCase: () => void;
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
          handleTestCaseChange={handleTestCaseChange}
          onExpectedOutcomeChange={onExpectedOutcomeChange}
          onChatHistoryChange={onChatHistoryChange}
        />
      ))}

      <div class="test-cases__add-section">
        <Button
          variant="outline"
          size="md"
          onClick={onAddTestCase}
          icon={<PlusIcon />}
        >
          Add question
        </Button>
      </div>
    </div>
  );
};
