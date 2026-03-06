import {
  jest,
  describe,
  beforeEach,
  it,
  expect,
  afterEach,
} from '@jest/globals';

// 1. Mock Evaluation Service (Existing)
jest.mock('../../../lib/evaluation/evaluation-service', () => ({
  EvaluationService: jest.fn().mockImplementation(() => ({
    evaluateTestCase: jest.fn(),
  })),
}));

// 2. Mock RateLimitedFetcher (New)
// We need this to control the batch execution of tests
const mockRunAll = jest.fn();
jest.mock('../../../lib/rate-limited-fetcher/rate-limited-fetcher', () => ({ 
  RateLimitedFetcher: jest.fn().mockImplementation(() => ({
    runAll: mockRunAll,
  })),
}));

import { newSpecPage } from '@stencil/core/testing';
import { LLMTestRunner } from '../llm-test-runner';
import { EvaluationApproach } from '../../../lib/evaluation/constants';
import { TestCase, LLMRequestPayload } from '../../../types/llm-test-runner';
import { EvaluationService } from '../../../lib/evaluation/evaluation-service';
import { RateLimitedFetcher } from '../../../lib/rate-limited-fetcher/rate-limited-fetcher';

describe('LLMTestRunner - Run All', () => {
  let page: Awaited<ReturnType<typeof newSpecPage>>;
  let mockEvaluateTestCase: jest.Mock;

  // Setup two sample test cases
  const testCase1: TestCase = {
    id: '1',
    question: 'What is Stencil?',
    expectedOutcome: [
      {
        type: 'textarea',
        label: 'Expected Outcome',
        value: 'Compiler',
      },
      {
        type: 'chips-input',
        label: 'Keywords',
        value: ['compiler', 'jsx'],
      },
      {
        type: 'select',
        label: 'Tool calls',
        options: ['getWeather', 'getAnalytics', 'getValidEntities'],
        value: 'getValidEntities',
      },
    ],
    evaluationParameters: { approach: EvaluationApproach.EXACT },
    isRunning: false,
  };

  const testCase2: TestCase = {
    id: '2',
    question: 'What is JSX?',
    expectedOutcome: [
      {
        type: 'textarea',
        label: 'Expected Outcome',
        value: 'Syntax',
      },
      {
        type: 'chips-input',
        label: 'Keywords',
        value: ['syntax', 'xml-like'],
      },
      {
        type: 'select',
        label: 'Tool calls',
        options: ['getWeather', 'getAnalytics', 'getValidEntities'],
        value: 'getAnalytics',
      },
    ],
    evaluationParameters: { approach: EvaluationApproach.EXACT },
    isRunning: false,
  };

  // A generic helper to get payload from an event spy
  function getPayloadFromEvent(
    spy: jest.Mock,
    callIndex: number, // index of the call to get the payload from
  ): CustomEvent<LLMRequestPayload> {
    const firstCallArgs = spy.mock.calls[callIndex]; // arguments passed to callIndex invocation
    const firstArg = firstCallArgs[0]; // the CustomEvent is the first (and only) arg
    return firstArg as CustomEvent<LLMRequestPayload>;

  }

  beforeEach(async () => {
    jest.clearAllMocks();

    mockEvaluateTestCase = jest.fn();
    (EvaluationService as unknown as jest.Mock).mockImplementation(() => ({
      evaluateTestCase: mockEvaluateTestCase,
    }));

    // Default mock implementation for runAll: Execute tasks immediately
    mockRunAll.mockImplementation(async (tasks: (() => Promise<void>)[]) => {
      // We run them concurrently to simulate the fetcher processing the queue
      await Promise.all(tasks.map(task => task()));
    });

    page = await newSpecPage({
      components: [LLMTestRunner],
      html: '<llm-test-runner></llm-test-runner>',
    });

    // Set multiple test cases
    page.rootInstance.testCases = [testCase1, testCase2];
    await page.waitForChanges();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should iterate through all valid test cases, trigger requests, and track global loading state', async () => {
    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    // 1. Trigger "Run All".
    const runButtonAll = page.root.shadowRoot.querySelector(
      'button[aria-label="Run All"]',
    ) as HTMLButtonElement;
    runButtonAll.click();

    await page.waitForChanges(); // Wait for the button to be clicked

    // 2. Verify initial loading state
    expect(page.rootInstance.isRunningAll).toBe(true);

    // 3. Verify RateLimitedFetcher was instantiated and called
    expect(RateLimitedFetcher).toHaveBeenCalled();
    expect(mockRunAll).toHaveBeenCalled();

    // 4. Because we mocked runAll to execute tasks immediately, the events should have fired.
    expect(llmRequestSpy).toHaveBeenCalledTimes(2);

    // 5. Resolve the Promises for both requests
    const event1 = getPayloadFromEvent(llmRequestSpy, 0).detail;
    const event2 = getPayloadFromEvent(llmRequestSpy, 1).detail;

    // Check prompts to ensure correct mapping
    // Note: Order depends on how the tasks were pushed, usually index 0 is case 1
    expect(event1.prompt).toBe('What is Stencil?');
    expect(event2.prompt).toBe('What is JSX?');

    event1.resolve('Stencil Answer');
    event2.resolve('JSX Answer');

    await page.waitForChanges();

    // 6. Verify Global Loading State is finished
    expect(page.rootInstance.isRunningAll).toBe(false);

    // 7. Verify Individual Test States
    const finalCases = page.rootInstance.testCases;

    expect(finalCases[0].output).toBe('Stencil Answer');
    expect(finalCases[0].isRunning).toBe(false);

    expect(finalCases[1].output).toBe('JSX Answer');
    expect(finalCases[1].isRunning).toBe(false);

    // 8. Verify Evaluation was called for both
    expect(mockEvaluateTestCase).toHaveBeenCalledTimes(2);
  });

  it('should skip test cases that are empty or already running', async () => {
    const runningCase = { ...testCase1, id: '3', isRunning: true };
    const emptyCase = { ...testCase2, id: '4', question: '   ' }; // Empty question
    const validCase = { ...testCase1, id: '5', question: 'Valid Question' };

    page.rootInstance.testCases = [runningCase, emptyCase, validCase];
    await page.waitForChanges();

    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    const runButtonAll = page.root.shadowRoot.querySelector(
      'button[aria-label="Run All"]',
    ) as HTMLButtonElement;
    runButtonAll.click();

    await page.waitForChanges();

    // Mock runAll implementation will execute the tasks passed to it
    // We expect only 1 task (the valid one)
    const tasksPassedToFetcher = mockRunAll.mock
      .calls[0][0] as (() => Promise<void>)[]; // get the tasks passed to the fetcher
    expect(tasksPassedToFetcher.length).toBe(1);

    // Verify only the valid case triggered an event
    expect(llmRequestSpy).toHaveBeenCalledTimes(1);
    expect(
      (llmRequestSpy.mock.calls[0][0] as CustomEvent<LLMRequestPayload>).detail
        .prompt,
    ).toBe('Valid Question');
  });
});
