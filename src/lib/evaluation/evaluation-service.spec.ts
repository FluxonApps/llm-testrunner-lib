import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// The semantic evaluator transitively imports `@xenova/transformers`, an ESM
// module Jest cannot parse without extra config. We don't exercise the
// semantic path in this spec, so stub the module — `jest.mock` is hoisted
// above the service import below by babel-jest.
jest.mock('./evaluators/semantic/index', () => ({
  performSemanticEvaluation: jest.fn(),
}));

import { EvaluationService } from './evaluation-service';
import { EvaluationApproach } from './constants';
import type { EvaluationResult } from './types';
import type { LlmJudge, TestCase } from '../../types/llm-test-runner';

const mockJudge = jest.fn<LlmJudge>();

function buildTestCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: 'tc-1',
    question: 'What is the capital of France?',
    expectedOutcome: [
      {
        type: 'textarea',
        label: 'Expected Outcome',
        value: 'Paris',
        outcomeMode: 'static',
        evaluationParameters: {
          approach: EvaluationApproach.LLM_JUDGE,
          criteria: [
            { id: 'correctness', description: 'Factually correct.', weight: 1 },
          ],
        },
      },
    ],
    output: {
      text: 'The capital is Paris.',
    },
    chatHistory: { enabled: false, value: '' },
    isRunning: false,
    ...overrides,
  };
}

async function runService(
  service: EvaluationService,
  testCase: TestCase,
  llmJudge?: LlmJudge,
): Promise<EvaluationResult> {
  return new Promise<EvaluationResult>(resolve => {
    void service.evaluateTestCase(testCase, resolve, undefined, llmJudge);
  });
}

describe('EvaluationService — llm-judge plumbing', () => {
  let service: EvaluationService;

  beforeEach(() => {
    service = new EvaluationService();
    mockJudge.mockReset();
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'correctness', score: 0.9 }],
    });
  });

  it('passes the llmJudge callback through to the engine and the evaluator', async () => {
    await runService(service, buildTestCase(), mockJudge);
    expect(mockJudge).toHaveBeenCalledTimes(1);
  });
});
