import { jest, describe, beforeEach, it, expect } from '@jest/globals';

jest.mock('../../../lib/evaluation/evaluation-service', () => ({
  EvaluationService: jest.fn().mockImplementation(() => ({
    evaluateTestCase: jest.fn(),
  })),
}));

import { newSpecPage } from '@stencil/core/testing';
import { LLMTestRunner } from '../llm-test-runner';
import { TestCase, LLMRequestPayload } from '../../../types/llm-test-runner';
import { EvaluationService } from '../../../lib/evaluation/evaluation-service';

describe('LLMTestRunner', () => {
  let page: Awaited<ReturnType<typeof newSpecPage>>;
  let mockEvaluateTestCase: jest.Mock;

  const mockTestCase: TestCase = {
    id: '1',
    question: 'What is Stencil?',
    expectedOutcome: [
      {
        type: 'textarea',
        label: 'Expected Outcome',
        value: 'WebComponent',
      },
      {
        type: 'chips-input',
        label: 'Keywords',
        value: ['compiler', 'web component'],
      },
      {
        type: 'select',
        label: 'Tool calls',
        options: ['getWeather', 'getAnalytics', 'getValidEntities'],
        value: 'getAnalytics',
      },
    ],
    isRunning: false,
  };
  function getFirstEventFromSpy(
    spy: jest.Mock,
  ): CustomEvent<LLMRequestPayload> {
    if (spy.mock.calls.length === 0) {
      throw new Error('No calls made to the spy');
    }
    const firstCallArgs = spy.mock.calls[0]; // arguments passed to first invocation
    const [firstArg] = firstCallArgs; // the CustomEvent is the first (and only) arg
    return firstArg as CustomEvent<LLMRequestPayload>;
  }
  beforeEach(async () => {
    jest.clearAllMocks();

    mockEvaluateTestCase = jest.fn();
    (EvaluationService as unknown as jest.Mock).mockImplementation(() => ({
      evaluateTestCase: mockEvaluateTestCase,
    }));

    page = await newSpecPage({
      components: [LLMTestRunner],
      html: '<llm-test-runner></llm-test-runner>',
    });

    page.rootInstance.testCases = [mockTestCase];
    await page.waitForChanges();
  });

  it('should handle the "run" event, process the LLM request, and trigger evaluation', async () => {
    const mockAiResponse = 'Stencil is a compiler.';

    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    const runButton = page.root.shadowRoot.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;
    runButton.click();

    await page.waitForChanges();

    expect(page.rootInstance.testCases[0].isRunning).toBe(true);

    const eventPayload = getFirstEventFromSpy(llmRequestSpy).detail;

    await eventPayload.resolve(mockAiResponse);

    await page.waitForChanges();

    const finalTestCase = page.rootInstance.testCases[0];

    expect(finalTestCase.isRunning).toBe(false);
    expect(finalTestCase.output).toBe(mockAiResponse);

    expect(mockEvaluateTestCase).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockTestCase.id,
        output: mockAiResponse,
      }),
      expect.any(Function),
    );
  });

  it('should handle errors when the LLM request fails', async () => {
    const mockError = new Error('API Error');
    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    const runButton = page.root.shadowRoot.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;

    runButton.click();
    await page.waitForChanges();

    const eventPayload = getFirstEventFromSpy(llmRequestSpy).detail;

    try {
      await eventPayload.reject(mockError);
    } catch (e) {
      expect(e).toBe(mockError);
    }

    await page.waitForChanges();

    expect(page.rootInstance.testCases[0].isRunning).toBe(false);
    expect(page.rootInstance.testCases[0].error).toBe('API Error');
    expect(mockEvaluateTestCase).not.toHaveBeenCalled();
  });

  it('resolves dynamic expected outcome before evaluation', async () => {
    const dynamicCase: TestCase = {
      ...mockTestCase,
      expectedOutcome: [
        {
          type: 'textarea',
          label: 'Expected Outcome',
          value: '',
          outcomeMode: 'dynamic',
          resolutionQuery: '$.expected.answer',
        },
      ],
    };
    page.rootInstance.testCases = [dynamicCase];
    const resolveExpectedOutcome = jest
      .fn()
      .mockImplementation(async () => 'Resolved Expected Value');
    page.rootInstance.resolveExpectedOutcome = resolveExpectedOutcome;
    await page.waitForChanges();

    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    const runButton = page.root.shadowRoot.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;
    runButton.click();
    await page.waitForChanges();

    const eventPayload = getFirstEventFromSpy(llmRequestSpy).detail;
    await eventPayload.resolve('Model response');
    await page.waitForChanges();

    expect(resolveExpectedOutcome).toHaveBeenCalledWith('$.expected.answer', {
      testCase: expect.objectContaining({
        id: dynamicCase.id,
        output: 'Model response',
      }),
      fieldIndex: 0,
    });
    expect(mockEvaluateTestCase).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedOutcome: [
          expect.objectContaining({
            value: 'Resolved Expected Value',
          }),
        ],
      }),
      expect.any(Function),
    );
  });
});
