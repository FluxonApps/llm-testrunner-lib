import { h, FunctionalComponent } from '@stencil/core';
import { TestCase } from '../../../types/llm-test-runner';
import { ResponseOutput } from './output/response-output';
import { EvaluationSummary } from './evaluation/evaluation-summary';
import { Button } from '../../../lib/ui/button/index';
import { IconButton } from '../../../lib/ui/icon-button/index';
import { PlayIcon, SpinnerIcon, TrashIcon } from '../../../lib/ui/icons/icons';
import { FormFieldType, TextAreaConfig } from '../../../lib/form/schema';
import {
  ExpectedOutcomeChangeDetail,
  ExpectedOutcomeRenderer,
} from './expected-outcome-renderer';
import type { ChatHistoryChangeDetail } from './chat-history';

export type ChatHistoryRowChangeDetail = {
  testCaseId: string;
} & ChatHistoryChangeDetail;

export interface LLMTestCaseRowProps {
  testCase: TestCase;
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

type StatusKind = 'not-run' | 'running' | 'passed' | 'failed';

const STATUS_LABEL: Record<StatusKind, string> = {
  'not-run': 'Not run',
  running: 'Running',
  passed: 'Passed',
  failed: 'Failed',
};

function getStatus(testCase: TestCase): StatusKind {
  if (testCase.isRunning) return 'running';
  if (!testCase.evaluationResult) return 'not-run';
  return testCase.evaluationResult.passed ? 'passed' : 'failed';
}

export const LLMTestCaseRow: FunctionalComponent<LLMTestCaseRowProps> = ({
  testCase,
  dynamicResolutionSupported = false,
  extractorIds = [],
  onRun,
  onDelete,
  handleTestCaseChange,
  onExpectedOutcomeChange,
  onChatHistoryChange,
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

  const canRun = !!testCase.question.trim();
  const isRunning = testCase.isRunning;
  const status = getStatus(testCase);
  const questionPreview = testCase.question.trim() || 'New test — click to add a question.';
  // Show the Output + Evaluation row only when there's something to show:
  // a live run in progress, a stored model response, or a stored
  // evaluation result. Fresh test cases stay compact (just the editor).
  const hasResults =
    isRunning || !!testCase.output?.text || !!testCase.evaluationResult;

  // Buttons inside <summary> normally bubble to the disclosure's default
  // toggle action. Suppress so Run / Delete don't accidentally collapse
  // or expand the card when clicked.
  const stopToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <details class="test-case-row" key={testCase.id}>
      <summary class="test-case-row__summary">
        <span class="test-case-row__question-preview" title={testCase.question}>
          {questionPreview}
        </span>
        <div class="test-case-row__summary-actions">
          <span
            class={`test-case-row__status test-case-row__status--${status}`}
          >
            {STATUS_LABEL[status]}
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              stopToggle(e as MouseEvent);
              onRun(testCase);
            }}
            disabled={isRunning || !canRun}
            loading={isRunning}
            icon={isRunning ? <SpinnerIcon /> : <PlayIcon />}
            aria-label={canRun ? 'Run this test' : 'Enter a question first'}
          >
            {isRunning ? 'Running' : 'Run'}
          </Button>
          <IconButton
            variant="outline"
            onClick={(e) => {
              stopToggle(e as MouseEvent);
              onDelete(testCase.id);
            }}
            title="Delete this test"
          >
            <TrashIcon />
          </IconButton>
        </div>
      </summary>

      <div class="test-case-row__body">
        {/* Top row — the editor, full width. Always present when the
          * card is expanded. */}
        <section class="test-case-row__panel test-case-row__panel--input">
          <header class="test-case-row__panel-header">Input</header>
          <div class="test-case-row__input-content">
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
            <chat-history
              chatHistoryEnabled={testCase.chatHistory?.enabled ?? false}
              chatHistoryValue={testCase.chatHistory?.value ?? ''}
              onChatHistoryChange={(e: Event) => {
                const { enabled, value } = (e as CustomEvent<ChatHistoryChangeDetail>)
                  .detail;
                onChatHistoryChange({
                  detail: {
                    testCaseId: testCase.id,
                    enabled,
                    value,
                  },
                } as CustomEvent<ChatHistoryRowChangeDetail>);
              }}
            />
            <ExpectedOutcomeRenderer
              testCaseId={testCase.id}
              fields={testCase.expectedOutcome || []}
              dynamicResolutionSupported={dynamicResolutionSupported}
              extractorIds={extractorIds}
              onExpectedOutcomeChange={onExpectedOutcomeChange}
            />
          </div>
        </section>

        {/* Bottom row — Output + Evaluation. Only rendered when the test
          * is currently running, has a previous response, or has a stored
          * evaluation result. Fresh test cases stay compact. */}
        {hasResults && (
          <div class="test-case-row__results">
            <section class="test-case-row__panel">
              <header class="test-case-row__panel-header">Output</header>
              <div class="test-case-row__panel-content">
                <ResponseOutput
                  output={testCase.output}
                  isRunning={testCase.isRunning}
                />
              </div>
            </section>

            <section class="test-case-row__panel">
              <header class="test-case-row__panel-header">Evaluation</header>
              <div class="test-case-row__panel-content">
                <EvaluationSummary
                  result={testCase.evaluationResult}
                  isRunning={testCase.isRunning}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </details>
  );
};
