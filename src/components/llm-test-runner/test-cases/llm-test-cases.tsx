import { h, FunctionalComponent } from '@stencil/core';
import { TestCase } from '../../../types/llm-test-runner';
import { LLMTestCaseRow, ChatHistoryRowChangeDetail } from './llm-test-case-row';
import { ExpectedOutcomeChangeDetail } from './expected-outcome-renderer';

export interface LLMTestCasesProps {
  testCases: TestCase[];
  dynamicResolutionSupported?: boolean;
  extractorIds?: string[];
  onRun: (testCase: TestCase) => void;
  onDelete: (id: string) => void;
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
    </div>
  );
};
