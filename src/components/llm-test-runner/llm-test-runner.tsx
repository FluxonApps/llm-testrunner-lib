import {
  Component,
  State,
  Prop,
  Watch,
  h,
  EventEmitter,
  Event,
  Method,
  Element,
} from '@stencil/core';
import { EvaluationResult } from '../../lib/evaluation/types';
import { ErrorMessage } from '../error-message/error-message';
import { RateLimitedFetcher } from '../../lib/rate-limited-fetcher/rate-limited-fetcher';
import {
  ExpectedOutcomeSchema,
  TestCase,
  LLMRequestPayload,
  SavePayload,
  ModelResponsePayload,
  EvaluationSourceExtractors,
  LlmJudge,
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
import { isTestCaseRunnable } from '../../lib/test-cases/test-case-validation';
import { EvaluationService } from '../../lib/evaluation/evaluation-service';
import { validateTestCaseInputArray } from '../../schemas/test-case';
import {
  getExtractorIds,
  validateExpectedOutcomeArrayWithExtractors,
  validateExpectedOutcomeSchema,
} from '../../schemas/expected-outcome';
import { LLMTestCases } from './test-cases/llm-test-cases';
import { TestCasesToolbar } from './test-cases/test-cases-toolbar';
import {
  computeSummaryStats,
  filterTestCasesByStatus,
  filterTestCasesByQuery,
  type StatusFilter,
} from './test-cases/test-case-filtering';
import { ExpectedOutcomeChangeDetail } from './test-cases/expected-outcome-renderer';
import type { ChatHistoryRowChangeDetail } from './test-cases/llm-test-case-row';

const HIGHLIGHT_VISIBLE_MS = 2000;
const ELEMENT_LOOKUP_MAX_FRAMES = 10;

function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

@Component({
  tag: 'llm-test-runner',
  styleUrls: [
    '../../styles/tokens.css',
    'llm-test-runner.css',
    'test-cases/llm-test-cases.css',
    'test-cases/test-cases-toolbar.css',
    'test-cases/llm-test-case-row.css',
    'test-cases/expected-outcome-renderer.css',
    'test-cases/actions/row-actions.css',
    'test-cases/evaluation/evaluation-result-banner.css',
    '../error-message/error-message.css',
    '../../lib/ui/button/button.css',
    '../../lib/ui/icon-button/icon-button.css',
    '../../lib/ui/tooltip/tooltip.css',
  ],
  shadow: true,
})
export class LLMTestRunner {
  @Event() llmRequest: EventEmitter<LLMRequestPayload>;
  @Event() save: EventEmitter<SavePayload>;
  @Element() el: HTMLElement;
  @Prop() delayMs?: number = 500;
  @Prop() stickyOffset?: number = 0;
  @Prop() useSave?: boolean = false;
  @Prop() usePromptEditor?: boolean = false;
  @Prop() resolveExpectedOutcome?: ExpectedOutcomeResolver;
  @Prop() evaluationSourceExtractors?: EvaluationSourceExtractors;
  @Prop() initialTestCases?: TestCase[];
  @Prop() defaultExpectedOutcomeSchema?: ExpectedOutcomeSchema;
  @Prop() llmJudge?: LlmJudge;
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
  @State() activeFilter: StatusFilter = 'all';
  @State() searchQuery: string = '';
  @State() isSearchExpanded: boolean = false;
  // Gates the mandatory-field error so it doesn't show on an untouched test case.
  @State() touchedPrimaryFieldIds: Set<string> = new Set();
  @State() isToolbarStuck: boolean = false;

  private evaluationService: EvaluationService;
  private isTrackingToolbarStuck = false;
  private toolbarStuckFrame?: number;
  private toolbarSentinelEl?: HTMLElement;

  private getResolvedExpectedOutcomeSchema(): ExpectedOutcomeSchema {
    if (this.defaultExpectedOutcomeSchema === undefined) {
      return DEFAULT_EXPECTED_OUTCOME_SCHEMA;
    }

    validateExpectedOutcomeSchema(this.defaultExpectedOutcomeSchema);
    return this.defaultExpectedOutcomeSchema;
  }

  @Watch('stickyOffset')
  stickyOffsetChanged(newVal: number) {
    this.el.style.setProperty('--llmtr-sticky-top', `${newVal}px`);
    this.updateToolbarStuck();
  }

  componentDidLoad() {
    this.el.style.setProperty('--llmtr-sticky-top', `${this.stickyOffset ?? 0}px`);
    this.startToolbarStuckTracking();
  }

  // Catches shifts that move the sentinel without scrolling, such as the
  // error message above the toolbar appearing.
  componentDidRender() {
    this.scheduleToolbarStuckUpdate();
  }

  // Covers reattach; componentDidLoad only fires once.
  connectedCallback() {
    this.startToolbarStuckTracking();
  }

  disconnectedCallback() {
    this.stopToolbarStuckTracking();
  }

  // Capture phase so scrolling in any ancestor container is caught too.
  private startToolbarStuckTracking() {
    if (typeof window === 'undefined' || this.isTrackingToolbarStuck) {
      return;
    }
    this.isTrackingToolbarStuck = true;
    window.addEventListener('scroll', this.scheduleToolbarStuckUpdate, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', this.scheduleToolbarStuckUpdate, {
      passive: true,
    });
    this.updateToolbarStuck();
  }

  private stopToolbarStuckTracking() {
    if (typeof window === 'undefined' || !this.isTrackingToolbarStuck) {
      return;
    }
    this.isTrackingToolbarStuck = false;
    window.removeEventListener('scroll', this.scheduleToolbarStuckUpdate, {
      capture: true,
    });
    window.removeEventListener('resize', this.scheduleToolbarStuckUpdate);
    if (this.toolbarStuckFrame !== undefined) {
      cancelAnimationFrame(this.toolbarStuckFrame);
      this.toolbarStuckFrame = undefined;
    }
  }

  private scheduleToolbarStuckUpdate = () => {
    if (
      typeof requestAnimationFrame === 'undefined' ||
      this.toolbarStuckFrame !== undefined
    ) {
      return;
    }
    this.toolbarStuckFrame = requestAnimationFrame(() => {
      this.toolbarStuckFrame = undefined;
      this.updateToolbarStuck();
    });
  };

  private updateToolbarStuck() {
    if (!this.toolbarSentinelEl) {
      return;
    }
    const scrollRoot = this.findScrollRoot();
    // clientTop: sticky insets start at the scrollport, inside the border.
    const rootTop = scrollRoot
      ? scrollRoot.getBoundingClientRect().top + scrollRoot.clientTop
      : 0;
    // The sentinel stays in normal flow, so it passing the sticky line is
    // what tells us the toolbar has pinned rather than sitting there itself.
    // Strict: at rest the two are equal, and any tolerance either flashes
    // transparent on pin or paints the toolbar stuck at the top of a panel.
    this.isToolbarStuck =
      this.toolbarSentinelEl.getBoundingClientRect().bottom <
      rootTop + (this.stickyOffset ?? 0);
  }

  // position: sticky pins to this, so the sticky line is measured from it.
  private findScrollRoot(): Element | null {
    let node = this.el.parentElement;
    while (node) {
      const { overflowY } = getComputedStyle(node);
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  componentWillLoad() {
    this.evaluationService = new EvaluationService();
    try {
      // Initialize testCases from prop if provided
      if (this.initialTestCases !== undefined) {
        validateTestCaseInputArray(this.initialTestCases);
        const extractorIds = getExtractorIds(this.evaluationSourceExtractors);
        if (extractorIds.length > 0) {
          this.initialTestCases.forEach(testCase => {
            validateExpectedOutcomeArrayWithExtractors(
              testCase.expectedOutcome,
              extractorIds,
            );
          });
        }
        this.testCases = this.initialTestCases.map((rawTestCase, index) => {
          try {
            return createTestCaseFromInput(rawTestCase);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            throw new Error(`Invalid initial test case at index ${index}: ${message}`, { cause: err });
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

  private markPrimaryFieldTouched = (testCaseId: string) => {
    if (this.touchedPrimaryFieldIds.has(testCaseId)) return;
    this.touchedPrimaryFieldIds = new Set(this.touchedPrimaryFieldIds).add(
      testCaseId,
    );
  };

  private addNewTestCase() {
    try {
      const schema = this.getResolvedExpectedOutcomeSchema();
      const newTestCase = createTestCase(schema);
      this.testCases = [...this.testCases, newTestCase];

      // Fire-and-forget: scroll runs after the next render completes.
      void this.scrollToAndHighlightTestCase(newTestCase.id);
    } catch (err) {
      this.error =
        err instanceof Error
          ? err.message
          : 'Invalid defaultExpectedOutcomeSchema provided.';
    }
  }

  private async scrollToAndHighlightTestCase(testCaseId: string): Promise<void> {
    const element = await this.waitForTestCaseElement(testCaseId);
    if (!element) return;

    (element as HTMLDetailsElement).open = true;
    await nextFrame();

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
    element.classList.add('test-case-row--highlight');

    window.setTimeout(() => {
      element.classList.remove('test-case-row--highlight');
    }, HIGHLIGHT_VISIBLE_MS);
  }

  private async waitForTestCaseElement(testCaseId: string): Promise<Element | null> {
    const selector = `.test-case-row[data-test-case-id="${CSS.escape(testCaseId)}"]`;
    for (let i = 0; i < ELEMENT_LOOKUP_MAX_FRAMES; i++) {
      const element = this.el.shadowRoot?.querySelector(selector);
      if (element) return element;
      await nextFrame();
    }
    return null;
  }

  private updateTestCase(id: string, updates: Partial<TestCase>) {
    this.testCases = this.testCases.map(tc =>
      tc.id === id ? { ...tc, ...updates } : tc,
    );
  }

  private requestLlmResponse(testCase: TestCase): Promise<ModelResponsePayload> {
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
    // Clear results from any previous run so the Output and Evaluation
    // columns show "Running..." / "Evaluating..." placeholders instead
    // of stale content from the prior run.
    this.updateTestCase(testCase.id, {
      isRunning: true,
      output: undefined,
      evaluationResult: undefined,
      error: null,
      responseTime: undefined,
    });
    const [llmSettled, resolutionSettled] = await Promise.allSettled([
      this.requestLlmResponse(testCase),
      resolveDynamicExpectedOutcomes(testCase, this.resolveExpectedOutcome),
    ]);

    const responseTime = Date.now() - startTime;

    if (llmSettled.status === 'rejected') {
      this.updateTestCase(testCase.id, {
        isRunning: false,
        output: undefined,
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
      this.evaluationSourceExtractors,
      this.llmJudge,
    );
  }

  private async runAllTests() {
    this.isRunningAll = true;
    const tasks = [];
    for (const testCase of this.testCases) {
      if (
        !testCase.isRunning &&
        isTestCaseRunnable(testCase)
      ) {
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
      const result = importTestSuite(
        content,
        getExtractorIds(this.evaluationSourceExtractors),
      );

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
    if (this.testCases.some(tc => !isTestCaseRunnable(tc))) {
      this.error = 'Fill in every question and expected output before exporting.';
      return;
    }

    this.error = '';
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
    const stats = computeSummaryStats(this.testCases);
    return (
      <div class="test-runner-container">
        <ErrorMessage message={this.error} onClear={() => (this.error = '')} />
        <div class="test-runner-container__content">
          <div
            class="test-cases-toolbar-sentinel"
            ref={el => (this.toolbarSentinelEl = el)}
          />
          <TestCasesToolbar
            isStuck={this.isToolbarStuck}
            totalCount={this.testCases.length}
            notTestedCount={stats.notRun}
            failedCount={stats.failed}
            passedCount={stats.passed}
            activeFilter={this.activeFilter}
            isExportingTestSuite={this.isExportingTestSuite}
            isExportingTestResults={this.isExportingTestResults}
            isRunningAll={this.isRunningAll}
            canRunAny={this.testCases.some(tc =>
              isTestCaseRunnable(tc),
            )}
            useSave={this.useSave}
            isSaving={this.isSaving}
            usePromptEditor={this.usePromptEditor}
            searchQuery={this.searchQuery}
            isSearchExpanded={this.isSearchExpanded}
            onAddTestCase={() => this.addNewTestCase()}
            onImport={file => this.handleImport(file)}
            onExportSuite={() => this.handleExportTestSuite()}
            onExportResults={() => this.handleExportTestResults()}
            onRunAll={() => this.runAllTests()}
            onSave={() => this.handleSave()}
            onFilterChange={filter => (this.activeFilter = filter)}
            onSearchQueryChange={query => (this.searchQuery = query)}
            onSearchExpandedChange={expanded => (this.isSearchExpanded = expanded)}
          />
          <LLMTestCases
            testCases={filterTestCasesByQuery(
              filterTestCasesByStatus(this.testCases, this.activeFilter),
              this.searchQuery,
            )}
            dynamicResolutionSupported={!!this.resolveExpectedOutcome}
            extractorIds={getExtractorIds(this.evaluationSourceExtractors)}
            onRun={testCase => this.runSingleTest(testCase).catch(() => {})}
            onDelete={id => this.deleteTestCase(id)}
            onAddTestCase={() => this.addNewTestCase()}
            touchedPrimaryFieldIds={this.touchedPrimaryFieldIds}
            onPrimaryFieldTouch={this.markPrimaryFieldTouched}
            handleTestCaseChange={this.handleTestCaseChange}
            onExpectedOutcomeChange={this.handleExpectedOutcomeChange}
            onChatHistoryChange={this.handleChatHistoryChange}
          />
        </div>
      </div>
    );
  }
}
