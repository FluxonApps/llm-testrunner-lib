import { h, FunctionalComponent } from '@stencil/core';
import { TestCase } from '../../../types/llm-test-runner';
import { ResponseOutput } from './output/response-output';
import { EvaluationSummary } from './evaluation/evaluation-summary';
import { Button } from '../../../lib/ui/button/index';
import { IconButton } from '../../../lib/ui/icon-button/index';
import { Tooltip } from '../../../lib/ui/tooltip';
import {
  InfoIcon,
  PlayIcon,
  SpinnerIcon,
  TrashIcon,
  XIcon,
} from '../../../lib/ui/icons/icons';
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

type StatusKind = 'not-run' | 'running' | 'passed' | 'failed' | 'partial';

interface TestStatus {
  kind: StatusKind;
  label: string;
}

const STATUS_LABEL: Record<StatusKind, string> = {
  'not-run': 'Not run',
  running: 'Running',
  passed: 'Passed',
  failed: 'Failed',
  partial: 'Partial',
};

interface FieldResultCounts {
  passed: number;
  total: number;
}

/** Count how many field results pass cleanly (passed and no error). */
function countFieldResults(
  fieldResults: ReadonlyArray<{ passed: boolean; error?: unknown }>,
): FieldResultCounts {
  const passed = fieldResults.filter(field => field.passed && !field.error).length;
  return { passed, total: fieldResults.length };
}

export function computeTestStatus(testCase: TestCase): TestStatus {
  if (testCase.isRunning) return { kind: 'running', label: STATUS_LABEL.running };
  if (!testCase.evaluationResult) return { kind: 'not-run', label: STATUS_LABEL['not-run'] };

  const fieldResults = testCase.evaluationResult.fieldResults;
  if (fieldResults && fieldResults.length > 1) {
    const { passed, total } = countFieldResults(fieldResults);

    if (passed > 0 && passed < total) {
      const noun = total === 1 ? 'test' : 'tests';
      return { kind: 'partial', label: `${passed} of ${total} ${noun} passed` };
    }

    const kind: StatusKind = passed === total ? 'passed' : 'failed';
    return { kind, label: STATUS_LABEL[kind] };
  }

  const kind: StatusKind = testCase.evaluationResult.passed ? 'passed' : 'failed';
  return { kind, label: STATUS_LABEL[kind] };
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
  const canRun = !!testCase.question.trim();
  const isRunning = testCase.isRunning;
  const status = computeTestStatus(testCase);
  const questionPreview = testCase.question.trim() || 'New test — click to add a question.';
  const hasResults =
    isRunning || !!testCase.output?.text || !!testCase.evaluationResult;

  const stopToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <details class="test-case-row" key={testCase.id} data-test-case-id={testCase.id}>
      <summary class="test-case-row__summary">
        <span class="test-case-row__question-preview" title={testCase.question}>
          {questionPreview}
        </span>
        <div class="test-case-row__summary-actions">
          <span
            class={`test-case-row__status test-case-row__status--${status.kind}`}
          >
            {status.label}
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
        <section class="test-case-row__panel test-case-row__panel--input">
          <div class="test-case-row__input-content">
            <div class="test-case-row__question">
              <span class="test-case-row__question-label">
                Add your question (prompt)
                <Tooltip
                  content="The prompt sent to the model for this test case."
                  class="test-case-row__question-info"
                >
                  <InfoIcon />
                </Tooltip>
              </span>
              <div class="test-case-row__question-row">
                <div class="test-case-row__question-input-wrap">
                  <input
                    type="text"
                    class="test-case-row__question-input"
                    placeholder="Enter your question here..."
                    value={testCase.question}
                    onInput={(e) =>
                      handleTestCaseChange({
                        detail: {
                          testCaseId: testCase.id,
                          key: 'question',
                          value: (e.target as HTMLInputElement).value,
                        },
                      } as CustomEvent<{ testCaseId: string; key: string; value: string }>)
                    }
                  />
                  {!!testCase.question && (
                    <button
                      type="button"
                      class="test-case-row__question-clear"
                      aria-label="Clear question"
                      onClick={() =>
                        handleTestCaseChange({
                          detail: {
                            testCaseId: testCase.id,
                            key: 'question',
                            value: '',
                          },
                        } as CustomEvent<{ testCaseId: string; key: string; value: string }>)
                      }
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
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
              </div>
            </div>
            <ExpectedOutcomeRenderer
              testCaseId={testCase.id}
              fields={testCase.expectedOutcome || []}
              dynamicResolutionSupported={dynamicResolutionSupported}
              extractorIds={extractorIds}
              onExpectedOutcomeChange={onExpectedOutcomeChange}
            />
          </div>
        </section>
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
