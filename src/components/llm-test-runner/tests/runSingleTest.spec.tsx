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
import { MISSING_RESOLVER_MESSAGE } from '../../../lib/test-cases/dynamic-expected-outcome-resolver';

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
    chatHistory: { enabled: false, value: '' },
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

    await eventPayload.resolve({ text: mockAiResponse });

    await page.waitForChanges();

    const finalTestCase = page.rootInstance.testCases[0];

    expect(finalTestCase.isRunning).toBe(false);
    expect(finalTestCase.output?.text).toBe(mockAiResponse);

    expect(mockEvaluateTestCase).toHaveBeenCalledTimes(1);
    expect(mockEvaluateTestCase.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        id: mockTestCase.id,
        output: expect.objectContaining({ text: mockAiResponse }),
      }),
    );
  });

  it('omits chatHistory on llmRequest when test case has no chat history', async () => {
    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    const runButton = page.root.shadowRoot.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;
    runButton.click();
    await page.waitForChanges();

    const detail = getFirstEventFromSpy(llmRequestSpy).detail;
    expect(detail).not.toHaveProperty('chatHistory');
    await detail.resolve('x');
    await page.waitForChanges();
  });

  it('includes non-empty chatHistory on llmRequest', async () => {
    const raw = '[{"role":"user","content":"hi"}]';
    page.rootInstance.testCases = [
      { ...mockTestCase, chatHistory: { enabled: true, value: raw } },
    ];
    await page.waitForChanges();

    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    const runButton = page.root.shadowRoot.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;
    runButton.click();
    await page.waitForChanges();

    const ev = getFirstEventFromSpy(llmRequestSpy);
    expect(ev.detail.chatHistory).toBe(raw);
    await ev.detail.resolve('ok');
    await page.waitForChanges();
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

  it('forwards evaluationSourceExtractors to evaluation service', async () => {
    const mockAiResponse = 'Tool call executed.';
    const calledToolExtractor = jest.fn().mockReturnValue('getWeather');
    page.rootInstance.evaluationSourceExtractors = {
      calledToolName: calledToolExtractor,
    };
    await page.waitForChanges();

    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    const runButton = page.root.shadowRoot.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;
    runButton.click();
    await page.waitForChanges();

    const eventPayload = getFirstEventFromSpy(llmRequestSpy).detail;
    await eventPayload.resolve({ text: mockAiResponse });
    await page.waitForChanges();

    expect(mockEvaluateTestCase).toHaveBeenCalledTimes(1);
    expect(mockEvaluateTestCase.mock.calls[0][2]).toEqual(
      page.rootInstance.evaluationSourceExtractors,
    );
  });

  it('preserves metadata in model response output', async () => {
    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    const runButton = page.root.shadowRoot.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;
    runButton.click();
    await page.waitForChanges();

    const eventPayload = getFirstEventFromSpy(llmRequestSpy).detail;
    await eventPayload.resolve({
      text: 'Function calling response.',
      metadata: { calledToolName: 'getWeather' },
    });
    await page.waitForChanges();

    expect(page.rootInstance.testCases[0].output).toEqual(
      expect.objectContaining({
        text: 'Function calling response.',
        metadata: expect.objectContaining({
          calledToolName: 'getWeather',
        }),
      }),
    );
  });

  it('evaluates successfully when evaluationSourceExtractors are undefined', async () => {
    const mockAiResponse = 'Default text response.';
    page.rootInstance.evaluationSourceExtractors = undefined;
    await page.waitForChanges();

    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    const runButton = page.root.shadowRoot.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;
    runButton.click();
    await page.waitForChanges();

    const eventPayload = getFirstEventFromSpy(llmRequestSpy).detail;
    await eventPayload.resolve({ text: mockAiResponse });
    await page.waitForChanges();

    expect(mockEvaluateTestCase).toHaveBeenCalledTimes(1);
    expect(mockEvaluateTestCase.mock.calls[0][2]).toBeUndefined();
  });

  it('resolves dynamic expected outcome in parallel with LLM, then evaluates', async () => {
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
    expect(resolveExpectedOutcome).toHaveBeenCalled();
    await eventPayload.resolve({ text: 'Model response' });
    await page.waitForChanges();

    expect(resolveExpectedOutcome).toHaveBeenCalledWith('$.expected.answer', {
      testCase: expect.objectContaining({
        id: dynamicCase.id,
        question: dynamicCase.question,
      }),
      fieldIndex: 0,
    });
    expect(mockEvaluateTestCase).toHaveBeenCalledTimes(1);
    expect(mockEvaluateTestCase.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        expectedOutcome: [
          expect.objectContaining({
            value: 'Resolved Expected Value',
          }),
        ],
      }),
    );
  });

  it('fails run when dynamic expected outcome has no resolveExpectedOutcome prop', async () => {
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
    page.rootInstance.resolveExpectedOutcome = undefined;
    await page.waitForChanges();

    const llmRequestSpy = jest.fn();
    page.root.addEventListener('llmRequest', llmRequestSpy);

    const runButton = page.root.shadowRoot.querySelector(
      'button[title="Run this test"]',
    ) as HTMLButtonElement;
    runButton.click();
    await page.waitForChanges();

    const eventPayload = getFirstEventFromSpy(llmRequestSpy).detail;
    await eventPayload.resolve({ text: 'Model response' });
    await page.waitForChanges();

    expect(page.rootInstance.testCases[0].error).toBe(MISSING_RESOLVER_MESSAGE);
    expect(mockEvaluateTestCase).not.toHaveBeenCalled();
  });
});
