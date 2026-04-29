import {
  jest,
  describe,
  beforeEach,
  it,
  expect,
} from '@jest/globals';

// Mock EvaluationService so the runner doesn't try to actually evaluate.
jest.mock('../../../lib/evaluation/evaluation-service', () => ({
  EvaluationService: jest.fn().mockImplementation(() => ({
    evaluateTestCase: jest.fn(),
  })),
}));

// Mock RateLimitedFetcher so Run All executes tasks immediately.
const mockRunAll = jest.fn();
jest.mock('../../../lib/rate-limited-fetcher/rate-limited-fetcher', () => ({
  RateLimitedFetcher: jest.fn().mockImplementation(() => ({
    runAll: mockRunAll,
  })),
}));

import { newSpecPage } from '@stencil/core/testing';
import { LLMTestRunner } from '../llm-test-runner';
import { ThresholdInput } from '../../../lib/ui/threshold-input/threshold-input';
import { EvaluationApproach } from '../../../lib/evaluation/constants';
import type { TestCase } from '../../../types/llm-test-runner';

type SpecPage = Awaited<ReturnType<typeof newSpecPage>>;

function makeTestCase(
  id: string,
  threshold: number,
  question = 'What is Stencil?',
): TestCase {
  return {
    id,
    question,
    expectedOutcome: [
      {
        type: 'textarea',
        label: 'Expected Outcome',
        value: 'compiler',
        evaluationParameters: {
          approach: EvaluationApproach.ROUGE_1,
          threshold,
        },
      },
    ],
    chatHistory: { enabled: false, value: '' },
    isRunning: false,
  };
}

function getThresholdInputs(page: SpecPage): HTMLElement[] {
  return Array.from(
    page.root!.shadowRoot!.querySelectorAll('threshold-input'),
  ) as HTMLElement[];
}

function isInError(host: HTMLElement): boolean {
  return !!host.shadowRoot!.querySelector(
    '.threshold-input__input--invalid',
  );
}

function isInWarning(host: HTMLElement): boolean {
  return !!host.shadowRoot!.querySelector(
    '.threshold-input__input--warning',
  );
}

describe('LLMTestRunner — threshold resolution on Run / Run All', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunAll.mockImplementation(async (tasks: (() => Promise<void>)[]) => {
      await Promise.all(tasks.map(t => t()));
    });
  });

  it('per-row Run flips an invalid threshold from error → warning before running', async () => {
    const page = await newSpecPage({
      components: [LLMTestRunner, ThresholdInput],
      html: '<llm-test-runner></llm-test-runner>',
    });

    page.rootInstance.testCases = [makeTestCase('1', 1.5)];
    await page.waitForChanges();

    // Open the More-options details so the threshold-input is rendered.
    const summary = page.root!.shadowRoot!.querySelector(
      '.expected-outcome-renderer__options summary',
    ) as HTMLElement;
    summary.click();
    await page.waitForChanges();

    const inputs = getThresholdInputs(page);
    expect(inputs).toHaveLength(1);
    expect(isInError(inputs[0])).toBe(true);

    const llmRequestSpy = jest.fn();
    page.root!.addEventListener('llmRequest', llmRequestSpy);

    // Fire-and-forget: awaiting the wrapper would block on the LLM request
    // consumer, which never resolves in this test. We only need the
    // threshold-resolution + llmRequest-emit phase to complete.
    const runButton = page.root!.shadowRoot!.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;
    runButton.click();
    // Flush several render cycles. resolveAndRunSingleTest awaits
    // resolveInvalidThresholds (which itself awaits Promise.all over the
    // child resolveInvalid() methods) before the state update lands.
    // A single waitForChanges may settle before the chain completes.
    await page.waitForChanges();
    await page.waitForChanges();
    await page.waitForChanges();

    // After resolution: error gone, warning shown.
    const afterInputs = getThresholdInputs(page);
    expect(isInError(afterInputs[0])).toBe(false);
    expect(isInWarning(afterInputs[0])).toBe(true);

    // The run still proceeded (llmRequest was emitted).
    expect(llmRequestSpy).toHaveBeenCalledTimes(1);

    // resolveInvalid mutates testCases immutably, so the post-resolve
    // snapshot lives at this index — re-fetch from state rather than
    // trusting any earlier reference.
    const tcAfter = page.rootInstance.testCases[0];
    const params = tcAfter.expectedOutcome[0].evaluationParameters!;
    expect(params.approach).toBe(EvaluationApproach.ROUGE_1);
    expect(params.threshold).toBeUndefined();
  });

  it('does not touch a valid threshold on Run', async () => {
    const page = await newSpecPage({
      components: [LLMTestRunner, ThresholdInput],
      html: '<llm-test-runner></llm-test-runner>',
    });

    page.rootInstance.testCases = [makeTestCase('1', 0.6)];
    await page.waitForChanges();

    const summary = page.root!.shadowRoot!.querySelector(
      '.expected-outcome-renderer__options summary',
    ) as HTMLElement;
    summary.click();
    await page.waitForChanges();

    const inputs = getThresholdInputs(page);
    expect(isInError(inputs[0])).toBe(false);
    expect(isInWarning(inputs[0])).toBe(false);

    const runButton = page.root!.shadowRoot!.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;
    runButton.click();
    await page.waitForChanges();

    // Still neither error nor warning — the resolve was a no-op.
    const afterInputs = getThresholdInputs(page);
    expect(isInError(afterInputs[0])).toBe(false);
    expect(isInWarning(afterInputs[0])).toBe(false);

    // Threshold preserved.
    expect(
      page.rootInstance.testCases[0].expectedOutcome[0].evaluationParameters!
        .threshold,
    ).toBe(0.6);
  });

  it('Run All resolves invalid thresholds across all rows in one pass', async () => {
    const page = await newSpecPage({
      components: [LLMTestRunner, ThresholdInput],
      html: '<llm-test-runner></llm-test-runner>',
    });

    page.rootInstance.testCases = [
      makeTestCase('1', 1.5, 'Q1'),
      makeTestCase('2', -0.3, 'Q2'),
    ];
    await page.waitForChanges();

    // Open both rows' More-options sections so both threshold-inputs render.
    const summaries = page.root!.shadowRoot!.querySelectorAll(
      '.expected-outcome-renderer__options summary',
    );
    summaries.forEach(s => (s as HTMLElement).click());
    await page.waitForChanges();

    const beforeInputs = getThresholdInputs(page);
    expect(beforeInputs).toHaveLength(2);
    expect(beforeInputs.every(isInError)).toBe(true);

    const llmRequestSpy = jest.fn();
    page.root!.addEventListener('llmRequest', llmRequestSpy);

    const runAll = page.root!.shadowRoot!.querySelector(
      'button[aria-label="Run All"]',
    ) as HTMLButtonElement;
    runAll.click();
    await page.waitForChanges();

    // Both rows flipped from error → warning by the bulk resolution.
    const afterInputs = getThresholdInputs(page);
    expect(afterInputs.every(isInWarning)).toBe(true);
    expect(afterInputs.some(isInError)).toBe(false);

    // Both runs proceeded.
    expect(llmRequestSpy).toHaveBeenCalledTimes(2);

    // Both test cases now have threshold cleared.
    for (const tc of page.rootInstance.testCases) {
      expect(
        tc.expectedOutcome[0].evaluationParameters!.threshold,
      ).toBeUndefined();
    }
  });
});
