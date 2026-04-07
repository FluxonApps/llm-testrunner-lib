import {
  Component,
  State,
  Prop,
  h,
  EventEmitter,
  Event,
  Method,
} from '@stencil/core';
import { EvaluationResult } from '../../lib/evaluation/types';
import { ErrorMessage } from '../error-message/error-message';
import { RateLimitedFetcher } from '../../lib/rate-limited-fetcher/rate-limited-fetcher';
import {
  ExpectedOutcomeSchema,
  TestCase,
  LLMRequestPayload,
  SavePayload,
} from '../../types/llm-test-runner';
import { readFileAsync } from '../../lib/file/file-reader';
import { downloadFile } from '../../lib/file/file-download';
import { formatTestSuiteAsJson } from '../../lib/import-export/test-suite-exporter';
import { exportTestResultsToCsv } from '../../lib/import-export/test-results-csv';
import { importTestSuite } from '../../lib/import-export/test-suite-importer';
import {
  createTestCase,
  createTestCaseFromInput,
  DEFAULT_EXPECTED_OUTCOME_SCHEMA,
} from '../../lib/test-cases/test-case-factory';
import {
  type ExpectedOutcomeResolver,
  resolveDynamicExpectedOutcomes,
} from '../../lib/test-cases/dynamic-expected-outcome-resolver';
import * as TestCaseMutations from '../../lib/test-cases/test-case-mutations';
import { EvaluationService } from '../../lib/evaluation/evaluation-service';
import { validateTestCaseInputArray } from '../../schemas/test-case';
import { validateExpectedOutcomeSchema } from '../../schemas/expected-outcome';
import { LLMTestRunnerHeader } from './header/llm-test-runner-header';
import { LLMTestCases } from './test-cases/llm-test-cases';
import { ExpectedOutcomeChangeDetail } from './test-cases/expected-outcome-renderer';
import type { ChatHistoryRowChangeDetail } from './test-cases/llm-test-case-row';

@Component({
  tag: 'llm-test-runner',
  styleUrls: [
    '../../styles/tokens.css',
    'llm-test-runner.css',
    'header/llm-test-runner-header.css',
    'test-cases/llm-test-cases.css',
    'test-cases/llm-test-case-row.css',
    'test-cases/actions/row-actions.css',
    'test-cases/evaluation/evaluation-summary.css',
    'test-cases/output/response-output.css',
    '../error-message/error-message.css',
    '../../lib/ui/button/button.css',
    '../../lib/ui/icon-button/icon-button.css',
  ],
  shadow: true,
})
export class LLMTestRunner {
  @Event() llmRequest: EventEmitter<LLMRequestPayload>;
  @Event() save: EventEmitter<SavePayload>;
  @Prop() delayMs?: number = 500;
  @Prop() useSave?: boolean = false;
  @Prop() usePromptEditor?: boolean = false;
  @Prop() resolveExpectedOutcome?: ExpectedOutcomeResolver;
  @Prop() initialTestCases?: TestCase[];
  @Prop() defaultExpectedOutcomeSchema?: ExpectedOutcomeSchema;
  @State() testCases: TestCase[] = [
    {
      id: '1',
      question: '',
      expectedOutcome: [
        {
          type: 'textarea',
          label: 'Expected Outcome',
          value: '',
        },
      ],
      chatHistory: { enabled: false, value: '' },
      isRunning: false,
    },
  ];
  @State() isRunningAll: boolean = false;
  @State() error: string = '';
  @State() isExportingTestSuite: boolean = false;
  @State() isExportingTestResults: boolean = false;
  @State() isSaving: boolean = false;

  private evaluationService: EvaluationService;

  private getResolvedExpectedOutcomeSchema(): ExpectedOutcomeSchema {
    if (this.defaultExpectedOutcomeSchema === undefined) {
      return DEFAULT_EXPECTED_OUTCOME_SCHEMA;
    }

    validateExpectedOutcomeSchema(this.defaultExpectedOutcomeSchema);
    return this.defaultExpectedOutcomeSchema;
  }

