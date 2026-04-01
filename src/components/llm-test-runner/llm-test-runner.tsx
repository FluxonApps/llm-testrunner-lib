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
  type ResolveExpectedOutcomeFn,
  resolveDynamicExpectedOutcomesForRun,
} from '../../lib/test-cases/dynamic-expected-outcome-resolver';
import * as TestCaseMutations from '../../lib/test-cases/test-case-mutations';
import { EvaluationService } from '../../lib/evaluation/evaluation-service';
import { validateTestCaseInputArray } from '../../schemas/test-case';
import { validateExpectedOutcomeSchema } from '../../schemas/expected-outcome';
import { LLMTestRunnerHeader } from './header/llm-test-runner-header';
import { LLMTestCases } from './test-cases/llm-test-cases';
import { ExpectedOutcomeChangeDetail } from './test-cases/expected-outcome-renderer';

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
  @Prop() resolveExpectedOutcome?: ResolveExpectedOutcomeFn;
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

  private buildBaseRunTestCase(
    testCase: TestCase,
    aiResponse: string,
    startTime: number,
  ): { baseTestCase: TestCase; responseTime: number } {
    const responseTime = Date.now() - startTime;
    return {
      baseTestCase: {
        ...testCase,
        output: aiResponse,
        responseTime,
      },
      responseTime,
    };
  }

  private async runSingleTest(testCase: TestCase): Promise<void> {
    const startTime = Date.now();
    this.updateTestCase(testCase.id, { isRunning: true });
    return new Promise<void>((resolve, reject) => {
      this.llmRequest.emit({
        prompt: testCase.question,
        resolve: async (aiResponse: string) => {
          const { baseTestCase, responseTime } = this.buildBaseRunTestCase(
            testCase,
            aiResponse,
            startTime,
          );
          try {
            const resolvedTestCase = await resolveDynamicExpectedOutcomesForRun(
              baseTestCase,
              this.resolveExpectedOutcome,
            );

            this.updateTestCase(testCase.id, {
              isRunning: false,
              output: aiResponse,
              error: null,
              responseTime,
              expectedOutcome: resolvedTestCase.expectedOutcome,
            });

            await this.evaluateResponse(resolvedTestCase);
            resolve();
          } catch (error) {
            this.updateTestCase(testCase.id, {
              isRunning: false,
              output: aiResponse,
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to resolve dynamic expected outcome.',
              responseTime,
            });
            reject(error);
            return;
          }
        },
        reject: (error: Error | unknown) => {
          this.updateTestCase(testCase.id, {
            isRunning: false,
            output: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          reject(error);
        },
      });
    });
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
          />
        </div>
      </div>
    );
  }
}