  componentWillLoad() {
    this.evaluationService = new EvaluationService();
    try {
      // Initialize testCases from prop if provided
      if (this.initialTestCases !== undefined) {
        validateTestCaseInputArray(this.initialTestCases);
        this.testCases = this.initialTestCases.map((rawTestCase, index) => {
          try {
            return createTestCaseFromInput(rawTestCase);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            throw new Error(`Invalid initial test case at index ${index}: ${message}`);
          }
        });
      } else {
        const schema = this.getResolvedExpectedOutcomeSchema();
        this.testCases = [createTestCase(schema)];
      }
    } catch (err) {
      this.error =
        err instanceof Error
          ? err.message
          : 'Invalid defaultExpectedOutcomeSchema provided.';
      this.testCases = [];
    }
  }

  componentDidLoad() {}

  disconnectedCallback() {}

  @Method()
  async resetSavingState(): Promise<void> {
    this.isSaving = false;
  }

  @Method()
  async getTestCases(): Promise<TestCase[]> {
    return this.testCases;
  }

  private handleTestCaseChange = (
    event: CustomEvent<{ testCaseId: string; key: string; value: string }>,
  ) => {
    const { testCaseId, key, value } = event.detail;
    this.testCases = this.testCases.map(tc =>
      tc.id === testCaseId ? { ...tc, [key]: value } : tc,
    );
  };

  private handleChatHistoryChange = (
    event: CustomEvent<ChatHistoryRowChangeDetail>,
  ) => {
    const { testCaseId, enabled, value } = event.detail;
    this.updateTestCase(testCaseId, {
      chatHistory: { enabled, value },
    });
  };

  private addNewTestCase() {
    try {
      const schema = this.getResolvedExpectedOutcomeSchema();
      const newTestCase = createTestCase(schema);
      this.testCases = [...this.testCases, newTestCase];
    } catch (err) {
      this.error =
        err instanceof Error
          ? err.message
          : 'Invalid defaultExpectedOutcomeSchema provided.';
    }
  }

  private updateTestCase(id: string, updates: Partial<TestCase>) {
    this.testCases = this.testCases.map(tc =>
      tc.id === id ? { ...tc, ...updates } : tc,
    );
  }

  private requestLlmText(testCase: TestCase): Promise<string> {
    return new Promise((resolve, reject) => {
      const payload: LLMRequestPayload = {
        prompt: testCase.question,
        resolve,
        reject,
      };
      if (testCase.chatHistory?.enabled) {
        payload.chatHistory = testCase.chatHistory.value;
      }
      this.llmRequest.emit(payload);
    });
  }

  private throwError(reason: unknown): never {
    throw reason instanceof Error ? reason : new Error(String(reason));
  }

  private addErrorMessage(reason: unknown, fallback: string): string {
    return reason instanceof Error ? reason.message : fallback;
  }

  private async runSingleTest(testCase: TestCase): Promise<void> {
    const startTime = Date.now();
    this.updateTestCase(testCase.id, { isRunning: true });
    const [llmSettled, resolutionSettled] = await Promise.allSettled([
      this.requestLlmText(testCase),
      resolveDynamicExpectedOutcomes(testCase, this.resolveExpectedOutcome),
    ]);

    const responseTime = Date.now() - startTime;

    if (llmSettled.status === 'rejected') {
      this.updateTestCase(testCase.id, {
        isRunning: false,
        output: null,
        error: this.addErrorMessage(llmSettled.reason, 'Unknown error'),
        responseTime,
      });
      this.throwError(llmSettled.reason);
    }
    const aiResponse = llmSettled.value;

    if (resolutionSettled.status === 'rejected') {
      this.updateTestCase(testCase.id, {
        isRunning: false,
        output: aiResponse,
        error: this.addErrorMessage(
          resolutionSettled.reason,
          'Failed to resolve dynamic expected outcome.',
        ),
        responseTime,
      });
      this.throwError(resolutionSettled.reason);
    }
    const resolvedTestCase = resolutionSettled.value;

    const forEvaluationTestCase: TestCase = {
      ...resolvedTestCase,
      output: aiResponse,
      responseTime,
    };

    this.updateTestCase(testCase.id, {
      isRunning: false,
      output: aiResponse,
      error: null,
      responseTime,
      expectedOutcome: forEvaluationTestCase.expectedOutcome,
    });

    await this.evaluateResponse(forEvaluationTestCase);
  }

  private deleteTestCase(id: string) {
    this.testCases = this.testCases.filter(tc => tc.id !== id);
  }

  private handleExpectedOutcomeChange = (
    event: CustomEvent<ExpectedOutcomeChangeDetail>,
  ) => {
    const { testCaseId, ...change } = event.detail;

    this.testCases = this.testCases.map(tc => {
      if (tc.id !== testCaseId) {
        return tc;
      }

      return TestCaseMutations.applyExpectedOutcomeChange(tc, change);
    });
  };

  private async evaluateResponse(testCase: TestCase): Promise<void> {
    await this.evaluationService.evaluateTestCase(
      testCase,
      (result: EvaluationResult) => {
        this.updateTestCase(testCase.id, {
          evaluationResult: result,
        });
      },
    );
  }

  private async runAllTests() {
    this.isRunningAll = true;
    const tasks = [];
    for (const testCase of this.testCases) {
      if (!testCase.isRunning && testCase.question.trim()) {
        tasks.push(() =>
          this.runSingleTest(testCase).catch(err => {
            console.error(`⚠️ Test case ${testCase.id} failed`, err);
          }),
        );
      }
    }
    try {
      const fetcher = new RateLimitedFetcher(this.delayMs);
      await fetcher.runAll(tasks);
    } catch (err) {
      console.error('⚠️ Error running all tests:', err);
    }
    this.isRunningAll = false;
  }

  private async handleImport(file: File): Promise<void> {
    const isJsonType = file.type === 'application/json';
    const isJsonExtension = file.name.toLowerCase().endsWith('.json');

    if (!isJsonType && !isJsonExtension) {
      this.error = 'Invalid file type. Please select a JSON file.';
      return;
    }

    this.error = '';

    try {
      const content = await readFileAsync(file);
      const result = importTestSuite(content);

      if (!result.success) {
        this.error = result.error || 'Unknown error occurred during import.';
        return;
      }

      this.testCases = result.testCases || [];
    } catch (err) {
      this.error =
        err instanceof Error
          ? err.message
          : 'Error processing file. Please ensure it is a valid JSON array.';
      console.error('File Processing Error:', err);
    }
  }

  private async handleExportTestSuite() {
    this.isExportingTestSuite = true;
    try {
      const jsonContent = formatTestSuiteAsJson(this.testCases);

      // Added a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));

      downloadFile(jsonContent, 'test-suite.json', 'application/json');
    } finally {
      this.isExportingTestSuite = false;
    }
  }

  private async handleExportTestResults() {
    this.isExportingTestResults = true;
    try {
      const csvContent = exportTestResultsToCsv(this.testCases);

      // Added a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));

      downloadFile(csvContent, 'test-results.csv', 'text/csv');
    } finally {
      this.isExportingTestResults = false;
    }
  }

  private async handleSave() {
    this.isSaving = true;
    try {
      const testRun = {
        timestamp: new Date().toISOString(),
        testCases: this.testCases,
      };
      this.save.emit(testRun);

      // Failsafe: Auto-reset saving state after 10 seconds to prevent stuck UI
      setTimeout(() => {
        if (this.isSaving) {
          console.warn('Save operation timed out, resetting state');
          this.isSaving = false;
        }
      }, 10000);
    } finally {
      // Parent will call resetSavingState() when actual save completes
      // If not called within 10 seconds, failsafe above will reset state
    }
  }

  render() {
    return (
      <div class="test-runner-container">
        <LLMTestRunnerHeader
          isExportingTestSuite={this.isExportingTestSuite}
          isExportingTestResults={this.isExportingTestResults}
          isRunningAll={this.isRunningAll}
          useSave={this.useSave}
          isSaving={this.isSaving}
          usePromptEditor={this.usePromptEditor}
          onImport={file => this.handleImport(file)}
          onExportSuite={() => this.handleExportTestSuite()}
          onExportResults={() => this.handleExportTestResults()}
          onRunAll={() => this.runAllTests()}
          onSave={() => this.handleSave()}
        />
        <ErrorMessage message={this.error} onClear={() => (this.error = '')} />
        <div class="test-runner-container__content">
          <LLMTestCases
            testCases={this.testCases}
            dynamicResolutionSupported={!!this.resolveExpectedOutcome}
            onRun={testCase => this.runSingleTest(testCase).catch(() => {})}
            onDelete={id => this.deleteTestCase(id)}
            onAddTestCase={() => this.addNewTestCase()}
            handleTestCaseChange={this.handleTestCaseChange}
            onExpectedOutcomeChange={this.handleExpectedOutcomeChange}
            onChatHistoryChange={this.handleChatHistoryChange}
          />
        </div>
      </div>
    );
  }
}
